# CI/CD Deployment Guide

## Overview

SmartFarm uses GitHub Actions with a self-hosted runner for automated deployment. Every push to the `main` branch automatically deploys to production at https://smartfarm.autonomos.dev.

**Architecture:**
```
Developer → git push → GitHub → Self-Hosted Runner → Production Deploy → Health Check
                                 (on 98.87.30.163)
```

**Key Features:**
- Zero-downtime deployments
- Automatic health checks
- Rollback on failure
- Self-hosted runner (no SSH needed)
- 15-minute timeout protection

## Why Self-Hosted Runner?

**Problem Solved:** GitHub-hosted runners couldn't SSH to AWS Lightsail due to network-level restrictions (see [archive/2025-10-19-GITHUB_ACTIONS_SSH_INVESTIGATION.md](../archive/2025-10-19-GITHUB_ACTIONS_SSH_INVESTIGATION.md) for details).

**Solution:** Self-hosted runner installed directly on the production server provides:
- No network restrictions
- Faster deployments (local execution)
- Lower complexity
- No SSH secrets management needed

## Deployment Flow

### Automatic Deployment

**Trigger:** Push to `main` branch

```bash
git add .
git commit -m "feat: add new feature"
git push origin main
# Deployment starts automatically
```

**Pipeline Steps:**
1. Self-hosted runner receives job from GitHub
2. Navigates to `/opt/smartfarm`
3. Pulls latest code: `git pull origin main`
4. Runs deployment script: `./deployment/deploy.sh`
5. Waits 15 seconds for services to stabilize
6. Performs health check (6 attempts over 60 seconds)
7. Success ✅ or Rollback ⚙️

### Manual Deployment

**Trigger from GitHub UI:**
1. Go to https://github.com/AutonomosCdM/smartFarm/actions
2. Select "Deploy to Production" workflow
3. Click "Run workflow" → Select `main` → Run

**Trigger from CLI:**
```bash
gh workflow run deploy-production.yml --repo AutonomosCdM/smartFarm
gh run watch  # Monitor progress
```

### Emergency Server Deployment

**Bypass CI/CD (direct server access):**
```bash
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163
cd /opt/smartfarm
sudo git pull origin main
sudo ./deployment/deploy.sh
```

## Monitoring Deployments

### GitHub CLI

```bash
# List recent runs
gh run list --repo AutonomosCdM/smartFarm

# Watch active deployment
gh run watch

# View specific run
gh run view <RUN_ID>

# View logs
gh run view <RUN_ID> --log
```

### Web Interface

**Access:** https://github.com/AutonomosCdM/smartFarm/actions

**Status Indicators:**
- 🟡 In progress
- ✅ Successful
- ❌ Failed
- ⚪ Cancelled

## Self-Hosted Runner Setup

### Installation (Already Done)

The runner is installed on the production server at `/opt/smartfarm/actions-runner`.

**Service Status:**
```bash
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163
sudo systemctl status actions.runner.AutonomosCdM-smartFarm.*
```

### Maintenance

**Restart Runner:**
```bash
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163
cd /opt/smartfarm/actions-runner
sudo ./svc.sh stop
sudo ./svc.sh start
```

**View Runner Logs:**
```bash
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163
sudo journalctl -u actions.runner.* -f
```

**Update Runner:**
```bash
# GitHub will prompt for updates in the Actions UI
# Follow the prompts to download and install updates
```

## Rollback Procedures

### Automatic Rollback

If health check fails, the workflow automatically:
1. Detects failure
2. Runs `git reset --hard HEAD~1`
3. Re-runs `deploy.sh` with previous code
4. Reports rollback in workflow logs

### Manual Rollback

**Method 1: Revert Commit**
```bash
git revert HEAD
git push origin main
# Triggers new deployment with reverted code
```

**Method 2: Server-Side Rollback**
```bash
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163
cd /opt/smartfarm
sudo git reset --hard HEAD~1
sudo ./deployment/deploy.sh
```

**Method 3: Tag-Based Rollback**
```bash
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163
cd /opt/smartfarm
sudo git checkout v1.2.3  # Replace with desired tag
sudo ./deployment/deploy.sh
```

## Troubleshooting

### Deployment Fails

**1. Check Workflow Status**
```bash
gh run list --limit 5
gh run view --log
```

**2. Check Runner Status**
```bash
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163
sudo systemctl status actions.runner.*
```

**3. Check Server Logs**
```bash
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163
docker logs open-webui --tail 100
```

### Health Check Fails

**Symptoms:** Deployment completes but health check times out

**Solutions:**
```bash
# 1. Check if container is running
docker ps

# 2. Check container logs
docker logs open-webui --tail 100

# 3. Test endpoint locally
curl -I http://localhost:3001
curl -I https://smartfarm.autonomos.dev

# 4. Check Nginx
sudo nginx -t
sudo systemctl status nginx
```

### Runner Not Responding

**Symptoms:** Workflow stuck in "Queued" state

**Solutions:**
```bash
# 1. Check runner service
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163
sudo systemctl status actions.runner.*

# 2. Restart runner
cd /opt/smartfarm/actions-runner
sudo ./svc.sh restart

# 3. Check runner logs
sudo journalctl -u actions.runner.* --since "10 minutes ago"
```

### Deployment Timeout

**Symptoms:** Workflow times out after 15 minutes

**Common Causes:**
- Docker image pull taking too long
- Database migrations hanging
- Health check endpoint not responding

**Solutions:**
```bash
# 1. Check what's running
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163
ps aux | grep deploy

# 2. Kill stuck processes
sudo pkill -f deploy.sh

# 3. Manual deployment
sudo ./deployment/deploy.sh
```

## Configuration

### Workflow File

**Location:** `.github/workflows/deploy-production.yml`

**Key Settings:**
```yaml
runs-on: self-hosted      # Uses server-based runner
timeout-minutes: 15       # Max deployment time
```

### Environment Variables

**Server Environment:**
```bash
# /opt/smartfarm/.env
GROQ_API_KEY=gsk_xxx
OPENAI_API_KEY=sk-xxx
OPENWEBUI_PORT=3001
```

**No GitHub Secrets needed** - self-hosted runner has direct access to server environment.

## Best Practices

### Pre-Deployment Checklist

- [ ] Tests pass locally
- [ ] Environment variables updated (if needed)
- [ ] Documentation updated
- [ ] Backup created (automatic via daily cron)
- [ ] Deployment window appropriate (avoid peak hours)

### Deployment Windows

**Recommended:**
- Tuesday-Thursday
- 10 AM - 3 PM UTC (business hours for quick fixes)
- Low traffic periods

**Avoid:**
- Weekends (unless critical)
- Holidays
- Peak usage times

### Post-Deployment Monitoring

**First 5 Minutes:**
```bash
# Watch logs
docker logs -f open-webui

# Check metrics
curl http://localhost:3001/health

# Verify critical features
# - Login working
# - Models available
# - Excel upload functional
```

**First Hour:**
- Monitor error rates in logs
- Check memory usage
- Verify API responses
- Review user reports

## Performance Optimization

### Deployment Speed

**Current Performance:**
- Average deployment: 2-3 minutes
- Image pull: 30-60 seconds (if needed)
- Container restart: 10-20 seconds
- Health check: 10-30 seconds

### Optimization Strategies

**1. Image Caching**
```yaml
# Already optimized - using specific tags
image: ghcr.io/open-webui/open-webui:main
```

**2. Zero-Downtime Deployment**
```bash
# deploy.sh already implements rolling restart
docker-compose up -d --no-deps --build open-webui
```

**3. Health Check Parallelization**
```bash
# Current: Sequential checks with 10s interval
# Optimized: Parallel checks (future enhancement)
```

## Security Considerations

### Runner Security

**Access Control:**
- Runner runs as limited user (not root)
- Only has access to `/opt/smartfarm`
- Uses systemd service for isolation

**Audit Trail:**
- All deployments logged in GitHub Actions
- Server logs in `/var/log/syslog`
- Docker logs via `docker logs`

### Secrets Management

**No Secrets Needed:**
- Self-hosted runner reads `.env` directly
- No need to store SSH keys in GitHub
- API keys stay on server only

**API Key Rotation:**
See [../security/SECRETS_MANAGEMENT.md](../security/SECRETS_MANAGEMENT.md)

## Emergency Procedures

### Force Cancel Deployment

```bash
# Cancel from GitHub UI
# Navigate to Actions → Running workflow → Cancel

# Or via CLI
gh run cancel <RUN_ID>
```

### Complete Reset (Last Resort)

**⚠️ WARNING: Destroys all data**
```bash
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163
cd /opt/smartfarm
docker-compose down -v  # DELETES VOLUMES
docker system prune -a
git pull origin main
docker-compose up -d
```

## Monitoring & Alerting

### CloudWatch Integration

CI/CD metrics available in CloudWatch:
- Deployment frequency
- Deployment duration
- Success/failure rates
- Health check response times

See [MONITORING.md](./MONITORING.md) for details.

### GitHub Notifications

**Default Notifications:**
- Workflow failures (email)
- Successful deployments (no notification by default)

**Optional: Slack Integration**
```yaml
# Add to workflow file (future enhancement)
- name: Notify Slack
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
```

## Related Documentation

- [Production Deployment Manual](../DEPLOYMENT.md) - Initial server setup
- [Backup & Restore](./BACKUP_RESTORE.md) - Before major deployments
- [Monitoring Guide](./MONITORING.md) - CloudWatch setup
- [SSH Security](../security/SSH_HARDENING.md) - SSH hardening and fail2ban
- [Troubleshooting](../TROUBLESHOOTING.md) - General troubleshooting

## Maintenance Schedule

### Weekly Tasks
- Review deployment logs
- Check runner status
- Verify health check success rate

### Monthly Tasks
- Update runner if needed
- Review deployment metrics
- Audit failed deployments

### Quarterly Tasks
- Review and optimize workflow
- Update documentation
- Test disaster recovery procedures

---

**Last Updated:** 2025-10-19
**Workflow File:** `.github/workflows/deploy-production.yml`
**Runner Location:** `/opt/smartfarm/actions-runner`
**Production URL:** https://smartfarm.autonomos.dev
