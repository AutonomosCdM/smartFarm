# SmartFarm CloudWatch Monitoring

Comprehensive monitoring setup for SmartFarm production server.

## Quick Start

### 1. Deploy Monitoring Agent
```bash
./deploy_monitoring.sh
```

This will:
- SSH to production server
- Install CloudWatch agent
- Configure memory, swap, and disk metrics
- Start the agent

### 2. Create CloudWatch Alarms
Wait 2-3 minutes for metrics to appear, then:
```bash
./create_alarms.sh
```

This creates 8 alarms:
- Memory >85%
- Swap >500MB
- Swap >1GB (critical)
- Disk >85%
- Disk >95% (critical)  
- CPU >80%
- Status check failed
- Burst capacity <20%

### 3. Verify Setup
```bash
./verify_monitoring.sh
```

## What's Monitored

### Lightsail Metrics (Native)
- CPU utilization
- Network I/O
- Status checks
- Burst capacity

### Custom Metrics (CloudWatch Agent)
- Memory utilization
- Swap usage
- Disk utilization

## Notification Channels

**SNS Topic:** arn:aws:sns:us-east-1:586794472237:smartfarm-alerts

**Email:** admin@autonomos.dev (confirm subscription!)

**Add Discord (optional):**
```bash
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:586794472237:smartfarm-alerts \
  --protocol https \
  --notification-endpoint YOUR_DISCORD_WEBHOOK \
  --region us-east-1
```

## Cost

**Total: $0-3/month**

- CloudWatch agent: FREE
- Custom metrics (3): FREE (within 10 free tier)
- Alarms (8): FREE (within 10 free tier)
- SNS notifications: FREE (first 1,000/month)
- Dashboard: $3/month OR use Lightsail console (FREE)

## Alarm Thresholds

| Metric | Warning | Critical | Rationale |
|--------|---------|----------|-----------|
| Memory | 85% (5min) | - | Prevent OOM crashes |
| Swap | 500MB (5min) | 1GB (2min) | Memory pressure detection |
| Disk | 85% (15min) | 95% (5min) | Space management |
| CPU | 80% (10min) | - | Performance degradation |
| Burst | <20% (10min) | - | Burstable instance throttling |

## Troubleshooting

### Agent Not Publishing Metrics
```bash
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163
sudo tail -f /opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log
```

### Check Agent Status
```bash
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163
sudo systemctl status amazon-cloudwatch-agent
```

### Restart Agent
```bash
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163
sudo systemctl restart amazon-cloudwatch-agent
```

### View Metrics in AWS Console
https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#metricsV2:graph=~();namespace=~'SmartFarm*2fInstance

### View Alarms
https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#alarmsV2:

## Response Procedures

### Memory >85% Alert
1. SSH to server: `ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163`
2. Check memory: `free -h`
3. Check Docker: `docker stats --no-stream`
4. Check processes: `ps aux --sort=-%mem | head -10`
5. Restart Open WebUI if needed: `cd /opt/smartfarm && sudo docker-compose restart`

### Swap >500MB Alert
1. Indicates memory pressure
2. Check what's using memory (see above)
3. Consider upgrading instance if persistent

### Disk >85% Alert
1. Check disk usage: `df -h`
2. Find large files: `du -sh /var/lib/docker/* | sort -rh | head -10`
3. Clean Docker: `docker system prune -a --volumes`
4. Clean logs: `sudo journalctl --vacuum-size=100M`

### CPU >80% Alert
1. Check processes: `top`
2. Check Docker: `docker stats`
3. Review recent deployments
4. Check for runaway processes

### Status Check Failed
1. Check instance health in Lightsail console
2. SSH and check system logs: `sudo journalctl -xe`
3. Reboot if necessary (last resort)

## Files

- `deploy_monitoring.sh` - Install CloudWatch agent on production
- `create_alarms.sh` - Create all CloudWatch alarms
- `verify_monitoring.sh` - Check monitoring status
- `cloudwatch-config.json` - Agent configuration
