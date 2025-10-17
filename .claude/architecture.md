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
Nginx (Port 80/443) + Let's Encrypt SSL
    ↓
Open WebUI Container (Port 8080 → 3001) ←→ Redis Container (Port 6379)
    ↓                                         ↓
Docker Volume (SQLite)                   Docker Volume (Cache)
```

**Server:** AWS Lightsail (98.87.30.163 - Static IP)
**Domain:** smartfarm.autonomos.dev
**CI/CD:** GitHub Actions auto-deploy on push to main

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

**Cache Performance:**
- Hit rate target: 90%+
- Cached response: 0.1-0.3s
- Uncached response: 2-5s
- Cost reduction: 90% (with 90% hit rate)
- Memory: 256 MB (LRU eviction)

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
**Two-step setup:**
1. Add keys to `.env`
2. Admin Panel → Connections → Add Groq connection

### Model Filters
**Current config:** `["auto_memory", "artifacts_v3"]`

- `auto_memory` ✅ Recommended native memory
- `artifacts_v3` ✅ HTML/CSS/JS rendering
- `adaptive_memory_v3` ❌ Causes JSON format issues

## CI/CD PIPELINE

### Automated Deployment Flow
```
git push origin main
    ↓
GitHub Actions triggered
    ↓
SSH to server (98.87.30.163)
    ↓
Pull latest code
    ↓
Run deployment/deploy.sh
    ↓
Health check
    ↓
✅ Success or ⚙️ Rollback
```

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
- GitHub secret scanning enabled
- SSH key for deployment (GitHub Secrets)

### SSL/TLS
- Let's Encrypt certificates
- Auto-renewal via certbot cron
- Nginx handles HTTPS termination

### Firewall
- Ports: 22 (SSH), 80 (HTTP), 443 (HTTPS)
- WebSocket upgrade headers in Nginx

## DATA PERSISTENCE

### Backup Strategy
```bash
./scripts/backup.sh    # Creates ./backups/openwebui-backup-TIMESTAMP.tar.gz
./scripts/restore.sh BACKUP_FILENAME
```

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

### What EXISTS
- ✅ Docker Compose deployment
- ✅ Manual data upload via UI
- ✅ Production on AWS Lightsail
- ✅ GitHub Actions CI/CD
- ✅ Backup/restore
- ✅ Nginx + SSL

### What DOES NOT Exist
- ❌ Kubernetes/k3s
- ❌ Automated data ingestion
- ❌ Scheduled downloads
- ❌ API automation

**Any references to k8s or automation in docs are FUTURE plans.**

## SCALABILITY CONSIDERATIONS

**Current:** Single container, single server

**Future scaling options:**
- Load balancer + multiple containers
- Managed database (move from SQLite)
- CDN for static assets
- Kubernetes for orchestration

**See:** `.claude/roadmap.md` for detailed plans
