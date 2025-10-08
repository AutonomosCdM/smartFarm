# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SmartFarm is a Docker-based AI agricultural assistant that uses Open WebUI as the frontend interface and Groq API for ultra-fast AI model inference (500-800 tokens/second). The application is designed for both local development and production deployment on AWS Lightsail with HTTPS/SSL support.

**Technology Stack:**
- **Frontend**: Open WebUI (Docker container)
- **AI Backend**: Groq API (OpenAI-compatible)
- **Deployment**: Docker + Docker Compose + Nginx reverse proxy
- **Production**: AWS Lightsail with Let's Encrypt SSL

## Core Commands

### Local Development

```bash
# Start the application
docker-compose up -d

# View logs (real-time)
docker logs -f open-webui

# Stop the application
docker-compose down

# Restart the application
docker-compose restart

# Check container status
docker ps --filter "name=open-webui"
```

### Production Deployment

```bash
# SSH to production server
ssh root@34.200.33.195

# Deploy/update SmartFarm (run on server)
cd /opt/smartfarm
./deployment/deploy.sh

# Configure Nginx reverse proxy
./deployment/setup-nginx.sh

# Install SSL certificate
sudo certbot --nginx -d smartfarm.autonomos.dev --non-interactive --agree-tos --email admin@autonomos.dev --redirect
```

### Data Management

```bash
# Backup Open WebUI data
./scripts/backup.sh

# Restore from backup
./scripts/restore.sh BACKUP_FILENAME

# Update to latest version
./scripts/update.sh
```

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

SmartFarm uses Groq for AI model access. Configuration happens in TWO places:

1. **Environment file** (`.env`): Store the API key
2. **Open WebUI interface** (Settings → Connections): Configure the API connection

### Setup Process

After starting the application:
1. Navigate to http://localhost:3001
2. Create admin account (first user becomes admin)
3. Go to Settings → Connections
4. Add OpenAI-compatible connection:
   - API Base URL: `https://api.groq.com/openai/v1`
   - API Key: From `.env` file

### Recommended Models

- `llama-3.3-70b-versatile` - Best balance for general queries (131K context)
- `groq/compound` - Groq-optimized performance (131K context)
- `deepseek-r1-distill-llama-70b` - Advanced reasoning (131K context)
- `llama-3.1-8b-instant` - Fast responses for simple tasks (131K context)
- `whisper-large-v3-turbo` - Audio transcription
- `moonshotai/kimi-k2-instruct` - Ultra-long context (262K tokens)

See `docs/MODELS.md` for complete model catalog.

## Deployment Scripts

### `deployment/deploy.sh`

Automated production deployment script that:
1. Installs Docker/Docker Compose/Git if missing
2. Backs up existing installation to `/opt/smartfarm-backup-TIMESTAMP`
3. Clones/updates repository to `/opt/smartfarm`
4. Creates `.env` from template (prompts for manual API key configuration)
5. Starts services with `docker-compose up -d`

**Must run as root**: `sudo ./deployment/deploy.sh`

### `deployment/setup-nginx.sh`

Configures Nginx reverse proxy:
1. Installs Nginx if needed
2. Creates configuration in `/etc/nginx/sites-available/smartfarm`
3. Enables WebSocket support (required for Open WebUI)
4. Configures proper headers for proxying
5. Reloads Nginx

### `scripts/backup.sh`

Creates timestamped backup of Open WebUI data volume:
- Output: `./backups/openwebui-backup-YYYYMMDD_HHMMSS.tar.gz`
- Uses Alpine container to tar the volume
- Shows backup size and lists recent backups

### `scripts/restore.sh`

Restores Open WebUI data from backup file.

### `scripts/update.sh`

Updates to latest version:
1. Pulls latest Docker image
2. Stops container
3. Removes old container
4. Starts new container with same volume (data persists)

## File Structure

```
smartFarm_v5/
├── .env.example              # Environment template (commit this)
├── .env                      # Actual config with API keys (NEVER commit)
├── docker-compose.yml        # Docker service definition
├── deployment/               # Production deployment automation
│   ├── deploy.sh            # Main deployment script
│   ├── setup-nginx.sh       # Nginx configuration
│   ├── nginx.conf           # Nginx config (HTTP only)
│   └── nginx-ssl.conf       # Nginx config (HTTPS with SSL)
├── scripts/                  # Operational scripts
│   ├── backup.sh            # Backup data volume
│   ├── restore.sh           # Restore from backup
│   └── update.sh            # Update to latest version
└── docs/                     # Documentation
    ├── INSTALLATION.md       # Installation guide
    ├── GROQ_CONFIGURATION.md # Groq setup instructions
    ├── PRODUCTION_DEPLOYMENT.md # Detailed production guide
    ├── MODELS.md             # Available AI models
    └── TROUBLESHOOTING.md    # Common issues
```

## Security Considerations

1. **API Key Protection**: `.env` is gitignored and should never be committed
2. **GitHub Secret Scanning**: Enabled to detect accidentally committed keys
3. **SSL/HTTPS**: Production requires Let's Encrypt certificate
4. **Firewall**: Production requires ports 80, 443, and optionally 22 (SSH)

## Development Workflow

1. **Local testing**: Use `docker-compose up -d` to test changes
2. **Configuration changes**: Edit `.env.example`, never commit `.env`
3. **Documentation updates**: Keep docs/ in sync with functionality
4. **Production deployment**: Push to main branch, then run `deploy.sh` on server

## Production URLs

- **Production Instance**: https://smartfarm.autonomos.dev
- **Server IP**: 34.200.33.195 (AWS Lightsail)
- **Local Development**: http://localhost:3001

## Troubleshooting Quick Reference

### Container won't start
```bash
docker logs open-webui
docker-compose down && docker-compose up -d
```

### Port conflict (3001 in use)
```bash
lsof -i :3001  # Find what's using the port
# Change OPENWEBUI_PORT in .env
```

### API connection issues
```bash
# Verify API key
cat .env | grep GROQ_API_KEY

# Test API key directly
curl https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Nginx issues
```bash
sudo nginx -t                    # Test configuration
sudo systemctl restart nginx     # Restart Nginx
sudo tail -f /var/log/nginx/error.log  # Check logs
```

## Data Persistence

All user data (conversations, settings, models) is stored in the `open-webui` Docker volume:
- **Volume Location**: Docker-managed (use `docker volume inspect open-webui`)
- **Backup Strategy**: Use `scripts/backup.sh` regularly
- **Updates**: Volume persists across container updates

## Important Notes

- **First user becomes admin**: When accessing fresh installation, first signup creates admin account
- **API configuration required**: Groq API must be configured via web UI, not just `.env`
- **WebSocket support**: Required for real-time Open WebUI features; Nginx config includes this
- **SSL auto-renewal**: Certbot configures cron job for automatic certificate renewal
