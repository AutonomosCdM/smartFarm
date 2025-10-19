# SMARTFARM CODING STANDARDS

## FILE SIZE LIMITS

**CRITICAL:** Maximum file size is **300 lines** (strictly enforced)

**When approaching limit:**
1. Split into logical modules
2. Extract reusable functions
3. Move documentation to separate files
4. Create utility/helper files

**Exception:** Auto-generated files (e.g., package-lock.json)

## DOCUMENTATION STANDARDS

### CLAUDE.md Files
**Purpose:** Instructions for Claude Code agents

**Structure:**
- Clear headings with ##
- Code blocks with language tags
- Examples for complex operations
- Links to detailed docs/

**Update triggers:**
- Architecture changes
- New commands added
- Configuration changes
- Deployment process updates

### docs/ Directory
**Purpose:** User-facing documentation

**Required files:**
- `README.md` - Getting started
- `INSTALLATION.md` - Setup guide
- `TROUBLESHOOTING.md` - Common issues
- `ADVANCED_CONFIGURATION.md` - Database scripts

**Optional files:**
- `MODELS.md` - AI model catalog
- `EXCEL_PROCESSING.md` - Tool details
- `roadmap/*.md` - Future plans

**Writing style:**
- Step-by-step instructions
- Code examples for every command
- Expected output shown
- Troubleshooting sections

### Code Comments
**Bash scripts:**
```bash
#!/bin/bash
# Brief description of script purpose
# Usage: ./script.sh [args]

# Explain WHY, not WHAT (code shows WHAT)
function deploy() {
  # Restart required to load new env vars
  docker-compose restart
}
```

**Configuration files:**
```yaml
# docker-compose.yml
services:
  open-webui:
    # Must map to host port 3001 (nginx expects this)
    ports:
      - "3001:8080"
```

## BASH SCRIPTING STANDARDS

### Script Structure
```bash
#!/bin/bash
set -e  # Exit on error
set -u  # Error on undefined variables

# Constants at top
readonly BACKUP_DIR="./backups"
readonly TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Functions before main logic
function backup_data() {
  # Implementation
}

# Main execution
main() {
  backup_data
  echo "✅ Backup complete"
}

main "$@"
```

### Error Handling
```bash
# Check prerequisites
if [ ! -f ".env" ]; then
  echo "❌ .env file not found"
  exit 1
fi

# Validate commands exist
if ! command -v docker &> /dev/null; then
  echo "❌ Docker not installed"
  exit 1
fi
```

### Output Formatting
```bash
echo "✅ Success message"
echo "❌ Error message"
echo "⚠️ Warning message"
echo "🔄 In progress..."
```

## DOCKER STANDARDS

### Compose Files
```yaml
version: '3.8'

services:
  service-name:
    image: namespace/image:tag  # Never use :latest
    container_name: explicit-name
    environment:
      - KEY=${KEY}  # Prefer env vars over hardcoded
    volumes:
      - volume-name:/path  # Named volumes, not bind mounts
    restart: unless-stopped  # Not 'always'
    healthcheck:  # Always include
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Volume Management
```bash
# NEVER use -v flag in production
docker-compose down  # Preserves volumes
docker-compose down -v  # ⚠️ DELETES DATA - document clearly
```

## ENVIRONMENT VARIABLE STANDARDS

### .env File Format
```bash
# API Keys (REQUIRED)
GROQ_API_KEY=gsk_xxxxx
OPENAI_API_KEY=sk-xxxxx

# Configuration (OPTIONAL)
OPENWEBUI_PORT=3001
DEFAULT_LOCALE=es-ES

# Comments explain purpose, not syntax
# GROQ_API_KEY: Used for chat + SQL generation (get from console.groq.com/keys)
```

### .env.example Template
```bash
# Copy this to .env and add your keys
GROQ_API_KEY=your_groq_key_here
OPENAI_API_KEY=your_openai_key_here

# Optional
OPENWEBUI_PORT=3001
DEFAULT_LOCALE=es-ES
```

**Rules:**
- Never commit `.env`
- Always commit `.env.example`
- Use placeholder values in example
- Document where to get keys

## GIT STANDARDS

### Commit Messages
```bash
# Good
git commit -m "Add health check to docker-compose"
git commit -m "Fix: SSL certificate renewal script"
git commit -m "Update: Groq API base URL in docs"

# Bad
git commit -m "fix stuff"
git commit -m "updates"
git commit -m "asdf"
```

**Format:** `[Type]: Brief description`

**Types:**
- `Add:` New feature/file
- `Fix:` Bug fix
- `Update:` Modify existing
- `Remove:` Delete feature/file
- `Docs:` Documentation only

### .gitignore
```
# Secrets
.env
*.pem
*.key

# User data
config/
data/
backups/

# System
.DS_Store
__pycache__/
*.pyc
```

## DEPLOYMENT STANDARDS

### Deployment Scripts
**Location:** `deployment/`

**Requirements:**
- Idempotent (safe to run multiple times)
- Exit codes (0 = success, 1 = failure)
- Logging to stdout/stderr
- Health checks after deployment

**Example:**
```bash
#!/bin/bash
set -e

echo "🔄 Deploying SmartFarm..."

# Pull latest
git pull origin main

# Update containers
docker-compose pull
docker-compose up -d

# Health check
sleep 10
if curl -f http://localhost:3001/health; then
  echo "✅ Deployment successful"
  exit 0
else
  echo "❌ Health check failed"
  # Rollback logic here
  exit 1
fi
```

### CI/CD Standards
**File:** `.github/workflows/deploy-production.yml`

**Requirements:**
- Trigger on main branch only
- Run tests before deploy (if tests exist)
- SSH to server securely
- Health check after deploy
- Rollback on failure
- Notify on completion

## CONFIGURATION STANDARDS

### Nginx
```nginx
server {
  listen 80;
  server_name smartfarm.autonomos.dev;

  # WebSocket support (REQUIRED for Open WebUI)
  location / {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
  }
}
```

### SSL
```bash
# Auto-renew certbot
0 3 * * * certbot renew --quiet
```

## SECURITY STANDARDS

### Secrets
- Never commit API keys
- Use GitHub Secrets for CI/CD (or self-hosted runner)
- Enable secret scanning
- Rotate keys quarterly

**CRITICAL - API Key Rotation Requires 2 Steps:**
```bash
# 1. Update .env file
nano .env  # Update GROQ_API_KEY and/or OPENAI_API_KEY

# 2. Update database config (DO NOT SKIP!)
docker exec -it open-webui python3 -c "
# Update config.data['openai']['api_keys'] with new key
# See docs/security/SECRETS_MANAGEMENT.md for full script
"

# 3. Restart container
docker-compose restart open-webui
```

**Why 2 locations?**
- `.env` = Used by tools (Excel processing, etc.)
- Database `config` table = Used by chat models
- Forgetting database update → "no modelo disponible" error

### SSH
- Use key-based auth only
- Never commit private keys
- Restrict key permissions: `chmod 600 key.pem`

### Firewall
- Minimum open ports (22, 80, 443)
- fail2ban active (SSH brute-force protection)
- CloudWatch alarms configured
- Document all open ports
- Regular security updates

## TESTING STANDARDS

### Manual Testing Checklist
```bash
# Local
docker-compose up -d
curl http://localhost:3001/health
# Test login
# Test chat
# Test file upload

# Production (after deploy)
curl https://smartfarm.autonomos.dev/health
# Test login
# Verify SSL cert
```

### Automated Testing (Future)
- Unit tests for scripts
- Integration tests for deployment
- Health check monitoring

## ERROR HANDLING STANDARDS

### User-Facing Errors
```bash
echo "❌ Error: .env file not found"
echo "💡 Solution: Copy .env.example to .env and add your API keys"
exit 1
```

### Logging
```bash
# Development
docker logs -f open-webui

# Production
docker logs open-webui --tail 100 > /tmp/debug.log
```

## BACKUP STANDARDS

### Frequency
- Before major changes
- Before updates
- Weekly automated (future)

### Format
```
backups/
  openwebui-backup-20241017_103000.tar.gz
  openwebui-backup-20241016_143000.tar.gz
```

**Naming:** `openwebui-backup-YYYYMMDD_HHMMSS.tar.gz`

### Retention
- Keep last 7 backups
- Archive monthly backups
- Document restore process

## DOCUMENTATION UPDATE TRIGGERS

**Update CLAUDE.md when:**
- New commands added
- Configuration changes
- Deployment process changes
- Architecture changes

**Update docs/ when:**
- User-facing features change
- Installation process changes
- Troubleshooting steps discovered
- API requirements change

**Archive old docs when:**
- Features removed
- Process superseded
- Information obsolete

**Location:** `docs/archive/YYYY-MM-DD-filename.md`

## CODE REVIEW CHECKLIST

Before committing:
- [ ] File under 300 lines?
- [ ] Documentation updated?
- [ ] No secrets in code?
- [ ] Error handling present?
- [ ] Comments explain WHY?
- [ ] Tested locally?
- [ ] .env.example updated if needed?

Before deploying:
- [ ] Backup created?
- [ ] CI/CD passing?
- [ ] Health check defined?
- [ ] Rollback plan ready?
- [ ] Monitoring in place?
