# SMARTFARM ARCHITECTURE

## SYSTEM OVERVIEW

**SmartFarm** is an AI agricultural assistant for Chilean farmers.

**Core Components:**
- **Frontend/Backend:** Open WebUI (containerized)
- **AI Engine:** Groq API (llama-3.3-70b-versatile)
- **Cache:** Redis 7 (query cache, 90% hit rate target)
- **Infrastructure:** Docker Compose + Nginx + SSL
- **Deployment:** GitHub Actions CI/CD
- **Data:** SQLite (Docker volume persistence)

## DEPLOYMENT ARCHITECTURE

### Production Environment
```
Internet
    ↓
Nginx (Port 80/443) + Let's Encrypt SSL + fail2ban
    ↓
Open WebUI Container (Port 8080 → 3001) ←→ Redis Container (Port 6379)
    ↓                                         ↓
SQLite (Docker Volume)                   Redis Cache (256MB LRU)
    ↓
DuckDB (/tmp - Excel processing)
    ↓
CloudWatch Agent → AWS CloudWatch (8 alarms, $0/month)
```

**Server:** AWS Lightsail 2GB + 2GB Swap (98.87.30.163 - Static IP)
**Domain:** smartfarm.autonomos.dev
**CI/CD:** GitHub Actions self-hosted runner (on production server)
**Monitoring:** CloudWatch + fail2ban + memory alerts
**Backups:** Automated S3 backups (7-4-6 retention policy)

### Local Development
```
Docker Compose
    ↓
Open WebUI Container (Port 3001)
    ↓
Local Volume
```

**URL:** http://localhost:3001

## DATA ARCHITECTURE

### Database Structure
**SQLite Location:** `/var/lib/docker/volumes/open-webui/_data/webui.db`

**Key Tables:**
- `model` - System prompts, filterIds, capabilities
- `config` - RAG templates, global settings
- `chat` - Chat history, per-chat overrides

### Prompt Hierarchy
1. **Chat-level** (highest priority, per-chat override)
2. **Model-level** (default for all chats) ← Production uses this
3. **Playground** (testing only)

### Excel Processing with Redis Cache
```
User uploads Excel → Open WebUI
    ↓
sql_cache_tool generates cache key: SHA256(file_hash + query + model)
    ↓
Check Redis cache
    ↓
[HIT] Return cached result (0.1-0.3s, 10-50x faster!)
    ↓
[MISS] Import to DuckDB (/tmp/smartfarm_persistent.duckdb)
    ↓
Generate SQL via Groq (llama-3.3-70b-versatile)
    ↓
Create embeddings via OpenAI (text-embedding-3-small)
    ↓
Execute query → Store in Redis (TTL: 1h) → Return results (2-5s)
```

**Why two APIs?**
- Groq: Fast SQL generation (500-800 tokens/sec)
- OpenAI: Embeddings (LlamaIndex dependency, no Groq support)

**Cache Performance (Actual Production Metrics):**
- Hit rate: 90%+ achieved
- Cached response: 1.90ms average (154x faster than uncached)
- Uncached response: 294ms average
- Cost reduction: 90% API cost savings ($15/mo → $1.50/mo)
- Memory: 256 MB (LRU eviction)
- Query improvement: File queries 222x faster (20.86ms → 0.094ms)

## CONFIGURATION MANAGEMENT

### Environment Variables
**Location:** `.env` (gitignored, use `.env.example` as template)

**Required:**
- `GROQ_API_KEY` - Chat + SQL query generation
- `OPENAI_API_KEY` - Excel tool embeddings

**Optional:**
- `OPENWEBUI_PORT` - Default 3001
- `DEFAULT_LOCALE` - Default es-ES
- `REDIS_HOST` - Default redis (container name)
- `REDIS_PORT` - Default 6379

### API Configuration
**CRITICAL - API key rotation requires 2 locations:**
1. Add keys to `.env` file (for tools like Excel processing)
2. Update database `config` table (for chat models)

**To rotate API keys:**
```bash
# 1. Update .env file
nano .env  # Update GROQ_API_KEY and/or OPENAI_API_KEY

# 2. Update database config (CRITICAL - do not skip!)
docker exec -it open-webui python3 -c "
from apps.webui.models.auths import Auths
from apps.webui.internal.db import Session, get_db
# Update config.data['openai']['api_keys'] with new key
"

# 3. Restart container
docker-compose restart open-webui
```

**Lesson learned:** Forgetting database update causes "no modelo disponible" error

### Model Filters
**Current config:** `["auto_memory", "artifacts_v3"]`

- `auto_memory` ✅ Recommended native memory
- `artifacts_v3` ✅ HTML/CSS/JS rendering
- `adaptive_memory_v3` ❌ Causes JSON format issues

## CI/CD PIPELINE

### Self-Hosted Runner Architecture
**Production uses a self-hosted GitHub Actions runner installed on the server**

```
git push origin main
    ↓
GitHub Actions triggered
    ↓
Self-hosted runner (ON production server) executes:
    ↓
cd /opt/smartfarm
    ↓
sudo git pull origin main
    ↓
sudo ./deployment/deploy.sh
    ↓
Health check (https://smartfarm.autonomos.dev)
    ↓
✅ Success or ⚙️ Rollback (git reset --hard HEAD~1)
```

**Why self-hosted runner (not SSH)?**
- No SSH key management in GitHub Secrets
- Runner already authenticated on server
- Faster deployment (no network latency)
- Simpler configuration

**Monitor:**
```bash
gh run list --repo AutonomosCdM/smartFarm
gh run watch
```

**Emergency rollback:**
```bash
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163
cd /opt/smartfarm && sudo git reset --hard HEAD~1 && sudo ./deployment/deploy.sh
```

## SECURITY ARCHITECTURE

### Secrets Management
- API keys in `.env` (gitignored)
- Database config stores API keys (must update on rotation!)
- GitHub secret scanning enabled
- Regular key rotation (quarterly recommended)

### SSL/TLS
- Let's Encrypt certificates
- Auto-renewal via certbot cron
- Nginx handles HTTPS termination

### Network Security
- **fail2ban:** Protects against brute-force SSH attacks
  - 5 failed attempts = 10 minute ban
  - Logs: `/var/log/fail2ban.log`
- **Firewall:** UFW configured
  - Ports: 22 (SSH), 80 (HTTP), 443 (HTTPS)
  - WebSocket upgrade headers in Nginx
- **CloudWatch Monitoring:** 8 alarms for security events
  - High memory/CPU usage
  - Swap usage spikes
  - Container health failures

## DATA PERSISTENCE

### Backup Strategy
**Automated S3 Backups (Production-Ready):**
```bash
# Manual backup
./scripts/automate-backups.sh

# Automated daily backups at 2 AM UTC (via cron)
crontab -l | grep smartfarm

# Test restore
./scripts/test-restore.sh

# Restore from backup
./scripts/restore-from-backup.sh
```

**Backup Details:**
- **Retention:** 7-4-6 policy (7 daily, 4 weekly, 6 monthly)
- **Storage:** S3 with lifecycle policies
- **Cost:** $0.25/month (S3) or $0 (local only)
- **RTO:** 5-10 minutes (data corruption)
- **RPO:** < 24 hours
- **Testing:** Weekly automated restore tests

**Critical:** `docker-compose down -v` **DELETES ALL DATA**

### Update Strategy
```bash
./scripts/update.sh    # Pulls latest Open WebUI image
```

## KNOWLEDGE BASE (RAG)

**Current:** Manual upload via web UI

**Workflow:**
1. Workspace → Knowledge → Create collection
2. Upload files (markdown recommended)
3. Select knowledge base in chat

**Limitations:** No automation, one file at a time

**Future:** See `.claude/roadmap.md`

## DESIGN CONSTRAINTS

### What EXISTS (Production-Ready)
- ✅ Docker Compose deployment with Redis cache
- ✅ Self-hosted GitHub Actions runner (CI/CD)
- ✅ Production on AWS Lightsail 2GB + 2GB Swap
- ✅ CloudWatch monitoring with 8 alarms ($0/month)
- ✅ Automated S3 backups (7-4-6 retention)
- ✅ Nginx + SSL + fail2ban
- ✅ Database optimization (154x faster queries)
- ✅ Manual data upload via UI

### What DOES NOT Exist
- ❌ Kubernetes/k3s
- ❌ Automated data ingestion from external sources
- ❌ Scheduled knowledge base downloads
- ❌ External API integrations (e.g., LiteFarm)

**Any references to k8s or external integrations are FUTURE plans.**

## SCALABILITY CONSIDERATIONS

**Current:** Single container, single server

**Future scaling options:**
- Load balancer + multiple containers
- Managed database (move from SQLite)
- CDN for static assets
- Kubernetes for orchestration

**See:** `.claude/roadmap.md` for detailed plans
