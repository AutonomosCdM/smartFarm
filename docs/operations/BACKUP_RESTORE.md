# SmartFarm Backup & Restore Procedures

## Overview

SmartFarm uses Docker volumes for data persistence. This guide covers backup strategies, restore procedures, and disaster recovery planning.

## Backup Strategy

### What Gets Backed Up

```
┌─────────────────────────────────────┐
│         Backup Scope                │
├─────────────────────────────────────┤
│ ✅ Database (SQLite)                │
│ ✅ Uploaded files                   │
│ ✅ Knowledge base documents         │
│ ✅ Configuration settings           │
│ ✅ User data & preferences          │
├─────────────────────────────────────┤
│ ❌ Docker images (can rebuild)     │
│ ❌ System logs (separate backup)    │
│ ❌ Temporary files                  │
└─────────────────────────────────────┘
```

### Backup Schedule

| Type | Frequency | Retention | Automation |
|------|-----------|-----------|------------|
| Full Backup | Weekly | 4 weeks | Manual |
| Snapshot | On major changes | 3 snapshots | Manual |
| Database | Daily | 7 days | Planned |

## Backup Procedures

### Manual Backup (Recommended)

```bash
# Run backup script
cd /opt/smartfarm
./scripts/backup.sh

# Output: ./backups/openwebui-backup-YYYYMMDD-HHMMSS.tar.gz
```

**What the script does:**
1. Stops the container (prevents data corruption)
2. Creates compressed archive of volume
3. Restarts the container
4. Stores backup with timestamp

### AWS Snapshot Backup

```bash
# Create instance snapshot
aws lightsail create-instance-snapshot \
  --instance-name smartfarm \
  --instance-snapshot-name "smartfarm-backup-$(date +%Y%m%d)" \
  --region us-east-1

# List snapshots
aws lightsail get-instance-snapshots --region us-east-1 | jq '.instanceSnapshots[] | {name, state, createdAt}'
```

### Database-Only Backup

```bash
# Quick database backup without stopping service
docker exec open-webui sqlite3 /app/backend/data/webui.db ".backup /tmp/backup.db"
docker cp open-webui:/tmp/backup.db ./backups/webui-$(date +%Y%m%d).db
```

## Restore Procedures

### Full Restore from Backup

```bash
# 1. Stop current container
docker-compose down

# 2. Run restore script
./scripts/restore.sh backups/openwebui-backup-20251017-093000.tar.gz

# 3. Start container
docker-compose up -d

# 4. Verify
docker logs open-webui
curl -I https://smartfarm.autonomos.dev
```

### Restore from AWS Snapshot

```bash
# 1. Create new instance from snapshot
aws lightsail create-instances-from-snapshot \
  --instance-snapshot-name smartfarm-backup-20251017 \
  --instance-names smartfarm-restored \
  --availability-zone us-east-1a \
  --bundle-id small_3_0 \
  --region us-east-1

# 2. Attach static IP to new instance
aws lightsail detach-static-ip --static-ip-name smartfarm-static-ip
aws lightsail attach-static-ip \
  --static-ip-name smartfarm-static-ip \
  --instance-name smartfarm-restored

# 3. Update DNS if needed (should auto-follow static IP)
```

### Database-Only Restore

```bash
# Stop container
docker-compose down

# Copy database
docker run --rm -v open-webui:/data -v $(pwd)/backups:/backup \
  alpine cp /backup/webui-20251017.db /data/webui.db

# Restart
docker-compose up -d
```

## Disaster Recovery Plan

### Recovery Time Objectives

| Scenario | RTO | RPO | Method |
|----------|-----|-----|--------|
| Container crash | 5 min | 0 | Auto-restart |
| Database corruption | 30 min | 24 hours | Restore from backup |
| Server failure | 45 min | 24 hours | AWS snapshot |
| Region failure | 4 hours | 24 hours | Cross-region restore |

### Failure Scenarios

#### Scenario 1: Container Crash

```bash
# Auto-recovery via Docker restart policy
# If manual intervention needed:
docker-compose down
docker-compose up -d
```

#### Scenario 2: Data Corruption

```bash
# 1. Stop service
docker-compose down

# 2. Restore from last good backup
./scripts/restore.sh backups/last-known-good.tar.gz

# 3. Verify data integrity
docker exec open-webui sqlite3 /app/backend/data/webui.db "PRAGMA integrity_check"
```

#### Scenario 3: Complete Server Loss

```bash
# 1. Launch new instance from snapshot
# 2. Or provision new server and restore from backup
# 3. Update DNS if IP changed
# 4. Restore SSL certificates
```

## Backup Testing

### Monthly Backup Test

```bash
# 1. Create test backup
./scripts/backup.sh

# 2. Spin up test container
docker run -d --name test-restore \
  -p 3002:8080 \
  -v test-webui:/app/backend/data \
  ghcr.io/open-webui/open-webui:main

# 3. Restore to test container
docker stop test-restore
docker run --rm \
  -v test-webui:/data \
  -v $(pwd)/backups:/backup \
  alpine tar xzf /backup/openwebui-backup-test.tar.gz -C /data

# 4. Verify
docker start test-restore
curl http://localhost:3002

# 5. Cleanup
docker stop test-restore
docker rm test-restore
docker volume rm test-webui
```

## Backup Storage

### Current Storage Locations

| Location | Type | Capacity | Cost |
|----------|------|----------|------|
| Local server | Docker volume | 60GB | Included |
| AWS Snapshots | EBS snapshots | Unlimited | $0.05/GB/month |
| Future: S3 | Object storage | Unlimited | $0.023/GB/month |

### Storage Best Practices

1. **3-2-1 Rule**
   - 3 copies of data
   - 2 different storage types
   - 1 offsite backup

2. **Retention Policy**
   - Daily: Keep 7 days
   - Weekly: Keep 4 weeks
   - Monthly: Keep 12 months
   - Yearly: Keep indefinitely

## Automation Scripts

### backup.sh
```bash
#!/bin/bash
# Location: /opt/smartfarm/scripts/backup.sh

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/openwebui-backup-${TIMESTAMP}.tar.gz"

mkdir -p ${BACKUP_DIR}

echo "Stopping container..."
docker-compose down

echo "Creating backup..."
docker run --rm \
  -v open-webui:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/openwebui-backup-${TIMESTAMP}.tar.gz -C /data .

echo "Restarting container..."
docker-compose up -d

echo "Backup completed: ${BACKUP_FILE}"
ls -lh ${BACKUP_FILE}
```

### restore.sh
```bash
#!/bin/bash
# Location: /opt/smartfarm/scripts/restore.sh

if [ $# -eq 0 ]; then
    echo "Usage: $0 <backup-file>"
    exit 1
fi

BACKUP_FILE=$1

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "Stopping container..."
docker-compose down

echo "Restoring from ${BACKUP_FILE}..."
docker run --rm \
  -v open-webui:/data \
  -v $(pwd):/backup \
  alpine sh -c "rm -rf /data/* && tar xzf /backup/${BACKUP_FILE} -C /data"

echo "Starting container..."
docker-compose up -d

echo "Restore completed!"
docker logs --tail 50 open-webui
```

## Monitoring Backup Health

### Backup Verification Checklist

- [ ] Backup completes without errors
- [ ] Backup file size is reasonable (>10MB)
- [ ] Timestamp is current
- [ ] Test restore monthly
- [ ] Offsite copy exists
- [ ] Documentation updated

### Backup Metrics

```bash
# Check backup sizes and dates
ls -lah backups/ | tail -5

# Verify latest backup integrity
tar -tzf backups/latest.tar.gz | head -20

# Check volume size
docker volume inspect open-webui | jq '.[0].Mountpoint'
du -sh /var/lib/docker/volumes/open-webui/_data
```

## Recovery Validation

### Post-Restore Checklist

- [ ] Service accessible via HTTPS
- [ ] Users can log in
- [ ] Chat history intact
- [ ] Knowledge base available
- [ ] Excel tool functional
- [ ] API connections working
- [ ] No error messages in logs

### Validation Commands

```bash
# Check service health
curl -I https://smartfarm.autonomos.dev

# Verify database
docker exec open-webui sqlite3 /app/backend/data/webui.db \
  "SELECT COUNT(*) FROM user; SELECT COUNT(*) FROM chat;"

# Check logs for errors
docker logs open-webui 2>&1 | grep -i error | tail -20

# Test functionality
# - Try logging in
# - Send a test message
# - Upload a test file
```

## Troubleshooting

### Common Issues

#### Backup Fails with Permission Error
```bash
# Fix permissions
sudo chown -R ubuntu:ubuntu ./backups
chmod 755 ./backups
```

#### Restore Fails with Space Error
```bash
# Check available space
df -h

# Clean up old backups
ls -lt backups/ | tail -10
rm backups/old-backup-*.tar.gz

# Clean Docker system
docker system prune -a
```

#### Database Locked Error
```bash
# Ensure container is stopped
docker-compose down
docker ps  # Should show no open-webui container

# If still locked, wait and retry
sleep 10
./scripts/restore.sh backup-file.tar.gz
```

## Documentation

### Related Documents
- [TROUBLESHOOTING.md](../TROUBLESHOOTING.md) - General troubleshooting
- [security/INCIDENTS.md](../security/INCIDENTS.md) - Incident response
- [MONITORING.md](MONITORING.md) - System monitoring

### External Resources
- [Docker Volume Backup](https://docs.docker.com/storage/volumes/#backup-restore-or-migrate-data-volumes)
- [AWS Snapshot Documentation](https://docs.aws.amazon.com/lightsail/)
- [SQLite Backup](https://www.sqlite.org/backup.html)

---

*Document version: 2.0*
*Last updated: 2025-10-17*
*Next review: 2025-11-17*