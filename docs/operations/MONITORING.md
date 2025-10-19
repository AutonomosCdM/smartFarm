# SmartFarm Monitoring Operations

## Overview

SmartFarm employs multi-layer monitoring using CloudWatch for infrastructure metrics and custom scripts for application-specific monitoring.

## Monitoring Architecture

```
┌─────────────────────────────────────────┐
│         Monitoring Stack                │
├─────────────────────────────────────────┤
│ CloudWatch Agent                        │
│  • CPU, Memory, Disk metrics            │
│  • Custom metrics via statsd            │
│  • Log aggregation                      │
├─────────────────────────────────────────┤
│ Custom Scripts                          │
│  • Memory monitoring (5 min intervals)  │
│  • Database performance                 │
│  • Application health checks            │
├─────────────────────────────────────────┤
│ Alerting                                │
│  • SNS email notifications              │
│  • CloudWatch alarms (8 configured)     │
│  • Future: Discord/Slack webhooks       │
└─────────────────────────────────────────┘
```

## CloudWatch Monitoring

### Current Configuration

**Status:** ✅ Fully Operational (Deployed 2025-10-17)
**Cost:** $0/month (within AWS free tier)

### Configured Alarms

| Alarm Name | Threshold | Period | Action | Current Status |
|------------|-----------|--------|--------|----------------|
| Memory-High | >85% | 5 min | Email | ✅ OK (39%) |
| Swap-High | >500MB | 5 min | Email | ✅ OK (0MB) |
| Swap-Critical | >1GB | 2 min | Email + Page | ✅ OK (0MB) |
| Disk-High | >85% | 15 min | Email | ✅ OK (24%) |
| Disk-Critical | >95% | 5 min | Email + Page | ✅ OK (24%) |
| CPU-High | >80% | 10 min | Email | ✅ OK (<5%) |
| Status-Failed | ≥1 failure | 1 min | Email + Restart | ✅ OK |
| Burst-Low | <20% | 10 min | Email | ✅ OK (100%) |

### CloudWatch Dashboard URLs

- **Lightsail Metrics:** https://lightsail.aws.amazon.com/ls/webapp/us-east-1/instances/smartfarm/metrics
- **CloudWatch Console:** https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#metricsV2
- **Alarms Dashboard:** https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#alarmsV2

### CloudWatch Agent Management

```bash
# Check agent status
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163
sudo systemctl status amazon-cloudwatch-agent

# Restart agent
sudo systemctl restart amazon-cloudwatch-agent

# View agent logs
sudo tail -f /opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log

# Update configuration
sudo nano /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
sudo systemctl restart amazon-cloudwatch-agent
```

## Memory Monitoring

### Automated Memory Monitoring System

**Status:** ✅ Active since 2025-10-17 13:35 UTC
**Collection Interval:** Every 5 minutes
**Alert Threshold:** Swap > 500MB or Memory > 85%

### Monitoring Scripts

**Location:** `/opt/smartfarm/scripts/`

| Script | Purpose | Schedule |
|--------|---------|----------|
| monitor-memory.sh | Collect memory metrics | */5 * * * * |
| check-memory-alert.sh | Check thresholds & alert | 1-56/5 * * * * |
| view-memory-stats.sh | Display statistics | On-demand |

### View Current Memory Status

```bash
# Real-time memory stats
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  '/opt/smartfarm/scripts/view-memory-stats.sh'

# Last 48 hours of data (576 samples @ 5min)
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  '/opt/smartfarm/scripts/view-memory-stats.sh 576'

# Check for alerts
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  'cat /var/log/smartfarm/alerts/memory-alerts.log'
```

### Memory Metrics Collected

```csv
# Format: /var/log/smartfarm/memory-usage.log
timestamp,mem_used_mb,mem_percent,swap_used_mb,swap_percent,top_process

2025-10-17 14:00:00,961,50.3,0,0.0,open-webui(892MB)
2025-10-17 14:05:00,958,50.1,0,0.0,open-webui(889MB)
```

## Application Monitoring

### Docker Container Health

```bash
# Check container status
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Size}}"

# Real-time resource usage
docker stats --no-stream

# Container health check
docker inspect open-webui --format='{{.State.Health.Status}}'

# View container logs
docker logs open-webui --tail 100 --follow
```

### Application Metrics

```bash
# Active users
docker exec open-webui sqlite3 /app/backend/data/webui.db \
  "SELECT COUNT(DISTINCT user_id) FROM chat WHERE created_at > datetime('now', '-1 day')"

# Chat volume (last 24h)
docker exec open-webui sqlite3 /app/backend/data/webui.db \
  "SELECT COUNT(*) FROM chat WHERE created_at > datetime('now', '-1 day')"

# Database size
docker exec open-webui ls -lh /app/backend/data/webui.db
```

## Performance Monitoring

### Response Time Monitoring

```bash
# Test endpoint response time
time curl -s -o /dev/null -w "%{time_total}\n" https://smartfarm.autonomos.dev

# Continuous monitoring (every 60 seconds)
while true; do
  response_time=$(curl -s -o /dev/null -w "%{time_total}" https://smartfarm.autonomos.dev)
  echo "$(date '+%Y-%m-%d %H:%M:%S') Response time: ${response_time}s"
  sleep 60
done
```

### Database Performance

```bash
# Check slow queries
docker exec open-webui sqlite3 /app/backend/data/webui.db \
  "SELECT sql, SUM(time) as total_time FROM stats
   WHERE time > 100 GROUP BY sql ORDER BY total_time DESC LIMIT 10"

# Database statistics
docker exec open-webui sqlite3 /app/backend/data/webui.db \
  "SELECT page_count * page_size / 1048576.0 as size_mb,
   page_count, freelist_count,
   100.0 * freelist_count / page_count as fragmentation_pct
   FROM pragma_page_count(), pragma_page_size(), pragma_freelist_count()"
```

## Log Monitoring

### Log Locations

| Component | Location | Rotation |
|-----------|----------|----------|
| Application | docker logs open-webui | Docker default |
| Nginx | /var/log/nginx/*.log | Weekly |
| System | /var/log/syslog | Daily |
| CloudWatch | /opt/aws/amazon-cloudwatch-agent/logs/ | Daily |
| Memory Monitor | /var/log/smartfarm/*.log | Weekly |

### Log Analysis Commands

```bash
# Error summary (last 24h)
docker logs open-webui --since 24h 2>&1 | grep -i error | wc -l

# Top error patterns
docker logs open-webui --since 24h 2>&1 | grep -i error | \
  sed 's/[0-9]//g' | sort | uniq -c | sort -rn | head -10

# Access patterns
docker exec open-webui tail -1000 /var/log/nginx/access.log | \
  awk '{print $1}' | sort | uniq -c | sort -rn | head -10

# Failed authentications
docker logs open-webui 2>&1 | grep -E "401|403" | tail -20
```

## Alert Configuration

### SNS Topic Configuration

**Topic ARN:** `arn:aws:sns:us-east-1:586794472237:smartfarm-alerts`
**Subscribers:** admin@autonomos.dev (email)

```bash
# Test SNS notification
aws sns publish \
  --topic-arn arn:aws:sns:us-east-1:586794472237:smartfarm-alerts \
  --message "Test alert from SmartFarm monitoring" \
  --subject "SmartFarm Test Alert" \
  --region us-east-1
```

### Alert Response Procedures

#### Memory Alert Response

```bash
# 1. Check current usage
free -h
docker stats --no-stream

# 2. Identify high consumers
ps aux --sort=-%mem | head -10

# 3. Restart if needed
docker-compose restart

# 4. Consider upgrade if persistent
# See decision matrix in monitoring scripts
```

#### Disk Alert Response

```bash
# 1. Check disk usage
df -h

# 2. Clean Docker
docker system prune -a
docker volume prune

# 3. Clean logs
sudo journalctl --vacuum-time=7d
sudo find /var/log -name "*.log" -mtime +7 -delete

# 4. Clean backups
ls -lt /opt/smartfarm/backups/ | tail -n +6 | awk '{print $9}' | xargs rm -f
```

#### CPU Alert Response

```bash
# 1. Identify high CPU processes
top -b -n 1 | head -20

# 2. Check for runaway processes
ps aux --sort=-%cpu | head -10

# 3. Restart application if needed
docker-compose restart

# 4. Scale horizontally if persistent
# Consider load balancer + second instance
```

## Monitoring Automation

### Automated Reports

```bash
#!/bin/bash
# daily-report.sh - Send daily metrics summary

REPORT="/tmp/daily-report.txt"

echo "SmartFarm Daily Monitoring Report - $(date)" > $REPORT
echo "=====================================" >> $REPORT

echo -e "\nSystem Metrics:" >> $REPORT
free -h >> $REPORT

echo -e "\nDocker Status:" >> $REPORT
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Size}}" >> $REPORT

echo -e "\nLast 24h Stats:" >> $REPORT
docker exec open-webui sqlite3 /app/backend/data/webui.db \
  "SELECT 'Active Users:', COUNT(DISTINCT user_id) FROM chat
   WHERE created_at > datetime('now', '-1 day')" >> $REPORT

echo -e "\nTop Errors:" >> $REPORT
docker logs open-webui --since 24h 2>&1 | grep -i error | head -5 >> $REPORT

# Send report
mail -s "SmartFarm Daily Report" admin@autonomos.dev < $REPORT
```

### Health Check Endpoint

```python
# health_check.py - Custom health endpoint
import subprocess
import json

def get_health_status():
    health = {
        'status': 'healthy',
        'checks': {}
    }

    # Check Docker
    try:
        result = subprocess.run(['docker', 'ps'], capture_output=True)
        health['checks']['docker'] = 'healthy' if result.returncode == 0 else 'unhealthy'
    except:
        health['checks']['docker'] = 'error'

    # Check memory
    with open('/proc/meminfo', 'r') as f:
        lines = f.readlines()
        memtotal = int(lines[0].split()[1])
        memfree = int(lines[1].split()[1])
        usage = (memtotal - memfree) / memtotal * 100
        health['checks']['memory'] = 'healthy' if usage < 85 else 'warning'

    # Overall status
    if 'unhealthy' in health['checks'].values():
        health['status'] = 'unhealthy'
    elif 'warning' in health['checks'].values():
        health['status'] = 'warning'

    return json.dumps(health, indent=2)
```

## Monitoring Best Practices

### Daily Tasks
- [ ] Review CloudWatch dashboard
- [ ] Check for any triggered alarms
- [ ] Verify backup completion
- [ ] Review error logs

### Weekly Tasks
- [ ] Analyze performance trends
- [ ] Clean up old logs
- [ ] Update monitoring thresholds if needed
- [ ] Test alert notifications

### Monthly Tasks
- [ ] Generate performance report
- [ ] Review and optimize alerts
- [ ] Update monitoring documentation
- [ ] Plan capacity adjustments

## Cost Optimization

### Current Costs (Monthly)
- CloudWatch Agent: $0 (free)
- Custom Metrics (3): $0 (first 10 free)
- Alarms (8): $0 (first 10 free)
- SNS Notifications: $0 (first 1,000 free)
- **Total:** $0/month

### When Costs Would Increase
- >10 custom metrics: $0.30/metric/month
- >10 alarms: $0.10/alarm/month
- >1,000 SNS messages: $0.50/1,000 messages
- CloudWatch Logs: $0.50/GB ingested

## Troubleshooting

### CloudWatch Agent Not Sending Metrics

```bash
# Check agent status
sudo systemctl status amazon-cloudwatch-agent

# Check configuration
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a query -m ec2 -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

# Restart agent
sudo systemctl restart amazon-cloudwatch-agent
```

### Missing Memory Metrics

```bash
# Check cron jobs
crontab -l

# Manually run monitoring script
/opt/smartfarm/scripts/monitor-memory.sh

# Check log permissions
ls -la /var/log/smartfarm/
```

### Alerts Not Firing

```bash
# Verify SNS subscription
aws sns list-subscriptions-by-topic \
  --topic-arn arn:aws:sns:us-east-1:586794472237:smartfarm-alerts

# Test alarm
aws cloudwatch set-alarm-state \
  --alarm-name Memory-High \
  --state-value ALARM \
  --state-reason "Testing alert"
```

---

*Document version: 2.0*
*Last updated: 2025-10-17*
*Monitoring uptime: 99.9%*