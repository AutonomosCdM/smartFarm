# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SmartFarm is an AI agricultural assistant with **two deployment options:**

1. **Docker Compose (Simple)**: Single container, manual workflow, 2GB RAM minimum
2. **Kubernetes/k3s (Production)**: Automated data ingestion pipeline, 4GB RAM recommended

**Key Architecture Principle:** This is an infrastructure/deployment project with an **extensible data ingestion system**. Changes typically involve:
- **Infrastructure**: Docker Compose or Kubernetes manifests
- **Data Sources**: Python scripts for downloading/processing external data
- **Configuration**: Environment variables, ConfigMaps, Secrets
- **Deployment**: Bash automation scripts

**Technology Stack:**
- **Frontend**: Open WebUI (ghcr.io/open-webui/open-webui:main)
- **AI Backend**: Groq API (OpenAI-compatible)
- **Infrastructure Options**:
  - Docker Compose + Nginx (simple)
  - Kubernetes (k3s) + Nginx (production)
- **CI/CD**: GitHub Actions (automatic deployment on push to main)
- **Data Ingestion** (k3s only):
  - castai/openwebui-content-sync (folder monitoring, SHA256 diffing)
  - Kubernetes CronJobs (scheduled downloads)
  - Python scripts (data extraction & conversion)
- **Production**: AWS Lightsail with Let's Encrypt SSL
- **Persistence**: Docker volumes or Kubernetes PVCs

## Core Commands

### Local Development

```bash
# Start the application
docker-compose up -d

# View logs (real-time, follow mode)
docker logs -f open-webui

# View last 50 lines of logs
docker logs open-webui --tail 50

# Stop the application (preserves volume)
docker-compose down

# Stop and remove volume (⚠️ deletes all data)
docker-compose down -v

# Restart the application
docker-compose restart

# Check container status
docker ps --filter "name=open-webui"

# Check container health
docker inspect open-webui --format='{{.State.Health.Status}}'

# Access container shell (for debugging)
docker exec -it open-webui bash
```

**Access application:** http://localhost:3001 (or port specified in `OPENWEBUI_PORT`)

### Production Deployment (Docker Compose)

```bash
# SSH to production server
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@54.173.46.123

# Deploy/update SmartFarm with Docker Compose
cd /opt/smartfarm
./deployment/deploy.sh

# Configure Nginx reverse proxy
./deployment/setup-nginx.sh

# Install SSL certificate
sudo certbot --nginx -d smartfarm.autonomos.dev --non-interactive --agree-tos --email admin@autonomos.dev --redirect
```

### Production Deployment (Kubernetes k3s)

**For automated data ingestion and production-grade infrastructure:**

```bash
# SSH to production server
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@54.173.46.123

# Fresh k3s installation
cd /opt/smartfarm
sudo ./deployment/k3s-deploy.sh

# OR migrate from Docker Compose
sudo ./deployment/migrate-to-k3s.sh

# View all resources
kubectl get all -n smartfarm

# View logs
kubectl logs -f deployment/openwebui -n smartfarm
kubectl logs -f deployment/castai-sync -n smartfarm

# Manually trigger data download
kubectl create job --from=cronjob/CRONJOB-NAME test-run -n smartfarm
```

**Key k3s Components:**
- `openwebui` deployment (AI interface + Knowledge Base)
- `castai-sync` deployment (folder monitoring, incremental sync)
- CronJobs (scheduled data downloads)
- PersistentVolumes (openwebui-data, smartfarm-downloads, castai-sync-data)
- ConfigMaps (scripts, automation config)
- Secrets (API keys)

**See `docs/K3S_DEPLOYMENT.md` for complete guide.**

### Data Management

```bash
# Backup Open WebUI data (creates ./backups/openwebui-backup-TIMESTAMP.tar.gz)
./scripts/backup.sh

# Restore from backup
./scripts/restore.sh BACKUP_FILENAME

# Update to latest Open WebUI version
./scripts/update.sh

# Inspect volume (see where data is actually stored)
docker volume inspect open-webui
```

**Important:** All user data (conversations, settings, uploaded files, user accounts) is stored in the Docker volume. Always backup before updates or major changes.

## Architecture

### Docker Configuration

The application runs entirely in Docker with persistent storage:

- **Container**: `open-webui` (ghcr.io/open-webui/open-webui:main)
- **Port Mapping**: Host 3001 → Container 8080
- **Volume**: `open-webui` for data persistence
- **Network**: `smartfarm-network` (bridge)
- **Health Check**: HTTP GET on `/health` endpoint

### Environment Variables

Configuration is managed via `.env` file:

- `GROQ_API_KEY`: Primary API key for Groq inference
- `GROQ_API_BASE`: Groq API endpoint (https://api.groq.com/openai/v1)
- `OPENWEBUI_PORT`: Host port for Open WebUI (default: 3001)
- `OPENWEBUI_CONTAINER_NAME`: Docker container name
- `OPENWEBUI_VOLUME_NAME`: Docker volume for persistence
- `DEFAULT_LOCALE`: Default language for interface (es-ES for Spanish)

**IMPORTANT**: The `.env` file is gitignored. Always use `.env.example` as template.

### Production Architecture

```
Internet → HTTPS (443) → Nginx Reverse Proxy → Docker Container (3001) → Open WebUI (8080)
                ↓
          Let's Encrypt SSL
                ↓
          Auto-renewal via certbot
```

## Groq API Configuration

SmartFarm uses Groq for AI model access. Configuration requires TWO steps:

### Step 1: Environment Configuration

Edit `.env` file (never commit this file):
```bash
GROQ_API_KEY=gsk_xxxxxxxxxxxxx  # From https://console.groq.com/keys
GROQ_API_BASE=https://api.groq.com/openai/v1
```

### Step 2: Open WebUI Connection Setup

After starting the application:
1. Navigate to http://localhost:3001
2. **Create admin account** (first user becomes admin automatically)
3. Go to **Admin Panel → Settings → Connections**
4. Click **"+ Add Connection"**
5. Configure:
   - **Type**: OpenAI Compatible
   - **Name**: Groq
   - **API Base URL**: `https://api.groq.com/openai/v1`
   - **API Key**: Your Groq API key
6. Click **Save** and verify connection

### Step 3: Make Models Public

**Critical:** Models are private by default. New users won't see any models.

1. Go to **Admin Panel → Settings → Models**
2. For each model you want users to access:
   - Click the model to edit
   - Change **Visibility** from "Private" to **"Public"**
   - Click **"Save & Update"**

See `docs/MODEL_VISIBILITY.md` for details.

### Recommended Models for Agriculture

- `llama-3.3-70b-versatile` - Best balance for general queries (131K context)
- `groq/compound` - Groq-optimized performance (131K context)
- `deepseek-r1-distill-llama-70b` - Advanced reasoning (131K context)
- `llama-3.1-8b-instant` - Fast responses for simple tasks (131K context)
- `whisper-large-v3-turbo` - Audio transcription
- `moonshotai/kimi-k2-instruct` - Ultra-long context (262K tokens)

See `docs/MODELS.md` for complete model catalog (20+ models available).

## Key Scripts

### `deployment/deploy.sh` - Full Production Deployment

**Purpose:** Automated production deployment from scratch or update existing installation.

**What it does:**
1. Installs Docker/Docker Compose/Git if missing
2. Backs up existing installation to `/opt/smartfarm-backup-TIMESTAMP`
3. Clones/updates repository to `/opt/smartfarm`
4. Creates `.env` from template (prompts for manual API key entry)
5. Pulls latest Docker images and starts services

**Usage:** `sudo ./deployment/deploy.sh` (must run as root on production server)

**Important:** Prompts user to manually edit `.env` and add Groq API key before starting containers.

### `deployment/setup-nginx.sh` - Reverse Proxy Configuration

**Purpose:** Configure Nginx as reverse proxy for port 80/443 → 3001.

**What it does:**
1. Installs Nginx if not present
2. Creates `/etc/nginx/sites-available/smartfarm` configuration
3. Enables WebSocket support (required for Open WebUI real-time features)
4. Configures proxy headers for proper request forwarding
5. Enables site and reloads Nginx

**Usage:** `sudo ./deployment/setup-nginx.sh`

**Note:** Run this AFTER `deploy.sh` and BEFORE SSL certificate installation.

### `scripts/backup.sh` - Data Backup

**Purpose:** Create timestamped backup of all Open WebUI data.

**What it does:**
1. Checks if Docker and `open-webui` volume exist
2. Creates `./backups/` directory if missing
3. Uses Alpine container to tar the entire volume
4. Outputs: `./backups/openwebui-backup-YYYYMMDD_HHMMSS.tar.gz`
5. Shows backup size and lists 5 most recent backups

**Usage:** `./scripts/backup.sh` (no sudo required)

**What's backed up:** All user accounts, conversations, settings, uploaded files, and admin configurations.

### `scripts/restore.sh` - Data Restoration

**Purpose:** Restore Open WebUI data from a backup file.

**Usage:** `./scripts/restore.sh backups/openwebui-backup-YYYYMMDD_HHMMSS.tar.gz`

**⚠️ Warning:** This will overwrite all current data in the volume.

### `scripts/update.sh` - Version Update

**Purpose:** Update Open WebUI to the latest version while preserving data.

**What it does:**
1. Pulls latest `ghcr.io/open-webui/open-webui:main` image
2. Stops and removes current container
3. Starts new container with same volume (data persists)

**Usage:** `./scripts/update.sh`

**Data Safety:** Volume is preserved, but backup is recommended before updates.

## Repository Structure

```
smartFarm_v5/
├── .env.example              # Environment template
├── .gitignore               # Git ignore rules (.env, secrets, backups, data/)
├── docker-compose.yml        # Docker Compose config (simple deployment)
├── README.md                # User-facing documentation
├── CLAUDE.md                # This file (guidance for Claude Code)
├── LICENSE                  # MIT license
│
├── .github/                 # GitHub configuration
│   └── workflows/          # GitHub Actions CI/CD
│       └── deploy-production.yml  # Automatic deployment workflow
│
├── deployment/              # Deployment automation
│   ├── deploy.sh           # Docker Compose deployment (CI/CD compatible)
│   ├── setup-nginx.sh      # Nginx reverse proxy setup
│   ├── k3s-deploy.sh       # Fresh k3s deployment
│   ├── migrate-to-k3s.sh   # Docker → k3s migration
│   └── nginx*.conf         # Nginx configs
│
├── scripts/                 # Management & data ingestion scripts
│   ├── backup.sh           # Volume backup
│   ├── restore.sh          # Volume restore
│   ├── update.sh           # Update Open WebUI
│   ├── openwebui_client.py # Open WebUI API client
│   ├── download_*.py       # Data source downloaders (extensible)
│   ├── *_to_markdown.py    # Format converters for RAG
│   └── *_automation.py     # Source-specific automation
│
├── k8s/                     # Kubernetes manifests (k3s deployment)
│   ├── namespace.yaml      # SmartFarm namespace
│   ├── configmap-*.yaml    # Environment configs
│   ├── secret-*.yaml.template # API key templates (never commit actual secrets!)
│   ├── pvc-*.yaml          # Persistent storage
│   ├── deployment-*.yaml   # Pod deployments
│   ├── service-*.yaml      # Service definitions
│   ├── castai/             # castai-sync manifests
│   │   ├── configmap-sync.yaml
│   │   ├── deployment-sync.yaml
│   │   └── pvc-sync.yaml
│   └── cronjobs/           # Scheduled data downloads
│       ├── configmap-scripts.yaml
│       └── cronjob-*.yaml  # One per data source (extensible)
│
├── config/                  # Configuration files
│   └── automation_config.json # Data sources config (gitignored)
│
├── data/                    # Downloaded data (gitignored)
│   ├── *_markdown/         # Processed markdown for RAG
│   └── *_raw/              # Raw downloaded data
│
└── docs/                    # Documentation
    ├── README.md                   # Documentation index ⭐
    ├── INSTALLATION.md             # Docker Compose setup
    ├── K3S_DEPLOYMENT.md           # Kubernetes deployment ⭐
    ├── AUTOMATED_DATA_INGESTION.md # Add data sources ⭐
    ├── GROQ_CONFIGURATION.md       # API setup
    ├── PRODUCTION_DEPLOYMENT.md    # AWS deployment (Docker)
    ├── LANGUAGE_CONFIGURATION.md   # Set default language
    ├── MODEL_VISIBILITY.md         # Fix "no models"
    ├── MODELS.md                   # Model catalog
    ├── UI_CUSTOMIZATION.md         # UI customization guide
    ├── TROUBLESHOOTING.md          # Common issues (Docker & k3s)
    └── archive/                    # Historical/example docs
        └── proof-of-concept/       # FEGOSA/Consorcio examples
            ├── README.md           # Why archived
            ├── AUTOMATION_PLAN.md
            ├── AUTOMATION_PROGRESS.md
            ├── FEGOSA_INTEGRATION.md
            ├── FEGOSA_STATUS.md
            ├── COMMUNITY_TOOLS_RESEARCH.md
            └── OPENWEBUI_KNOWLEDGE_BASE.md
```

**Key Points:**
- **Automatic deployment:** GitHub Actions CI/CD with health checks and rollback
- **Two deployment options:** Docker Compose (simple) or k3s (production)
- **Extensible data pipeline:** Add unlimited data sources without changing infrastructure
- **Example-specific docs archived:** FEGOSA/Consorcio docs in `docs/archive/proof-of-concept/`
- **Generic documentation only:** Main docs/ folder contains deployment-agnostic guides
- **No application code:** Pure infrastructure/configuration project
- **Python scripts:** Data ingestion only, not application logic
- **Volume/PVC storage:** No SQL/NoSQL database
- **Git repo:** https://github.com/AutonomosCdM/smartFarm.git

## Security Considerations

1. **API Key Protection**: `.env` is gitignored and must NEVER be committed. GitHub secret scanning is enabled.
2. **GitHub Secrets**: SSH keys and deployment credentials stored as GitHub Actions secrets (SSH_PRIVATE_KEY, SSH_HOST, SSH_USER, DEPLOY_PATH).
3. **SSL/HTTPS**: Production uses Let's Encrypt with auto-renewal via certbot cron job.
4. **Firewall**: Production server requires ports 80 (HTTP), 443 (HTTPS), and 22 (SSH) open.
5. **First User Admin**: First user to sign up automatically becomes admin—secure production before making public.
6. **WebSocket Security**: Nginx configuration includes WebSocket upgrade headers for secure real-time communication.
7. **Data Files**: `data/` and `config/*.{json,yaml}` are gitignored to prevent accidental commits of sensitive data.

## Development Workflow

This is an infrastructure project with minimal code changes. Most work involves:

### Configuration Changes
1. Edit `.env.example` (template that gets committed)
2. Never edit or commit `.env` (actual secrets)
3. Test locally with `docker-compose down && docker-compose up -d`
4. Verify at http://localhost:3001

### Script Changes
1. Edit deployment/management scripts (bash)
2. Test locally on your machine before production
3. Make scripts executable: `chmod +x scripts/*.sh deployment/*.sh`

### Docker Compose Changes
1. Edit `docker-compose.yml` for service configuration
2. Test with `docker-compose config` to validate syntax
3. Apply changes: `docker-compose down && docker-compose up -d`

### Documentation Updates
1. Keep `docs/` in sync with functionality
2. Update `CLAUDE.md` when architecture or workflows change
3. Update `README.md` for user-facing feature changes

### Production Deployment (Automatic - CI/CD)

**Normal workflow (recommended):**
1. Push changes to `main` branch on GitHub
2. GitHub Actions automatically deploys to production
3. Health checks verify deployment success
4. Automatic rollback if deployment fails
5. Verify at https://smartfarm.autonomos.dev

**Manual deployment (fallback):**
1. SSH to production: `ssh -i ~/Downloads/smartfarm-key.pem ubuntu@54.173.46.123`
2. Run deployment: `cd /opt/smartfarm && sudo ./deployment/deploy.sh`
3. Verify at https://smartfarm.autonomos.dev

See "CI/CD Pipeline" section below for details.

## Production URLs

- **Production Instance**: https://smartfarm.autonomos.dev
- **Server IP**: 54.173.46.123 (AWS Lightsail)
- **SSH Access**: `ssh -i ~/Downloads/smartfarm-key.pem ubuntu@54.173.46.123`
- **Local Development**: http://localhost:3001

## CI/CD Pipeline

SmartFarm uses **GitHub Actions for automatic deployment** to production. Push to `main` branch triggers automatic deployment with health checks and rollback capability.

### How It Works

```
Push to main → GitHub Actions → SSH Deploy → Health Check → ✅ Success or ⏮️ Rollback
```

**Workflow:** `.github/workflows/deploy-production.yml`

**Steps:**
1. **Checkout code** from GitHub repository
2. **Setup SSH** with secrets (SSH_PRIVATE_KEY, SSH_HOST, SSH_USER, DEPLOY_PATH)
3. **Test SSH connection** to production server
4. **Deploy to production:**
   - Git pull latest changes
   - Run `deployment/deploy.sh` with CI/CD mode
   - Deploy script includes health checks (6 attempts, 60 seconds)
5. **Health check** from GitHub Actions (additional verification)
6. **Rollback** if deployment or health checks fail

### GitHub Secrets Configuration

Required secrets in repository settings (Settings → Secrets → Actions):

```
SSH_PRIVATE_KEY = [contents of smartfarm-key.pem]
SSH_HOST = 54.173.46.123
SSH_USER = ubuntu
DEPLOY_PATH = /opt/smartfarm
```

**Note:** Secrets are already configured and working.

### Monitoring Deployments

```bash
# View recent deployments
gh run list --limit 10

# Watch deployment in real-time
gh run watch

# View specific deployment logs
gh run view RUN_ID --log

# View latest deployment
gh run view --log

# Check deployment status
gh run list --limit 1

# View in browser
open https://github.com/AutonomosCdM/smartFarm/actions
```

### Deployment Features

**✅ Automatic Triggers:**
- Push to `main` branch
- Manual trigger via GitHub UI (workflow_dispatch)

**✅ Health Checks:**
- Local health check in deploy script (6 attempts, 60 seconds)
- GitHub Actions health check (6 attempts, 60 seconds)
- Checks both HTTP 200/301/302 responses

**✅ Rollback Mechanism:**
- Automatic rollback if health check fails
- Git reset to previous commit
- Re-run deployment script
- Preserves data (only code rolls back)

**✅ CI/CD Mode Detection:**
- Deploy script detects CI/CD environment
- Skips interactive prompts
- Proper exit codes for automation
- Verbose logging for debugging

### Manual Deployment (Fallback)

If GitHub Actions is unavailable:

```bash
# SSH to server
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@54.173.46.123

# Pull and deploy
cd /opt/smartfarm
sudo git pull origin main
sudo ./deployment/deploy.sh
```

### Troubleshooting CI/CD

**Deployment fails with SSH errors:**
```bash
# Verify secrets are configured
gh secret list

# Test SSH connection manually
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@54.173.46.123 "echo 'SSH works'"
```

**Health check fails but service is running:**
```bash
# Check if service is accessible
curl -I https://smartfarm.autonomos.dev

# Check container status
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@54.173.46.123 "docker ps"

# View container logs
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@54.173.46.123 "docker logs open-webui --tail 50"
```

**Workflow stuck or failed:**
```bash
# View workflow logs
gh run view --log

# Cancel stuck workflow
gh run cancel

# Re-trigger deployment
git commit --allow-empty -m "trigger: re-deploy"
git push origin main
```

**Permission errors in deployment:**
- Deploy script runs with sudo
- Git operations also use sudo for consistency
- `/opt/smartfarm` is owned by root

### Deployment Best Practices

1. **Always test locally first:**
   ```bash
   docker-compose down && docker-compose up -d
   ```

2. **Use feature branches for development:**
   ```bash
   git checkout -b feature/my-feature
   # Make changes
   git push origin feature/my-feature
   # Create PR to main
   ```

3. **Monitor deployments:**
   ```bash
   gh run watch  # Keep open during deployment
   ```

4. **Backup before major changes:**
   ```bash
   ./scripts/backup.sh  # Run locally or on server
   ```

5. **Verify deployment success:**
   ```bash
   curl -I https://smartfarm.autonomos.dev  # Should return 200/301/302
   ```

## Troubleshooting Quick Reference

### Container won't start
```bash
# Check logs for error messages
docker logs open-webui

# Check if port is available
lsof -i :3001

# Verify Docker is running
docker info

# Recreate container
docker-compose down && docker-compose up -d
```

### Port conflict (3001 in use)
```bash
# Find process using the port
lsof -i :3001

# Kill the process (if safe to do so)
kill -9 <PID>

# OR change port in .env
OPENWEBUI_PORT=3002
docker-compose down && docker-compose up -d
```

### "No models found" for users
**Problem:** Non-admin users see "No results found" in model dropdown.

**Solution:** Admin must set models to "Public" visibility:
1. Admin Panel → Settings → Models
2. Edit each model → Change Visibility to "Public"
3. Save & Update

See `docs/MODEL_VISIBILITY.md` for details.

### API connection issues
```bash
# Verify API key in environment
cat .env | grep GROQ_API_KEY

# Test API key directly with curl
curl https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"

# Check if connection is configured in Open WebUI
# Admin Panel → Settings → Connections → Should see Groq listed
```

### Container running but can't access web interface
```bash
# Check container is healthy
docker inspect open-webui --format='{{.State.Health.Status}}'

# Verify port mapping
docker ps --filter "name=open-webui"

# Check if firewall blocking port
sudo ufw status

# Test locally on server
curl http://localhost:3001
```

### Nginx issues (production only)
```bash
# Test configuration syntax
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Check Nginx status
sudo systemctl status nginx

# View error logs
sudo tail -f /var/log/nginx/error.log

# View access logs
sudo tail -f /var/log/nginx/access.log
```

### SSL certificate issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Test renewal process (dry run)
sudo certbot renew --dry-run

# View certbot logs
sudo tail -f /var/log/letsencrypt/letsencrypt.log
```

### Language not changing after setting DEFAULT_LOCALE
1. Clear browser cache and cookies (Ctrl+Shift+Delete)
2. Open in private/incognito window to test
3. Verify environment variable loaded: `docker exec open-webui env | grep DEFAULT_LOCALE`
4. Restart container: `docker-compose restart`

**Note:** Existing users who set their language preference must change it manually in Settings. DEFAULT_LOCALE only affects new users.

### Complete reset (⚠️ destroys all data)
```bash
# Stop and remove everything
docker-compose down -v

# Remove Docker image
docker rmi ghcr.io/open-webui/open-webui:main

# Start fresh
docker-compose up -d
```

For more detailed troubleshooting, see `docs/TROUBLESHOOTING.md`.

## Data Persistence

All application data lives in the Docker volume (not a database):

**Volume Name:** `open-webui` (configurable via `OPENWEBUI_VOLUME_NAME`)

**What's Stored:**
- User accounts and authentication data
- All conversations and chat history
- User-uploaded files and documents
- Admin panel configurations
- API connection settings
- Model visibility settings

**Volume Location:** Docker-managed storage (use `docker volume inspect open-webui` to see path)

**Backup Strategy:**
- Run `./scripts/backup.sh` before major changes or updates
- Backups are stored in `./backups/` directory
- Volume persists across container restarts, updates, and Docker Compose down (unless `-v` flag is used)

**Important:** `docker-compose down -v` will DELETE the volume and all data. Only use if intentionally resetting.

## Important Notes & Gotchas

### User Access and Permissions
- **First user = admin**: First signup on fresh installation automatically becomes admin. Secure production before making public.
- **Model visibility**: Models are **private by default** (Open WebUI v0.4.8+). Admin must set each model to "Public" in Admin Panel → Settings → Models. Otherwise, non-admin users see "No models found".

### API Configuration
- **Two-step setup required**: Groq API key goes in `.env` file, but connection must also be configured in Open WebUI Admin Panel → Settings → Connections.
- **No embeddings support**: Groq API does not support embeddings. Auto Memory and Adaptive Memory functions won't work. Use native Open WebUI memory (Settings → Personalization) instead.

### Infrastructure
- **WebSocket required**: Open WebUI needs WebSocket support for real-time features. Nginx configuration includes proper upgrade headers.
- **SSL auto-renewal**: Certbot sets up automatic renewal via cron job. Certificate renews before expiration.
- **Port mapping**: Container runs on port 8080 internally, mapped to host port 3001 (configurable via `OPENWEBUI_PORT`).

### Language Configuration
- **Default locale**: Set via `DEFAULT_LOCALE=es-ES` in `.env` file. Applies to new users only.
- **User preferences persist**: Existing users who set their language preference keep their selection. Admin cannot force change.
- **Browser fallback**: If `DEFAULT_LOCALE` not set, Open WebUI detects browser language.

### Data Safety
- **Volume persistence**: Data survives container restarts and updates. Only deleted with `docker-compose down -v`.
- **No database**: All data stored in Docker volume filesystem, not SQL/NoSQL database.
- **Backup before updates**: Always run `./scripts/backup.sh` before version updates or major changes.

## Automated Data Ingestion System (k3s Only)

### Overview

The k3s deployment includes an **extensible data ingestion pipeline** that automatically downloads, processes, and syncs external data sources into the Open WebUI Knowledge Base for RAG-enhanced AI responses.

**Key Components:**
1. **Python Scripts** (`scripts/download_*.py`, `scripts/*_to_markdown.py`)
2. **Kubernetes CronJobs** (`k8s/cronjobs/cronjob-*.yaml`)
3. **castai-sync** (community tool for folder monitoring)
4. **Persistent Storage** (`smartfarm-downloads` PVC)

### Adding a New Data Source

**This is a common task. Follow these steps:**

#### Step 1: Create Download Script

```python
# scripts/download_newsource.py
import requests
from pathlib import Path

def download():
    url = "https://api.example.com/data"
    response = requests.get(url)
    
    output_dir = Path("data/newsource/")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    with open(output_dir / "data.json", 'w') as f:
        f.write(response.text)
    
    print("✓ Downloaded newsource data")

if __name__ == "__main__":
    download()
```

#### Step 2: Create Conversion Script

```python
# scripts/newsource_to_markdown.py
import json
from pathlib import Path

def convert():
    # Load downloaded data
    with open("data/newsource/data.json") as f:
        data = json.load(f)
    
    # Convert to markdown for optimal RAG
    output_dir = Path("data/newsource_markdown/")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    markdown = f"""# {data['title']}

**Source:** {data['source']}
**Date:** {data['date']}

---

{data['content']}

---

*Processed by SmartFarm Data Pipeline*
"""
    
    with open(output_dir / f"{data['date']}_newsource.md", 'w') as f:
        f.write(markdown)
    
    print("✓ Converted newsource data to markdown")

if __name__ == "__main__":
    convert()
```

#### Step 3: Create CronJob Manifest

```yaml
# k8s/cronjobs/cronjob-newsource.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: newsource-downloader
  namespace: smartfarm
spec:
  schedule: "0 3 * * *"  # Daily at 3 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: downloader
            image: python:3.11-slim
            command: ["/bin/bash", "-c"]
            args:
              - |
                pip install -q requests
                python /app-scripts/download_newsource.py
                python /app-scripts/newsource_to_markdown.py
                cp -r data/newsource_markdown/* /data/newsource_markdown/
            volumeMounts:
            - name: app-scripts
              mountPath: /app-scripts
            - name: downloads
              mountPath: /data
          volumes:
          - name: app-scripts
            configMap:
              name: python-scripts
          - name: downloads
            persistentVolumeClaim:
              claimName: smartfarm-downloads
          restartPolicy: OnFailure
```

#### Step 4: Deploy to k3s

```bash
# Add scripts to ConfigMap
kubectl create configmap python-scripts \
  --from-file=download_newsource.py=scripts/download_newsource.py \
  --from-file=newsource_to_markdown.py=scripts/newsource_to_markdown.py \
  --namespace=smartfarm \
  --dry-run=client -o yaml | kubectl apply -f -

# Deploy CronJob
kubectl apply -f k8s/cronjobs/cronjob-newsource.yaml

# Verify
kubectl get cronjobs -n smartfarm
```

#### Step 5: Configure castai-sync

```bash
# Create Knowledge collection in Open WebUI UI
# Copy collection ID from URL

# Update castai-sync config
kubectl edit configmap castai-sync-config -n smartfarm

# Add new folder mapping:
local_folders:
  mappings:
    - folder_path: "/data/newsource_markdown"
      knowledge_id: "YOUR_COLLECTION_ID"

# Restart castai-sync
kubectl rollout restart deployment/castai-sync -n smartfarm
```

#### Step 6: Test

```bash
# Manually trigger first run
kubectl create job --from=cronjob/newsource-downloader newsource-test -n smartfarm

# Monitor logs
kubectl logs -f job/newsource-test -n smartfarm

# Check castai-sync detected files
kubectl logs -f deployment/castai-sync -n smartfarm

# Verify in Open WebUI
# Go to Workspace → Knowledge → Your Collection
```

### Example Data Sources

SmartFarm includes **two proof-of-concept data sources** to demonstrate the system:

1. **FEGOSA** (Livestock Pricing) - `cronjob-fegosa.yaml`
2. **Consorcio Lechero** (Dairy Reports) - `cronjob-consorcio.yaml`

These are **examples only**. The system is designed to scale to **unlimited sources**. See `docs/AUTOMATED_DATA_INGESTION.md` for complete guide.

### Important Notes

- **Incremental Sync**: castai-sync only uploads new/changed files (SHA256 diffing)
- **No Infrastructure Changes**: Adding sources doesn't require modifying k8s setup
- **Markdown Optimization**: Convert all data to markdown for best RAG performance
- **Collection Mapping**: Each data source should map to its own Knowledge collection
- **Testing**: Always test scripts locally before deploying to k3s
- **Monitoring**: Use `kubectl logs` to monitor CronJobs and castai-sync

### Troubleshooting Data Ingestion

```bash
# Check if CronJob is scheduled
kubectl get cronjobs -n smartfarm

# View recent jobs
kubectl get jobs -n smartfarm --sort-by=.status.startTime

# Check job logs
kubectl logs job/JOB-NAME -n smartfarm

# Check castai-sync is detecting files
kubectl logs -f deployment/castai-sync -n smartfarm

# Verify files exist in PVC
kubectl exec -it deployment/castai-sync -n smartfarm -- ls -lah /data/

# Manually trigger job for testing
kubectl create job --from=cronjob/CRONJOB-NAME test-run -n smartfarm
```

For complete documentation on the automated data ingestion system, see:
- `docs/K3S_DEPLOYMENT.md` - Full k3s deployment guide
- `docs/AUTOMATED_DATA_INGESTION.md` - Detailed data source integration guide
