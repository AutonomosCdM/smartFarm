# CLAUDE.md

Guidance for Claude Code when working with SmartFarm repository.

## ⚠️ Current Reality vs Future Plans

**What EXISTS:**
- ✅ Docker Compose deployment
- ✅ Manual data upload via web UI
- ✅ Production deployment on AWS Lightsail
- ✅ GitHub Actions CI/CD (auto-deploy on push to main)
- ✅ Backup/restore functionality
- ✅ Nginx + SSL

**What DOES NOT exist:**
- ❌ Kubernetes/k3s
- ❌ Automated data ingestion
- ❌ Scheduled downloads
- ❌ API automation

**References to k8s, CronJobs, or automation in docs are FUTURE plans.**

## Project Overview

AI agricultural assistant for Chilean farmers using Open WebUI + Groq API.

**Stack:**
- Frontend/Backend: Open WebUI (ghcr.io/open-webui/open-webui:main)
- AI: Groq API (llama-3.3-70b-versatile primary model)
- Infrastructure: Docker Compose + Nginx + Let's Encrypt + GitHub Actions CI/CD
- Data: Docker volumes (SQLite database at `/var/lib/docker/volumes/open-webui/_data/webui.db`)

**Production:** https://smartfarm.autonomos.dev (54.173.46.123)

## Essential Commands

### Development

```bash
# Start/stop
docker-compose up -d
docker-compose down

# Logs
docker logs -f open-webui
docker logs open-webui --tail 50

# Restart (required after config changes)
docker-compose restart

# Health check
docker inspect open-webui --format='{{.State.Health.Status}}'

# Shell access
docker exec -it open-webui bash
```

**Local URL:** http://localhost:3001

### Production Deployment

**Automatic (CI/CD - recommended):**
```bash
# Just push to main, GitHub Actions handles deployment
git push origin main

# Monitor deployment
gh run watch
gh run list --limit 5
```

**Manual (emergency only):**
```bash
# SSH
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@54.173.46.123

# Deploy/update
cd /opt/smartfarm
sudo ./deployment/deploy.sh

# Setup Nginx + SSL (first time only)
sudo ./deployment/setup-nginx.sh
sudo certbot --nginx -d smartfarm.autonomos.dev --non-interactive --agree-tos --email admin@autonomos.dev --redirect
```

### Data Management

```bash
# Backup (creates ./backups/openwebui-backup-TIMESTAMP.tar.gz)
./scripts/backup.sh

# Restore
./scripts/restore.sh BACKUP_FILENAME

# Update Open WebUI
./scripts/update.sh
```

## Configuration

### Environment Variables (.env)

```bash
GROQ_API_KEY=gsk_xxxxx              # From console.groq.com/keys
GROQ_API_BASE=https://api.groq.com/openai/v1
OPENWEBUI_PORT=3001                  # Host port
DEFAULT_LOCALE=es-ES                 # Spanish interface
```

**CRITICAL:** `.env` is gitignored. Use `.env.example` as template.

### Groq API Setup

1. Add `GROQ_API_KEY` to `.env`
2. Start application: `docker-compose up -d`
3. Create admin account (first user = admin)
4. Admin Panel → Settings → Connections → Add Connection:
   - Type: OpenAI Compatible
   - Name: Groq
   - API Base URL: https://api.groq.com/openai/v1
   - API Key: [your key]
5. Admin Panel → Settings → Models → Set visibility to "Public" for each model

**Recommended models:** `llama-3.3-70b-versatile`, `groq/compound`, `deepseek-r1-distill-llama-70b`

See `docs/MODELS.md` for full catalog.

## CI/CD Pipeline

**Auto-deploy on push to `main`:** GitHub Actions → SSH → Deploy → Health Check → ✅/⚙️

**Monitor:**
```bash
gh run list --repo AutonomosCdM/smartFarm
gh run view <run-id> --log --repo AutonomosCdM/smartFarm
# Or: https://github.com/AutonomosCdM/smartFarm/actions
```

**Manual trigger:**
```bash
gh workflow run deploy-production.yml --repo AutonomosCdM/smartFarm
```

**Emergency rollback:**
```bash
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@54.173.46.123
cd /opt/smartfarm && sudo git reset --hard HEAD~1 && sudo ./deployment/deploy.sh
```

**Troubleshooting:** See `docs/PRODUCTION_DEPLOYMENT.md` and `docs/TROUBLESHOOTING.md`

## Advanced Configuration

### Database Location

SQLite at `/var/lib/docker/volumes/open-webui/_data/webui.db`

**Key tables:**
- `model` - System prompts, filterIds, capabilities
- `config` - RAG templates, global settings
- `chat` - Chat history, per-chat overrides

### System Prompt Configuration

Stored in `model.params.system` JSON field.

**View prompt:**
```bash
docker exec -it open-webui sqlite3 /app/backend/data/webui.db \
  "SELECT json_extract(params, '$.system') FROM model WHERE id='llama-3.3-70b-versatile'"
```

**Update prompt:** See `docs/ADVANCED_CONFIGURATION.md` for Python scripts.

**Prompt hierarchy:**
1. Chat-level (highest priority, per-chat override)
2. Model-level (default for all chats) ← **Use this for production**
3. Playground (testing only)

**Note:** Model Description field is display-only, NOT sent to LLM.

### RAG Template

Controls how knowledge base context is presented to LLM.

**Location:** `config.data.rag.template` (uses `{{CONTEXT}}` and `{{QUERY}}` placeholders)

**View/update:** See `docs/ADVANCED_CONFIGURATION.md`

### Model Filters (filterIds)

Enable/disable functions for models via `model.meta.filterIds`:
- `auto_memory` - Recommended native memory
- `artifacts_v3` - HTML/CSS/JS rendering
- `adaptive_memory_v3` - NOT recommended (causes JSON format issues)

**Current config:** `["auto_memory", "artifacts_v3"]`

### Artifacts and Code Collapsing

Use `<details>` tags in system prompt to collapse code blocks:

```markdown
<details>
<summary>📊 Ver código del gráfico</summary>

```html
<!DOCTYPE html>...
```

</details>

**PROHIBIDO:**
- ✖ NO digas "Para ver el gráfico, haz clic..."
- ✖ NO digas "copia el código"
- ✖ NO des instrucciones sobre cómo ver el gráfico
```

## Repository Structure

```
smartFarm_v5/
├── .env.example              # Template (commit this)
├── .env                      # Secrets (NEVER commit)
├── docker-compose.yml        # Main service
├── README.md                 # User docs
├── CLAUDE.md                 # This file
│
├── .github/workflows/        # GitHub Actions CI/CD
│   └── deploy-production.yml
│
├── deployment/               # Production scripts
│   ├── deploy.sh            # Auto-deployment (CI/CD compatible)
│   ├── setup-nginx.sh
│   └── nginx*.conf
│
├── scripts/                  # Management
│   ├── backup.sh
│   ├── restore.sh
│   └── update.sh
│
├── config/                   # User configs (gitignored)
├── data/                     # User data (gitignored)
│
└── docs/
    ├── INSTALLATION.md
    ├── GROQ_CONFIGURATION.md
    ├── PRODUCTION_DEPLOYMENT.md
    ├── MODELS.md
    ├── TROUBLESHOOTING.md
    └── ADVANCED_CONFIGURATION.md  # Database scripts
```

## Key Gotchas

### User Access
- First user = admin (secure before public)
- Models are **private by default** - admin must set to "Public"

### API Configuration
- Two-step setup: `.env` file + Admin Panel connection
- Groq doesn't support embeddings (use native memory instead)

### Infrastructure
- WebSocket required (Nginx config includes upgrade headers)
- Container port 8080 → Host port 3001
- SSL auto-renews via certbot cron

### Data Safety
- Volume persists across restarts/updates
- `docker-compose down -v` **DELETES ALL DATA**
- Always backup before major changes

### Language
- `DEFAULT_LOCALE=es-ES` affects new users only
- Existing users keep their language preference

## Troubleshooting Quick Reference

### Container Issues
```bash
docker logs open-webui                        # Check errors
docker-compose down && docker-compose up -d   # Recreate
docker inspect open-webui --format='{{.State.Health.Status}}'
```

### Port Conflict
```bash
lsof -i :3001                  # Find process
kill -9 <PID>                  # Kill it
# OR change OPENWEBUI_PORT in .env
```

### No Models Found
Admin Panel → Settings → Models → Set visibility to "Public"

### API Connection Issues
```bash
cat .env | grep GROQ_API_KEY   # Verify key
curl https://api.groq.com/openai/v1/models -H "Authorization: Bearer YOUR_KEY"
```

### Unwanted JSON Response Format
**Cause:** RAG template has JSON format instructions.
**Fix:** Remove "FORMATO" section from `config.data.rag.template`
**Details:** See `docs/ADVANCED_CONFIGURATION.md`

### Code Blocks Not Collapsed
**Fix:** Add `<details>` tags to system prompt
**Details:** See `docs/ADVANCED_CONFIGURATION.md` → Artifacts section

### System Prompt Not Applying
**Common causes:**
- Chat-level override present (check Chat Settings)
- Edited Model Description instead of System Prompt
- Forgot to restart container: `docker-compose restart`

### Database Timestamp Errors
**Critical:** Different tables require different formats:
- `model` table: INTEGER (Unix timestamp)
- `config` table: STRING (ISO format)

**Errors:**
- `TypeError: fromisoformat` → Used integer for config table
- `ValidationError: should be integer` → Used string for model table

**Fix:** See `docs/ADVANCED_CONFIGURATION.md` → Timestamp Formats

### CI/CD Deployment Failures
```bash
# Check workflow status
gh run view --log

# SSH to server and check
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@54.173.46.123
docker ps
docker logs open-webui
```

**Details:** See `docs/TROUBLESHOOTING.md` → CI/CD Deployment Issues

### Complete Reset (⚠️ destroys data)
```bash
docker-compose down -v
docker rmi ghcr.io/open-webui/open-webui:main
docker-compose up -d
```

**For detailed troubleshooting:** See `docs/TROUBLESHOOTING.md`

## Knowledge Base (RAG)

**Current method:** Manual upload via web UI

**Workflow:**
1. Workspace → Knowledge → Create collection
2. Upload files (markdown recommended)
3. Select knowledge base in chat

**Limitations:** Manual, one file at a time, no automation

**Future:** See `docs/roadmap/AUTOMATION_ROADMAP.md`

## Production Notes

**URLs:**
- Production: https://smartfarm.autonomos.dev
- Server: 54.173.46.123 (AWS Lightsail)
- SSH: `ssh -i ~/Downloads/smartfarm-key.pem ubuntu@54.173.46.123`

**Deployment flow:**
1. Push to `main` branch
2. GitHub Actions deploys automatically
3. Health checks verify deployment
4. Automatic rollback if fails
5. Verify: https://smartfarm.autonomos.dev

**Security:**
- API keys gitignored + GitHub secret scanning enabled
- SSL via Let's Encrypt (auto-renewal)
- Firewall: ports 22, 80, 443 open
- WebSocket upgrade headers in Nginx
- GitHub Secrets: SSH_PRIVATE_KEY, SSH_HOST, SSH_USER, DEPLOY_PATH

## Development Workflow

This is a configuration project (no application code).

**Making changes:**
1. Edit `.env.example` (committed template)
2. Copy to `.env` and add secrets (never commit `.env`)
3. Test locally: `docker-compose down && docker-compose up -d`
4. Verify: http://localhost:3001
5. Update docs if architecture changes
6. Push to `main` - CI/CD auto-deploys

**Documentation:**
- Update `CLAUDE.md` for architecture changes
- Update `docs/` for user-facing changes
- Archive outdated docs to `docs/archive/`

## References

- **Groq Models:** `docs/MODELS.md`
- **Installation:** `docs/INSTALLATION.md`
- **Groq Setup:** `docs/GROQ_CONFIGURATION.md`
- **Production Deploy:** `docs/PRODUCTION_DEPLOYMENT.md`
- **Troubleshooting:** `docs/TROUBLESHOOTING.md`
- **Advanced Config:** `docs/ADVANCED_CONFIGURATION.md` (database scripts)
- **Future Plans:** `docs/roadmap/AUTOMATION_ROADMAP.md`
- **Git Repo:** https://github.com/AutonomosCdM/smartFarm.git
