# SmartFarm Backup Automation - Quick Start Guide

**5-minute setup for automated backups with monitoring**

## Prerequisites

- ✅ SmartFarm installed at `/opt/smartfarm`
- ✅ Root/sudo access to production server
- ✅ AWS CLI configured (for S3 and SNS alerts)

## Installation

### Step 1: Deploy to Production Server

```bash
# SSH to production
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163

# Install backup automation
cd /opt/smartfarm
sudo ./scripts/install-backup-automation.sh
```

**What this does:**
- ✅ Creates backup directories (`/opt/smartfarm/backups/{daily,weekly,monthly}`)
- ✅ Sets up cron jobs (2 AM daily backup, 3 AM Sunday restore test)
- ✅ Configures logging
- ✅ Runs initial backup (optional)

### Step 2: Verify Installation

```bash
# Check cron jobs
sudo crontab -l | grep smartfarm

# View backups
ls -lah /opt/smartfarm/backups/daily/

# Check logs
sudo tail -f /var/log/smartfarm-backup.log
```

### Step 3: Optional - Setup S3 Offsite Backups

**Cost: < $0.25/month**

```bash
# From your local machine (requires AWS credentials)
cd /Users/autonomos_dev/Projects/smartFarm_v5
./scripts/setup-s3-backups.sh

# Then on production server
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163
sudo nano /opt/smartfarm/.env

# Add these lines:
S3_ENABLED=true
S3_BUCKET=smartfarm-backups
AWS_REGION=us-east-1
```

**Save and exit** (Ctrl+X, Y, Enter)

## Daily Operations

### View Recent Backups

```bash
sudo /opt/smartfarm/scripts/restore-from-backup.sh --list
```

### Manual Backup

```bash
sudo /opt/smartfarm/scripts/automate-backups.sh
```

### Test Restore

```bash
sudo /opt/smartfarm/scripts/test-restore.sh
```

### View Logs

```bash
# Backup logs
sudo tail -f /var/log/smartfarm-backup.log

# Errors only
sudo tail -f /var/log/smartfarm-backup-error.log
```

## Restore Data

**⚠️ WARNING: This will replace ALL data!**

### Restore from Latest Backup

```bash
sudo /opt/smartfarm/scripts/restore-from-backup.sh --latest
```

### Restore from Specific Backup

```bash
# 1. List backups
sudo /opt/smartfarm/scripts/restore-from-backup.sh --list

# 2. Restore specific backup
sudo /opt/smartfarm/scripts/restore-from-backup.sh \
  /opt/smartfarm/backups/daily/smartfarm-backup-20251017_020000.tar.gz
```

### Restore from S3

```bash
sudo /opt/smartfarm/scripts/restore-from-backup.sh \
  --s3 backups/daily/smartfarm-backup-20251017_020000.tar.gz
```

## Monitoring

### Email Alerts

**SNS Topic:** `smartfarm-alerts`

You'll receive emails for:
- ✅ Backup success (daily)
- ❌ Backup failure
- ✅ Restore test passed (weekly)
- ❌ Restore test failed
- ⚠️ High disk usage
- ⚠️ S3 upload issues

**Subscribe to alerts:**
```bash
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:586794472237:smartfarm-alerts \
  --protocol email \
  --notification-endpoint YOUR_EMAIL@example.com \
  --region us-east-1
```

Check your email and confirm the subscription.

### CloudWatch Integration

Backup monitoring integrates with existing CloudWatch setup:
- Disk usage alerts (>85%, >95%)
- Memory pressure detection
- Automatic notifications

See: `docs/CLOUDWATCH_MONITORING.md`

## Backup Schedule

| Type | Schedule | Retention | Location |
|------|----------|-----------|----------|
| **Daily** | 2 AM UTC | 7 days | `/opt/smartfarm/backups/daily/` |
| **Weekly** | Sunday 2 AM UTC | 4 weeks | `/opt/smartfarm/backups/weekly/` |
| **Monthly** | 1st of month 2 AM UTC | 6 months | `/opt/smartfarm/backups/monthly/` |
| **Restore Test** | Sunday 3 AM UTC | N/A | Isolated test volumes |

## Storage & Costs

### Local Storage (Free)

**Estimated usage:** ~8.5GB total
- Daily: 3.5GB (7 × 500MB)
- Weekly: 2GB (4 × 500MB)
- Monthly: 3GB (6 × 500MB)

**Current 2GB instance:** Adequate with monitoring

### S3 Storage (~$0.25/month)

**Breakdown:**
- Storage with lifecycle: ~$0.12/month
- PUT requests: ~$0.01/month
- Data transfer OUT: $0 (only when restoring)

**Total: $0.13-0.25/month** ✓ Well under $2 budget

## Troubleshooting

### Backup Not Running

```bash
# Check cron status
sudo systemctl status cron

# Check cron jobs
sudo crontab -l | grep smartfarm

# View cron logs
sudo tail -f /var/log/syslog | grep CRON

# Manual backup
sudo /opt/smartfarm/scripts/automate-backups.sh
```

### No Email Alerts

```bash
# Check SNS subscription
aws sns list-subscriptions-by-topic \
  --topic-arn arn:aws:sns:us-east-1:586794472237:smartfarm-alerts \
  --region us-east-1

# Test alert
aws sns publish \
  --topic-arn arn:aws:sns:us-east-1:586794472237:smartfarm-alerts \
  --subject "Test" \
  --message "Test alert" \
  --region us-east-1
```

### Disk Full

```bash
# Check disk usage
df -h /opt

# Clean old backups manually
sudo rm /opt/smartfarm/backups/daily/oldest-*.tar.gz

# Run Docker cleanup
sudo docker system prune -a --volumes
```

### Restore Fails

```bash
# Check restore logs
sudo tail -100 /var/log/smartfarm-restore-test-error.log

# Verify backup integrity
sudo tar tzf /opt/smartfarm/backups/daily/latest.tar.gz

# Try different backup
sudo /opt/smartfarm/scripts/restore-from-backup.sh --list
```

## Disaster Recovery

### Quick Recovery Steps

1. **SSH to server:**
   ```bash
   ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163
   ```

2. **List backups:**
   ```bash
   sudo /opt/smartfarm/scripts/restore-from-backup.sh --list
   ```

3. **Restore from latest:**
   ```bash
   sudo /opt/smartfarm/scripts/restore-from-backup.sh --latest
   ```

4. **Verify:**
   ```bash
   curl https://smartfarm.autonomos.dev
   ```

**Recovery Time:** 5-10 minutes

### Complete Server Loss

1. Create new Lightsail instance
2. Deploy SmartFarm
3. Restore from S3:
   ```bash
   sudo /opt/smartfarm/scripts/restore-from-backup.sh \
     --s3 backups/daily/latest.tar.gz
   ```

**Recovery Time:** 30-60 minutes (with S3)

## Key Commands Reference

```bash
# Installation
sudo ./scripts/install-backup-automation.sh
sudo ./scripts/setup-s3-backups.sh

# Operations
sudo ./scripts/automate-backups.sh           # Manual backup
sudo ./scripts/test-restore.sh               # Test restore
sudo ./scripts/restore-from-backup.sh --list # List backups
sudo ./scripts/restore-from-backup.sh --latest # Restore

# Monitoring
sudo tail -f /var/log/smartfarm-backup.log
sudo crontab -l | grep smartfarm
df -h /opt
```

## Next Steps

After installation:

1. ✅ Verify first backup: `ls -la /opt/smartfarm/backups/daily/`
2. ✅ Subscribe to SNS alerts: Check email confirmation
3. ✅ Test restore: `sudo ./scripts/test-restore.sh`
4. ⏳ Wait for Sunday: Automated weekly restore test
5. 📚 Read full docs: `docs/BACKUP_AUTOMATION.md`

## Support

- **Full Documentation:** `docs/BACKUP_AUTOMATION.md`
- **Troubleshooting:** `docs/TROUBLESHOOTING.md`
- **CloudWatch Monitoring:** `docs/CLOUDWATCH_MONITORING.md`
- **GitHub Issues:** [Report an issue](https://github.com/AutonomosCdM/smartFarm/issues)

---

**Production Server:** 98.87.30.163
**Status:** ✅ Ready
**Cost:** $0 (local) or ~$0.25/month (S3)
