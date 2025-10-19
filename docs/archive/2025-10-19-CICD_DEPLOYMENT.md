# CI/CD Deployment Guide

## Overview

SmartFarm uses GitHub Actions for continuous integration and deployment (CI/CD). Every push to the `main` branch automatically triggers deployment to the production server.

**Key Features:**
- Zero-downtime deployments
- Automatic health checks
- Rollback on failure
- Deployment notifications
- Secure SSH-based deployment

## Deployment Architecture

```
Developer Push → GitHub → Actions Runner → SSH → Production Server
     ↓            ↓           ↓                      ↓
git commit    Webhook    Ubuntu Runner         98.87.30.163
     ↓            ↓           ↓                      ↓
git push      Trigger    Run workflow          Deploy script
     ↓            ↓           ↓                      ↓
   main       Pipeline   Health check          Docker update
```

## Automated Deployment Flow

### 1. Trigger Events

**Automatic Triggers:**
- Push to `main` branch
- Pull request merge to `main`

**Manual Triggers:**
- Workflow dispatch from GitHub UI
- GitHub CLI command

### 2. Deployment Pipeline

**Workflow File:** `.github/workflows/deploy-production.yml`

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      1. Checkout code
      2. Setup SSH
      3. Deploy to server
      4. Health check
      5. Notify status
```

### 3. Deployment Steps

**Server-Side Process:**
```bash
# deployment/deploy.sh executes:
1. Pull latest code from GitHub
2. Update Docker images
3. Restart containers with zero downtime
4. Run health checks
5. Rollback if health check fails
```

## Monitoring Deployments

### GitHub CLI Monitoring

**Install GitHub CLI:**
```bash
# macOS
brew install gh

# Ubuntu/Debian
sudo apt install gh

# Authenticate
gh auth login
```

**Watch Active Deployment:**
```bash
# Real-time monitoring
gh run watch

# List recent runs
gh run list --repo AutonomosCdM/smartFarm

# View specific run
gh run view <RUN_ID>

# View logs
gh run view <RUN_ID> --log
```

### Web Interface Monitoring

**Access Deployment Status:**
1. Navigate to: https://github.com/AutonomosCdM/smartFarm/actions
2. Click on latest workflow run
3. View real-time logs
4. Check deployment status

**Status Indicators:**
- 🟡 Yellow: In progress
- ✅ Green: Successful
- ❌ Red: Failed
- ⚪ Gray: Cancelled

### Deployment Notifications

**Slack Integration (Optional):**
```yaml
# Add to workflow file
- name: Notify Slack
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: 'Deployment ${{ job.status }}'
  if: always()
```

## Manual Deployment

### Trigger from GitHub UI

1. Go to: https://github.com/AutonomosCdM/smartFarm/actions
2. Select "Deploy to Production" workflow
3. Click "Run workflow" button
4. Select branch: `main`
5. Click "Run workflow"

### Trigger from CLI

```bash
# Trigger deployment
gh workflow run deploy-production.yml

# With specific branch
gh workflow run deploy-production.yml --ref main

# Watch the run
gh run watch
```

### Direct Server Deployment

**Emergency Deployment (SSH):**
```bash
# Connect to server
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163

# Navigate to project
cd /opt/smartfarm

# Run deployment
sudo ./deployment/deploy.sh

# Check status
docker-compose ps
docker logs open-webui --tail 50
```

## Troubleshooting Deployments

For comprehensive troubleshooting procedures, error solutions, and diagnostic commands, see:
**[CICD_TROUBLESHOOTING.md](./CICD_TROUBLESHOOTING.md)**

Common issues covered:
- Permission denied errors
- Health check failures
- Docker image pull issues
- Port conflicts
- GitHub Actions connection problems
- Deployment timeouts
- Emergency procedures
- Complete diagnostic commands

## Rollback Procedures

### Automatic Rollback

The deployment script includes automatic rollback on health check failure:

```bash
# deployment/deploy.sh snippet
if ! curl -f http://localhost:3001/health; then
  echo "Health check failed, rolling back..."
  git reset --hard HEAD~1
  docker-compose up -d
  exit 1
fi
```

### Manual Rollback

**Method 1: Revert Commit**
```bash
# Create revert commit
git revert HEAD
git push origin main
# This triggers new deployment with reverted code
```

**Method 2: Reset to Previous Commit**
```bash
# SSH to server
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163

# Reset to previous commit
cd /opt/smartfarm
sudo git reset --hard HEAD~1

# Redeploy
sudo ./deployment/deploy.sh
```

**Method 3: Tag-Based Rollback**
```bash
# Deploy specific version
cd /opt/smartfarm
sudo git checkout v1.2.3
sudo ./deployment/deploy.sh
```

### Emergency Recovery

**Complete Reset:**
```bash
# WARNING: This destroys data
docker-compose down -v
docker system prune -a
git pull origin main
docker-compose up -d
```

## Deployment Best Practices

### Pre-Deployment Checklist

- [ ] Tests passing locally
- [ ] Environment variables updated
- [ ] Documentation updated
- [ ] Database migrations ready
- [ ] Backup created

### Deployment Windows

**Recommended Times:**
- Tuesday-Thursday (avoid Monday/Friday)
- 10 AM - 3 PM (business hours for quick fixes)
- Low traffic periods

**Avoid:**
- Weekends (unless critical)
- Holidays
- Peak usage times

### Monitoring Post-Deployment

**First 5 Minutes:**
```bash
# Watch logs
docker logs -f open-webui

# Check metrics
curl http://localhost:3001/metrics

# Test critical paths
curl https://smartfarm.autonomos.dev/health
```

**First Hour:**
- Monitor error rates
- Check memory usage
- Verify API responses
- Review user reports

## Configuration & Optimization

For comprehensive configuration management, performance optimization, and pipeline maintenance procedures, see:
**[CICD_OPTIMIZATION.md](./CICD_OPTIMIZATION.md)**

Topics covered:
- Environment variable management
- Secrets rotation procedures
- Performance optimization strategies
- Zero-downtime deployment techniques
- Pipeline maintenance and updates
- GitHub Actions best practices


