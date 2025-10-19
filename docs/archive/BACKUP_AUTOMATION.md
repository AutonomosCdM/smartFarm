# SmartFarm Backup Automation

Comprehensive automated backup system with retention policies, S3 integration, restore testing, and monitoring.

## Overview

The SmartFarm backup automation system provides:

- ✅ **Automated Daily Backups** - Runs at 2 AM UTC daily
- ✅ **Smart Retention Policies** - 7 daily, 4 weekly, 6 monthly backups
- ✅ **Weekly Restore Testing** - Automated integrity verification every Sunday
- ✅ **S3 Integration** - Optional offsite backups for < $0.25/month
- ✅ **SNS Alerts** - Email notifications on success/failure
- ✅ **Zero Downtime** - Backups run without service interruption
- ✅ **Comprehensive Logging** - Full audit trail of all operations

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              Daily Backup (2 AM UTC)                │
│                                                     │
│  1. Backup Open WebUI volume → openwebui.tar.gz   │
│  2. Backup Redis volume → redis.tar.gz             │
│  3. Create metadata.json                           │
│  4. Create final archive → smartfarm-backup.tar.gz │
│  5. Upload to S3 (optional)                        │
│  6. Apply retention policy                         │
│  7. Send SNS alert                                 │
└─────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────┐
│              Retention Policy                       │
│                                                     │
│  Daily:   7 backups  (last 7 days)                │
│  Weekly:  4 backups  (last 4 weeks, Sunday only)  │
│  Monthly: 6 backups  (first of month only)        │
└─────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────┐
│          Weekly Restore Test (Sunday 3 AM)          │
│                                                     │
│  1. Extract latest backup                          │
│  2. Verify contents                                │
│  3. Restore to isolated test volumes              │
│  4. Verify data integrity                          │
│  5. Send test results via SNS                      │
│  6. Cleanup test volumes                           │
└─────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────┐
│               S3 Storage (Optional)                 │
│                                                     │
│  Daily:   Standard (7 days) → Standard-IA          │
│  Weekly:  Standard-IA → Glacier (30 days)          │
│  Monthly: Glacier → Deep Archive (90 days)         │
│                                                     │
│  Cost: ~$0.12-0.25/month                           │
└─────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────┐
│              Monitoring & Alerts                    │
│                                                     │
│  SNS Topic: smartfarm-alerts                       │
│  Email: admin@autonomos.dev                        │
│  Alerts: Success, Failure, Warnings                │
└─────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Install Backup Automation

On your production server:

```bash
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163

cd /opt/smartfarm
sudo ./scripts/install-backup-automation.sh
```

This script will:
- Create backup directories
- Set up cron jobs (2 AM daily, 3 AM Sunday restore test)
- Configure logging
- Run initial backup (optional)

### 2. Optional: Setup S3 Offsite Backups

For offsite backup redundancy (< $0.25/month):

```bash
# From your local machine (requires AWS credentials)
cd /Users/autonomos_dev/Projects/smartFarm_v5
./scripts/setup-s3-backups.sh

# Then on production server, enable S3
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163
sudo nano /opt/smartfarm/.env

# Add:
S3_ENABLED=true
S3_BUCKET=smartfarm-backups
AWS_REGION=us-east-1
```

### 3. Verify Setup

```bash
# Check cron jobs
sudo crontab -l | grep smartfarm

# View logs
sudo tail -f /var/log/smartfarm-backup.log

# List backups
sudo /opt/smartfarm/scripts/restore-from-backup.sh --list

# Run manual backup
sudo /opt/smartfarm/scripts/automate-backups.sh

# Run restore test
sudo /opt/smartfarm/scripts/test-restore.sh
```

## Backup Schedule

| Type | Frequency | Retention | Storage Location |
|------|-----------|-----------|------------------|
| Daily | Every day 2 AM UTC | Last 7 days | `/opt/smartfarm/backups/daily/` |
| Weekly | Sundays 2 AM UTC | Last 4 weeks | `/opt/smartfarm/backups/weekly/` |
| Monthly | 1st of month 2 AM UTC | Last 6 months | `/opt/smartfarm/backups/monthly/` |
| Restore Test | Sundays 3 AM UTC | N/A | Isolated test volumes |

## Storage Requirements

### Local Storage

**Estimated backup size:** ~500MB per backup

**Total local storage:**
- Daily: 500MB × 7 = 3.5GB
- Weekly: 500MB × 4 = 2GB
- Monthly: 500MB × 6 = 3GB
- **Total: ~8.5GB**

**Current 2GB instance:** Adequate with proper cleanup. Monitor disk usage via CloudWatch.

### S3 Storage (Optional)

**Monthly cost breakdown:**
- Daily backups (Standard): 3.5GB × $0.023 = $0.08
- Weekly backups (Standard-IA): 2GB × $0.0125 = $0.03
- Monthly backups (Glacier IR): 3GB × $0.004 = $0.01
- PUT requests: ~$0.01
- **Total: ~$0.13/month**

**With lifecycle transitions:**
- Days 0-7: Standard storage
- Days 7-30: Standard-IA (50% savings)
- Days 30-90: Glacier Instant Retrieval (83% savings)
- Days 90+: Deep Archive (95% savings)

**Actual projected cost: $0.12-0.25/month** ✓ Well under $2 budget

## Backup Contents

Each backup archive contains:

```
smartfarm-backup-YYYYMMDD_HHMMSS.tar.gz
├── openwebui.tar.gz          # Open WebUI volume (SQLite DB, uploads, configs)
├── redis.tar.gz              # Redis volume (cache, sessions)
└── metadata.json             # Backup metadata
```

### Metadata Format

```json
{
    "timestamp": "20251017_020000",
    "date": "2025-10-17",
    "backup_type": "daily",
    "volumes": {
        "openwebui": "open-webui",
        "redis": "smartfarm-redis"
    },
    "server": "ip-172-26-3-215",
    "docker_version": "Docker version 24.0.7",
    "compose_version": "docker-compose version 1.29.2"
}
```

## Management Commands

### Manual Backup

```bash
# Run manual backup (respects retention policy)
sudo /opt/smartfarm/scripts/automate-backups.sh

# Force specific backup type
sudo BACKUP_TYPE=monthly /opt/smartfarm/scripts/automate-backups.sh
```

### List Backups

```bash
# List all available backups
sudo /opt/smartfarm/scripts/restore-from-backup.sh --list

# List specific type
ls -lht /opt/smartfarm/backups/daily/
ls -lht /opt/smartfarm/backups/weekly/
ls -lht /opt/smartfarm/backups/monthly/
```

### Restore from Backup

**⚠️ WARNING: This will replace ALL existing data!**

```bash
# Restore from latest backup
sudo /opt/smartfarm/scripts/restore-from-backup.sh --latest

# Restore from specific backup
sudo /opt/smartfarm/scripts/restore-from-backup.sh /opt/smartfarm/backups/daily/smartfarm-backup-20251017_020000.tar.gz

# Restore from S3
sudo /opt/smartfarm/scripts/restore-from-backup.sh --s3 backups/daily/smartfarm-backup-20251017_020000.tar.gz
```

### Test Restore

```bash
# Run restore test (non-destructive)
sudo /opt/smartfarm/scripts/test-restore.sh

# View test logs
sudo tail -f /var/log/smartfarm-restore-test.log
```

### View Logs

```bash
# Backup logs
sudo tail -f /var/log/smartfarm-backup.log
sudo tail -f /var/log/smartfarm-backup-error.log

# Restore test logs
sudo tail -f /var/log/smartfarm-restore-test.log
sudo tail -f /var/log/smartfarm-restore-test-error.log

# View last backup
sudo tail -100 /var/log/smartfarm-backup.log
```

## Monitoring & Alerts

### SNS Notifications

Alerts are sent to `smartfarm-alerts` SNS topic for:

**Backup Alerts:**
- ✅ Backup successful (with summary)
- ❌ Backup failed (with error details)
- ⚠️ High disk usage (>90%)
- ⚠️ S3 upload failed (local backup still saved)

**Restore Test Alerts:**
- ✅ All tests passed
- ❌ Test failed (with specific test failure)
- ⚠️ Backup size anomaly

### Email Configuration

SNS topic: `arn:aws:sns:us-east-1:586794472237:smartfarm-alerts`

**Subscribe to alerts:**
```bash
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:586794472237:smartfarm-alerts \
  --protocol email \
  --notification-endpoint your-email@example.com \
  --region us-east-1
```

Check your email and confirm the subscription.

### Integration with CloudWatch

Backup metrics are available in CloudWatch:
- Disk usage monitoring (alerts at >85% and >95%)
- Memory pressure detection
- Automatic alerts via existing CloudWatch setup

See `docs/CLOUDWATCH_MONITORING.md` for details.

## Disaster Recovery Procedures

### Scenario 1: Data Corruption

**Detection:** Application errors, database corruption alerts

**Recovery Steps:**
```bash
# 1. SSH to server
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163

# 2. List available backups
sudo /opt/smartfarm/scripts/restore-from-backup.sh --list

# 3. Restore from latest good backup
sudo /opt/smartfarm/scripts/restore-from-backup.sh --latest

# 4. Verify application
curl https://smartfarm.autonomos.dev
```

**Time to Recovery:** 5-10 minutes

### Scenario 2: Complete Server Loss

**Detection:** Server unreachable, hardware failure

**Recovery Steps:**
```bash
# 1. Create new Lightsail instance (same specs)
# 2. Configure DNS to point to new IP
# 3. Deploy SmartFarm
cd /Users/autonomos_dev/Projects/smartFarm_v5
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@NEW_IP
cd /tmp
wget https://raw.githubusercontent.com/AutonomosCdM/smartFarm/main/deployment/deploy.sh
chmod +x deploy.sh
sudo ./deploy.sh

# 4. Restore from S3
aws s3 ls s3://smartfarm-backups/backups/daily/
aws s3 cp s3://smartfarm-backups/backups/daily/latest.tar.gz /tmp/
sudo /opt/smartfarm/scripts/restore-from-backup.sh /tmp/latest.tar.gz

# 5. Configure SSL
sudo ./deployment/setup-nginx.sh
sudo certbot --nginx -d smartfarm.autonomos.dev
```

**Time to Recovery:** 30-60 minutes (with S3)

### Scenario 3: Accidental Deletion

**Detection:** User accidentally deletes data

**Recovery Steps:**
```bash
# 1. Identify when data was last good
# 2. Restore from specific backup
sudo /opt/smartfarm/scripts/restore-from-backup.sh /opt/smartfarm/backups/daily/smartfarm-backup-YYYYMMDD_HHMMSS.tar.gz

# 3. Verify data
docker exec -it open-webui sqlite3 /app/backend/data/webui.db "SELECT COUNT(*) FROM chat;"
```

**Time to Recovery:** 5-10 minutes

### Scenario 4: Ransomware Attack

**Detection:** Encrypted files, ransom note

**Recovery Steps:**
```bash
# 1. Immediately disconnect server
# 2. Create new clean instance
# 3. Restore from S3 backup (before infection)
# 4. Scan restored data
# 5. Update all credentials
# 6. Investigate attack vector
```

**Time to Recovery:** 1-2 hours

## Troubleshooting

### Backup Fails

**Check logs:**
```bash
sudo tail -100 /var/log/smartfarm-backup-error.log
```

**Common issues:**

1. **Docker not running**
   ```bash
   sudo systemctl status docker
   sudo systemctl start docker
   ```

2. **Disk full**
   ```bash
   df -h /opt
   # Clean up old backups manually
   sudo rm /opt/smartfarm/backups/daily/oldest-*.tar.gz
   ```

3. **Volume not found**
   ```bash
   docker volume ls
   # Verify volumes exist: open-webui, smartfarm-redis
   ```

4. **S3 upload fails**
   ```bash
   aws sts get-caller-identity  # Check credentials
   aws s3 ls s3://smartfarm-backups  # Check bucket access
   ```

### Restore Test Fails

**Check logs:**
```bash
sudo tail -100 /var/log/smartfarm-restore-test-error.log
```

**Common issues:**

1. **No backups found**
   ```bash
   ls -la /opt/smartfarm/backups/daily/
   # Run manual backup
   sudo /opt/smartfarm/scripts/automate-backups.sh
   ```

2. **Corrupted backup**
   ```bash
   # Test archive integrity
   tar tzf /opt/smartfarm/backups/daily/latest.tar.gz
   # If corrupted, check older backups
   ```

3. **Test volumes conflict**
   ```bash
   # Clean up test volumes
   docker volume ls | grep test-restore | xargs docker volume rm
   ```

### Cron Jobs Not Running

**Check cron status:**
```bash
sudo systemctl status cron
sudo crontab -l | grep smartfarm
```

**View cron logs:**
```bash
sudo tail -f /var/log/syslog | grep CRON
```

**Manual cron execution:**
```bash
# Test cron command
cd /opt/smartfarm && source .env && ./scripts/automate-backups.sh
```

### SNS Alerts Not Received

**Check subscription:**
```bash
aws sns list-subscriptions-by-topic \
  --topic-arn arn:aws:sns:us-east-1:586794472237:smartfarm-alerts \
  --region us-east-1
```

**Test alert:**
```bash
aws sns publish \
  --topic-arn arn:aws:sns:us-east-1:586794472237:smartfarm-alerts \
  --subject "Test Alert" \
  --message "This is a test" \
  --region us-east-1
```

## Security Considerations

### Backup Encryption

**At Rest:**
- Local: File system encryption (if enabled)
- S3: AES256 server-side encryption (mandatory)

**In Transit:**
- S3 uploads: HTTPS only (enforced by bucket policy)
- Local transfers: Within same server (no network)

### Access Control

**Backup Files:**
- Owned by root (created with sudo)
- Permissions: 644 (read-only for non-root)
- Location: `/opt/smartfarm/backups/` (protected directory)

**S3 Bucket:**
- Public access: Blocked
- IAM: Least privilege principle
- Versioning: Enabled (protection against accidental deletion)

### Sensitive Data

Backups contain:
- SQLite database (user data, chat history)
- Configuration files (no secrets - .env is gitignored)
- Uploaded files (user documents)

**Best practices:**
- Rotate backups regularly (automated)
- Encrypt S3 bucket (enforced)
- Limit access to production server
- Monitor backup access logs

## Cost Optimization

### Local Storage Only (Free)

**Current setup:**
- Total storage: ~8.5GB
- Cost: $0/month
- Retention: 7 daily, 4 weekly, 6 monthly
- Risk: Single point of failure (server loss = data loss)

**Recommendation:** Acceptable for development, add S3 for production.

### With S3 Offsite Backups (~$0.25/month)

**Setup:**
```bash
./scripts/setup-s3-backups.sh
```

**Benefits:**
- Offsite redundancy
- Disaster recovery capability
- Automatic lifecycle management
- Encrypted at rest
- Cost: $0.12-0.25/month

**Breakdown:**
- Storage: $0.12/month (with lifecycle)
- Requests: $0.01/month
- Transfer: $0 (only pay when restoring)

**Cost optimization tips:**
1. Use lifecycle policies (automatic)
2. Delete unnecessary backups
3. Use Glacier for long-term storage
4. Monitor S3 storage in AWS Cost Explorer

## Performance Impact

### Backup Performance

**Resource usage during backup:**
- CPU: ~10-20% for 2-5 minutes
- Memory: ~100MB additional
- Disk I/O: Moderate (sequential read)
- Network: None (local only, S3 minimal)

**Timing:**
- Backup at 2 AM UTC (off-peak)
- Restore test at 3 AM UTC (after backup)
- Zero downtime (containers keep running)

### Application Impact

**During backup:**
- No service interruption
- Normal response times
- Read-only volume access (no locks)

**During restore:**
- Service downtime: 2-5 minutes
- Containers stopped during restore
- Automatic restart after completion

## Maintenance

### Weekly Tasks

- ✅ Automated restore test (Sundays 3 AM)
- ✅ Review restore test results
- ✅ Check SNS alert emails

### Monthly Tasks

- Review backup storage usage
- Verify monthly backup created (1st of month)
- Audit S3 costs (if enabled)
- Test manual restore procedure

### Quarterly Tasks

- Update backup scripts (if new version available)
- Review retention policy
- Test disaster recovery procedure
- Update documentation

## Migration & Upgrades

### Upgrade Backup System

```bash
# On production server
cd /opt/smartfarm
git pull origin main

# Reinstall automation (preserves existing backups)
sudo ./scripts/install-backup-automation.sh
```

### Migrate to New Server

```bash
# 1. On old server, create final backup
sudo /opt/smartfarm/scripts/automate-backups.sh

# 2. Upload to S3 or transfer to new server
sudo scp /opt/smartfarm/backups/daily/latest.tar.gz \
  ubuntu@NEW_IP:/tmp/

# 3. On new server, install SmartFarm
cd /tmp
wget https://raw.githubusercontent.com/AutonomosCdM/smartFarm/main/deployment/deploy.sh
chmod +x deploy.sh
sudo ./deploy.sh

# 4. Restore backup
sudo /opt/smartfarm/scripts/restore-from-backup.sh /tmp/latest.tar.gz

# 5. Install backup automation on new server
sudo /opt/smartfarm/scripts/install-backup-automation.sh
```

## Files Reference

### Scripts

| Script | Location | Purpose |
|--------|----------|---------|
| `automate-backups.sh` | `/opt/smartfarm/scripts/` | Daily backup with retention |
| `restore-from-backup.sh` | `/opt/smartfarm/scripts/` | Restore data from backup |
| `test-restore.sh` | `/opt/smartfarm/scripts/` | Weekly restore testing |
| `setup-s3-backups.sh` | `/opt/smartfarm/scripts/` | Configure S3 integration |
| `install-backup-automation.sh` | `/opt/smartfarm/scripts/` | Install automation |

### Configuration

| File | Location | Purpose |
|------|----------|---------|
| `.env` | `/opt/smartfarm/` | Environment variables |
| `crontab` | `crontab -l` | Scheduled jobs |

### Logs

| Log | Location | Purpose |
|-----|----------|---------|
| Backup log | `/var/log/smartfarm-backup.log` | Backup operations |
| Backup errors | `/var/log/smartfarm-backup-error.log` | Backup failures |
| Restore test log | `/var/log/smartfarm-restore-test.log` | Test results |
| Restore test errors | `/var/log/smartfarm-restore-test-error.log` | Test failures |

### Backups

| Type | Location | Retention |
|------|----------|-----------|
| Daily | `/opt/smartfarm/backups/daily/` | 7 days |
| Weekly | `/opt/smartfarm/backups/weekly/` | 4 weeks |
| Monthly | `/opt/smartfarm/backups/monthly/` | 6 months |
| S3 (optional) | `s3://smartfarm-backups/backups/` | Lifecycle |

## Support

### Getting Help

1. **Check logs first:**
   ```bash
   sudo tail -100 /var/log/smartfarm-backup-error.log
   ```

2. **Review documentation:**
   - This guide: `docs/BACKUP_AUTOMATION.md`
   - Troubleshooting: `docs/TROUBLESHOOTING.md`
   - CloudWatch: `docs/CLOUDWATCH_MONITORING.md`

3. **Test manually:**
   ```bash
   sudo /opt/smartfarm/scripts/automate-backups.sh
   sudo /opt/smartfarm/scripts/test-restore.sh
   ```

4. **GitHub Issues:**
   [Report an issue](https://github.com/AutonomosCdM/smartFarm/issues)

### Emergency Contacts

- **Production Server:** 98.87.30.163
- **SNS Alerts:** admin@autonomos.dev
- **AWS Account:** 586794472237
- **Region:** us-east-1

## Success Checklist

After setup, verify:

- [ ] Backup automation installed: `sudo crontab -l | grep smartfarm`
- [ ] Initial backup created: `ls -la /opt/smartfarm/backups/daily/`
- [ ] Cron jobs scheduled: Daily 2 AM, Sunday 3 AM
- [ ] SNS alerts configured: Check email confirmation
- [ ] S3 configured (optional): `aws s3 ls s3://smartfarm-backups`
- [ ] Restore test successful: `sudo ./scripts/test-restore.sh`
- [ ] Logs accessible: `sudo tail /var/log/smartfarm-backup.log`
- [ ] CloudWatch monitoring active: Disk, memory, swap alerts
- [ ] Documentation reviewed: Disaster recovery procedures

---

**Last Updated:** October 17, 2025
**Status:** ✅ Production Ready
**Cost:** $0/month (local) or ~$0.25/month (with S3)
**Author:** Autonomos Development Team
