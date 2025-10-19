# CI/CD Troubleshooting Guide

## Common Deployment Issues

### 1. Deployment Fails - Permission Denied

**Symptom:** "Permission denied (publickey)"

**Solution:**
```bash
# Verify SSH key in GitHub Secrets
gh secret list

# Check server accepts key
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 "echo 'Connected'"

# Update secret if needed
gh secret set SSH_PRIVATE_KEY < ~/Downloads/smartfarm-key.pem
```

### 2. Health Check Fails

**Symptom:** "Health check failed after deployment"

**Solution:**
```bash
# SSH to server
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163

# Check container status
docker-compose ps

# View logs
docker logs open-webui --tail 100

# Manual restart
docker-compose restart open-webui

# Test health endpoint
curl http://localhost:3001/health
```

### 3. Docker Image Pull Fails

**Symptom:** "Error pulling image"

**Solution:**
```bash
# Check disk space
df -h

# Clean up old images
docker system prune -a

# Retry deployment
sudo ./deployment/deploy.sh
```

### 4. Port Already in Use

**Symptom:** "Bind: address already in use"

**Solution:**
```bash
# Find process using port
sudo lsof -i :3001

# Kill process (if safe)
sudo kill -9 <PID>

# Restart containers
docker-compose down
docker-compose up -d
```

### 5. GitHub Actions Can't Connect

**Symptoms:**
- Workflow hangs at SSH step
- "Connection refused" errors
- "Host key verification failed"

**Solutions:**
```bash
# 1. Check if server is accessible
ping 98.87.30.163

# 2. Verify SSH service running
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo systemctl status sshd"

# 3. Check fail2ban didn't ban GitHub
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo fail2ban-client status sshd"

# 4. Verify firewall rules
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo ufw status numbered"
```

### 6. Deployment Stuck or Timeout

**Symptom:** Workflow runs for >10 minutes

**Solution:**
```bash
# Cancel stuck workflow
gh run cancel <RUN_ID>

# Check server load
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "top -bn1 | head -5"

# Check Docker status
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "docker-compose ps"

# Manual deployment
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163
cd /opt/smartfarm
sudo ./deployment/deploy.sh
```

## Viewing Deployment Logs

### GitHub Actions Logs
```bash
# View latest run logs
gh run view --log

# View specific job logs
gh run view --log --job <JOB_ID>

# Download logs for analysis
gh run download <RUN_ID>

# Stream live logs
gh run watch
```

### Server-Side Logs
```bash
# Deployment script logs
tail -f /var/log/smartfarm-deploy.log

# Docker logs
docker logs open-webui --tail 100 -f

# Docker Compose logs
docker-compose logs -f

# System logs
sudo journalctl -u docker -f
```

## Emergency Procedures

### Force Cancel Deployment
```bash
# Cancel GitHub Action
gh run cancel <RUN_ID>

# Kill deployment on server
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163
ps aux | grep deploy.sh
kill -9 <PID>
```

### Rollback Failed Deployment
```bash
# Method 1: Git revert
git revert HEAD
git push origin main

# Method 2: Server rollback
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163
cd /opt/smartfarm
sudo git reset --hard HEAD~1
sudo ./deployment/deploy.sh

# Method 3: From backup
./scripts/restore.sh openwebui-backup-TIMESTAMP.tar.gz
```

### Complete Reset (Last Resort)
```bash
# WARNING: Destroys all data
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163
cd /opt/smartfarm
docker-compose down -v
docker system prune -a
git pull origin main
docker-compose up -d
```

## Diagnostic Commands

### Check Workflow Status
```bash
# List recent runs
gh run list --repo AutonomosCdM/smartFarm

# View specific run details
gh run view <RUN_ID>

# Check workflow file syntax
gh workflow list
```

### Server Health Checks
```bash
# System resources
free -h
df -h
uptime

# Docker status
docker ps -a
docker-compose ps
docker system df

# Network connectivity
netstat -tulpn | grep LISTEN
curl -I https://smartfarm.autonomos.dev
```

### Verify Secrets Configuration
```bash
# List configured secrets
gh secret list

# Required secrets:
# - SSH_PRIVATE_KEY
# - SSH_HOST (98.87.30.163)
# - SSH_USER (ubuntu)
# - DEPLOY_PATH (/opt/smartfarm)
```

## Performance Issues

### Slow Deployments
```bash
# Check network speed
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "curl -s https://raw.githubusercontent.com/sivel/speedtest-cli/master/speedtest.py | python3 -"

# Clean Docker cache
docker builder prune -a

# Optimize images
docker image prune -a
```

### Container Won't Start
```bash
# Check logs
docker logs open-webui --tail 200

# Verify environment
docker-compose config

# Test with minimal config
docker run -p 3001:8080 ghcr.io/open-webui/open-webui:main
```

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Permission denied (publickey)" | SSH key mismatch | Update GitHub secret |
| "Connection refused" | SSH service down | Restart sshd on server |
| "Host key verification failed" | Server key changed | Update known_hosts |
| "No space left on device" | Disk full | Run docker system prune |
| "Port already allocated" | Port conflict | Kill conflicting process |
| "Health check failed" | App not starting | Check container logs |

## Related Documentation

- [CI/CD Deployment Guide](./CICD_DEPLOYMENT.md)
- [GitHub Actions SSH Security](../security/GITHUB_ACTIONS_SSH_SECURITY.md)
- [General Troubleshooting](../TROUBLESHOOTING.md)
- [Incident Response](../security/INCIDENTS.md)