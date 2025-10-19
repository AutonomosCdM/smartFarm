# CI/CD Optimization & Configuration Guide

## Configuration Management

### Environment Variables

**Update Process:**
1. Update `.env.example` with new variables
2. Document in deployment notes
3. Update production `.env` before deployment

```bash
# SSH to server
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163

# Update environment
cd /opt/smartfarm
sudo nano .env

# Restart to apply
docker-compose restart
```

### Secrets Rotation

**GitHub Secrets:**
```bash
# List secrets
gh secret list

# Update secret
gh secret set SECRET_NAME

# Delete secret
gh secret delete SECRET_NAME
```

**Required Secrets:**
- `SSH_PRIVATE_KEY`: Deployment SSH key
- `SSH_HOST`: 98.87.30.163
- `SSH_USER`: ubuntu
- `DEPLOY_PATH`: /opt/smartfarm

## Performance Optimization

### Deployment Speed Metrics

**Current Performance:**
- Average deployment time: 2-3 minutes
- Image pull: 30-60 seconds
- Container restart: 10-20 seconds
- Health check: 10-30 seconds

### Optimization Strategies

#### 1. Image Optimization

```yaml
# Use specific tags
image: ghcr.io/open-webui/open-webui:v0.1.116
# NOT: image: ghcr.io/open-webui/open-webui:latest
```

**Benefits:**
- Predictable deployments
- No unexpected updates
- Faster pulls (cached layers)

#### 2. Build Cache

```yaml
# docker-compose.yml
services:
  open-webui:
    build:
      cache_from:
        - ghcr.io/open-webui/open-webui:cache
```

#### 3. Parallel Health Checks

```bash
# deploy.sh optimization
# Run checks in parallel
(curl -f http://localhost:3001/health &)
(curl -f http://localhost:3001/api/health &)
wait
```

#### 4. Zero-Downtime Deployment

**Current Implementation:**
```bash
# Docker Compose strategy
docker-compose up -d --no-deps --build open-webui
# Starts new container before stopping old
```

**Blue-Green Alternative:**
```bash
# Start new container on different port
docker-compose -p blue up -d
# Test new container
curl http://localhost:3002/health
# Switch traffic
docker-compose -p green down
```

### Network Optimization

```bash
# Check connection speed
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "curl -s https://raw.githubusercontent.com/sivel/speedtest-cli/master/speedtest.py | python3 -"

# Use compression for SSH
ssh -C -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163
```

### Docker Optimization

```bash
# Regular cleanup
docker system prune -a --volumes

# Use BuildKit for faster builds
export DOCKER_BUILDKIT=1

# Multi-stage builds in Dockerfile
FROM node:alpine AS builder
# ... build steps
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
```

## CI/CD Pipeline Maintenance

### Workflow Testing

**Local Testing with act:**
```bash
# Install act
brew install act

# Test workflow locally
act push

# Test with secrets
act push --secret-file .env
```

### Workflow Updates

**Safe Update Process:**
```bash
# 1. Create test branch
git checkout -b test-workflow

# 2. Edit workflow
nano .github/workflows/deploy-production.yml

# 3. Test in branch
git push origin test-workflow

# 4. Monitor test run
gh run watch

# 5. Create PR when ready
gh pr create

# 6. Merge after review
gh pr merge
```

### GitHub Actions Best Practices

#### 1. Use Caching

```yaml
- name: Cache Docker layers
  uses: actions/cache@v3
  with:
    path: /tmp/.buildx-cache
    key: ${{ runner.os }}-buildx-${{ github.sha }}
    restore-keys: |
      ${{ runner.os }}-buildx-
```

#### 2. Conditional Deployments

```yaml
- name: Deploy
  if: github.ref == 'refs/heads/main' && github.event_name == 'push'
  run: ./deploy.sh
```

#### 3. Timeout Controls

```yaml
jobs:
  deploy:
    timeout-minutes: 10
    steps:
      - name: Deploy
        timeout-minutes: 5
        run: ./deploy.sh
```

#### 4. Matrix Builds

```yaml
strategy:
  matrix:
    environment: [staging, production]
    region: [us-east, us-west]
```

## Monitoring & Metrics

### Deployment Analytics

```bash
# Get deployment frequency
gh run list --limit 100 --json conclusion,createdAt | \
  jq '[.[] | select(.conclusion=="success")] | length'

# Average deployment time
gh run list --limit 20 --json durationMS | \
  jq '[.[].durationMS] | add/length/60000'
```

### Performance Tracking

Create metrics dashboard:
```bash
# Track deployment times
echo "$(date),$(gh run view --json durationMS -q .durationMS)" >> deployment-metrics.csv

# Visualize trends
gnuplot -e "set datafile separator ','; \
  set xdata time; \
  set timefmt '%Y-%m-%d'; \
  plot 'deployment-metrics.csv' using 1:2 with lines"
```

## Cost Optimization

### GitHub Actions Minutes

**Free Tier:** 2,000 minutes/month

**Optimization Tips:**
- Use self-hosted runners for heavy workloads
- Cancel redundant runs
- Optimize workflow steps
- Use job conditions

```yaml
# Cancel previous runs
- name: Cancel Previous Runs
  uses: styfle/cancel-workflow-action@0.11.0
  with:
    access_token: ${{ github.token }}
```

### Self-Hosted Runners

```bash
# Setup self-hosted runner
cd actions-runner
./config.sh --url https://github.com/AutonomosCdM/smartFarm \
  --token YOUR_TOKEN

# Run as service
sudo ./svc.sh install
sudo ./svc.sh start
```

## Rollback Strategies

### Automated Rollback

```yaml
# .github/workflows/deploy-production.yml
- name: Deploy
  id: deploy
  run: ./deploy.sh

- name: Health Check
  id: health
  run: |
    if ! curl -f http://server/health; then
      exit 1
    fi

- name: Rollback on Failure
  if: failure()
  run: |
    ssh ${{ secrets.SSH_USER }}@${{ secrets.SSH_HOST }} \
      "cd /opt/smartfarm && git reset --hard HEAD~1 && ./deploy.sh"
