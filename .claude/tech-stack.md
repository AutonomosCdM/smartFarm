# SMARTFARM TECH STACK

## PRODUCTION STACK

### Application Layer
- **Open WebUI** `ghcr.io/open-webui/open-webui:main`
  - All-in-one chat interface
  - Built-in RAG support
  - Model management
  - User authentication

### AI/ML Services
- **Groq API** (Primary)
  - Model: `llama-3.3-70b-versatile`
  - Speed: 500-800 tokens/sec
  - Use: Chat + SQL query generation

- **OpenAI API** (Secondary)
  - Model: `text-embedding-3-small`
  - Use: Excel tool embeddings (LlamaIndex requirement)

**Recommended Groq models:**
- `llama-3.3-70b-versatile` (primary)
- `groq/compound` (advanced reasoning)
- `deepseek-r1-distill-llama-70b` (alternative)

See `docs/MODELS.md` for full catalog.

### Infrastructure
- **Docker** `20.10+`
  - Container runtime
  - Volume management

- **Docker Compose** `v2+`
  - Service orchestration
  - Environment management
  - Multi-container networking

- **Redis** `7-alpine`
  - Query cache (256MB LRU)
  - 90%+ hit rate achieved
  - 154x query speedup
  - $13.50/month API cost savings

- **Nginx** `1.18+`
  - Reverse proxy
  - SSL termination
  - WebSocket support

- **Let's Encrypt**
  - Free SSL certificates
  - Auto-renewal via certbot

- **fail2ban**
  - SSH brute-force protection
  - 5 failed attempts = 10 min ban
  - Active in production

- **AWS CloudWatch Agent**
  - Memory/CPU/Swap monitoring
  - 8 configured alarms
  - 5-minute metric intervals
  - $0/month (free tier)

### Database
- **SQLite** (embedded)
  - Location: `/var/lib/docker/volumes/open-webui/_data/webui.db`
  - No separate DB server needed
  - Optimized with indexes (154x faster queries)
  - Stores API keys in `config` table (must update on rotation!)

- **DuckDB** (ephemeral)
  - Location: `/tmp/smartfarm_persistent.duckdb`
  - Excel data analysis
  - In-memory SQL queries
  - Cached results in Redis

## DEVELOPMENT TOOLS

### Version Control
- **Git** - Source control
- **GitHub** - Repository hosting
- **GitHub Actions** - CI/CD pipeline

### SSH Access
- **SSH Key:** `~/Downloads/smartfarm-key.pem`
- **Server:** `ubuntu@98.87.30.163`
- Static IP (never changes)

### Monitoring
- **GitHub CLI** (`gh`)
  - Workflow monitoring
  - Run management
  - Log viewing

- **AWS CloudWatch**
  - Memory/CPU/Swap metrics
  - 8 configured alarms
  - Free tier (no cost)

### Scripting
- **Bash** - Deployment & Operations automation
  - `deployment/deploy.sh` - Production deployment
  - `deployment/setup-nginx.sh` - Nginx + SSL setup
  - `scripts/automate-backups.sh` - Daily S3 backups
  - `scripts/restore-from-backup.sh` - Interactive restore
  - `scripts/test-restore.sh` - Weekly restore testing
  - `scripts/setup-s3-backups.sh` - S3 configuration
  - `scripts/monitor-memory.sh` - Memory monitoring
  - `scripts/optimize-database.sh` - Database optimization
  - `scripts/security-status.sh` - Security audit

## EXCEL PROCESSING DEPENDENCIES

### Python Libraries (in container)
- **llama-index-llms-groq** - Groq LLM integration
- **llama-index-embeddings-openai** - OpenAI embeddings
- **LlamaIndex** - SQL query engine framework
- **DuckDB** - In-memory database

### Tool Architecture
```python
# sql_tool workflow:
1. File upload detection
2. Import Excel → DuckDB
3. Generate SQL via Groq
4. Create embeddings via OpenAI
5. Execute query
6. Return results
```

## DEPLOYMENT INFRASTRUCTURE

### Cloud Provider
- **AWS Lightsail**
  - Instance: 2GB RAM + 2GB Swap
  - OS: Ubuntu 20.04 LTS
  - IP: 98.87.30.163 (Static)
  - Firewall: UFW + fail2ban
  - Ports: 22, 80, 443

### Domain Management
- **Domain:** smartfarm.autonomos.dev
- **DNS:** Points to 98.87.30.163
- **SSL:** Let's Encrypt certificate (auto-renewal)

### CI/CD
- **GitHub Actions** (self-hosted runner)
  - Runner installed on production server
  - Auto-deploy on push to main
  - Health checks (https://smartfarm.autonomos.dev)
  - Automatic rollback on failure
  - No SSH keys needed (runner is local)

**Self-Hosted Runner:**
- Location: `/opt/actions-runner`
- Service: `actions.runner.AutonomosCdM-smartFarm.smartfarm-production.service`
- Faster deployment (no network latency)
- Simpler configuration (no GitHub Secrets)

## CONFIGURATION FILES

### Docker
- `docker-compose.yml` - Service definition
- `.env` - Secrets (gitignored)
- `.env.example` - Template (committed)

### Nginx
- `deployment/nginx.conf` - HTTP config
- `deployment/nginx-ssl.conf` - HTTPS config

### GitHub Actions
- `.github/workflows/deploy-production.yml` - CI/CD pipeline

## DEVELOPMENT ENVIRONMENT

### Local Requirements
- Docker Desktop (macOS/Windows)
- Docker Engine (Linux)
- Node.js 18+ (for local tools)
- Git

### Local URLs
- **Application:** http://localhost:3001
- **Container port:** 8080 (mapped to 3001)

### Environment Setup
```bash
cp .env.example .env
# Add API keys
docker-compose up -d
```

## API REQUIREMENTS

### Groq API
- **URL:** https://api.groq.com/openai/v1
- **Key source:** console.groq.com/keys
- **Usage:** All chat operations + SQL generation
- **Required:** Yes

### OpenAI API
- **URL:** https://api.openai.com/v1
- **Key source:** platform.openai.com
- **Usage:** Excel tool embeddings only
- **Required:** Yes (for Excel functionality)

## DATA FORMATS

### Knowledge Base
- **Preferred:** Markdown (.md)
- **Supported:** PDF, TXT, DOCX, HTML
- **Upload:** Manual via web UI

### Excel Analysis
- **Supported:** .xlsx, .xls, .csv
- **Processing:** Auto-import to DuckDB
- **Retention:** Ephemeral (session-based)

## SECURITY TOOLS

### Secret Management
- `.gitignore` - Prevents `.env` commits
- GitHub secret scanning (enabled)
- Environment variable isolation
- **CRITICAL:** API keys stored in 2 locations:
  - `.env` file (for tools)
  - Database `config` table (for chat models)

### SSL/TLS
- certbot - Certificate management
- Nginx - TLS 1.2+ enforcement
- Auto-renewal cron job

### Intrusion Prevention
- **fail2ban** - SSH brute-force protection
- **UFW firewall** - Port restrictions
- **CloudWatch alarms** - Security monitoring

## BACKUP & RECOVERY

### S3 Backup System
- **AWS S3** - Offsite backup storage
- **Lifecycle policies** - 7-4-6 retention (7 daily, 4 weekly, 6 monthly)
- **Cost:** $0.25/month
- **Automation:** Daily cron job at 2 AM UTC
- **Testing:** Weekly automated restore tests
- **RTO:** 5-10 minutes
- **RPO:** < 24 hours

## CURRENT PRODUCTION STATUS

### Deployed & Active
- ✅ Redis cache (90%+ hit rate)
- ✅ CloudWatch monitoring (8 alarms, $0/month)
- ✅ fail2ban (SSH protection)
- ✅ Database optimization (154x faster)
- ✅ Self-hosted GitHub runner
- ✅ S3 automated backups

### Future Considerations
- Prometheus + Grafana (advanced observability)
- PostgreSQL (if SQLite insufficient)
- Kubernetes (multi-server orchestration)
- External integrations (LiteFarm, etc.)

**See:** `.claude/roadmap.md` for detailed plans

## VERSION REQUIREMENTS

- Docker: 20.10+
- Docker Compose: v2+
- Nginx: 1.18+
- Ubuntu: 20.04 LTS or later
- Node.js: 18+ (local dev only)
