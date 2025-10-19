# CLAUDE.md

**Definitive quick reference for SmartFarm AI Agricultural Assistant.**

## MODULAR CONFIGURATION

@.claude/architecture.md
@.claude/tech-stack.md
@.claude/coding-standards.md
@.claude/file-structure.md
@.claude/roadmap.md

## SYSTEM STATUS

**Production:** ✅ Fully operational (Phases 1-3 Complete)
**Performance:** 154x faster queries | 90% cache hit rate | 90% cost reduction
**Security:** fail2ban active | SSH hardened | CloudWatch monitoring ($0/month)
**Backups:** Automated S3 backups (7-4-6 retention, $0.25/month)
**Deployment:** Zero-touch via self-hosted GitHub Actions runner
**Instance:** AWS Lightsail 2GB + 2GB Swap (NO upgrade needed)

## QUICK REFERENCE

### Essential Commands

**Local Development:**
```bash
docker-compose up -d          # Start all services (Open WebUI + Redis)
docker logs -f open-webui     # View application logs
docker-compose restart        # Restart services
```

**Production Deployment (Zero-Touch):**
```bash
git push origin main          # Triggers automatic deployment
gh run watch                  # Monitor CI/CD pipeline
gh run list                   # View deployment history
```

**Monitoring & Status:**
```bash
./scripts/security-status.sh  # Security dashboard
docker stats                  # Resource usage
gh run view --log            # View deployment logs
```

**Database Maintenance:**
```bash
./scripts/optimize-database.sh    # Run optimization
./scripts/check-database-health.sh # Health check
./scripts/vacuum-database.sh       # Weekly VACUUM
```

**Backup Management:**
```bash
./scripts/automate-backups.sh              # Manual backup (production-ready)
./scripts/restore-from-backup.sh FILE      # Interactive restore
./scripts/test-restore.sh                  # Weekly restore testing
./scripts/setup-s3-backups.sh              # S3 setup ($0.25/month)
./scripts/install-backup-automation.sh     # Cron automation (one-command)
./scripts/backup.sh                        # Legacy manual backup
```

### Critical URLs

- **Local:** http://localhost:3001
- **Production:** https://smartfarm.autonomos.dev
- **Server IP:** 98.87.30.163 (Static)
- **SSH:** `ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163`
- **CI/CD Runner:** /opt/actions-runner (self-hosted on production)

### Emergency Procedures

**Model Not Working? (Critical 2-Step Fix):**
```bash
# Step 1: Update .env file
vim .env
# Add/update: GROQ_API_KEY=gsk_xxxxx

# Step 2: Update database config (CRITICAL - often forgotten!)
docker exec open-webui sqlite3 /app/backend/data/webui.db \
  "UPDATE config SET value='{\"OPENAI_API_BASE_URL\":\"https://api.groq.com/openai/v1\",\"OPENAI_API_KEY\":\"gsk_xxxxx\"}' WHERE key='llm';"

# Step 3: Restart
docker-compose restart
```

**Production Emergency Access:**
```bash
# SSH to server
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163

# View real-time logs
sudo docker logs -f open-webui --tail 100

# Restart services
cd /opt/smartfarm && sudo docker-compose restart

# Check runner status
cd /opt/actions-runner && sudo ./svc.sh status
```

**Automatic Rollback (Triggers on Health Check Failure):**
```bash
# Manual rollback if needed
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163
cd /opt/smartfarm
sudo git reset --hard HEAD~1
sudo ./deployment/deploy.sh
```

**Complete Reset (⚠️ DESTROYS ALL DATA):**
```bash
docker-compose down -v
docker rmi ghcr.io/open-webui/open-webui:main
docker-compose up -d
```

## DOCUMENTATION INDEX

### Getting Started
- **`docs/README.md`** - Documentation hub with navigation
- **`docs/QUICKSTART.md`** - 5-minute setup guide
- **`docs/ARCHITECTURE.md`** - System design & diagrams
- `docs/INSTALLATION.md` - Detailed installation
- `docs/GROQ_CONFIGURATION.md` - Groq API setup

### Operations
- **`docs/DEPLOYMENT.md`** - Production deployment
- **`docs/operations/`** - Operational procedures
  - `BACKUP_RESTORE.md` - Backup & recovery
  - `MONITORING.md` - CloudWatch & metrics
  - `PERFORMANCE_TUNING.md` - Optimization guide
- `docs/TROUBLESHOOTING.md` - Problem solving

### Security
- **`docs/SECURITY.md`** - Security overview
- **`docs/security/`** - Security documentation
  - `INCIDENTS.md` - All incident reports
  - `SECRETS_MANAGEMENT.md` - Key rotation & secrets
  - `AUDIT_REPORTS.md` - Security audits & findings

### Features
- `docs/EXCEL_PROCESSING.md` - Excel tool details
- `docs/MODELS.md` - AI model catalog

### Archived
- `docs/archive/` - Consolidated old docs (historical reference)

## QUICK TROUBLESHOOTING

**No models found?**
→ Admin Panel → Settings → Models → Set visibility to "Public"

**Port 3001 conflict?**
→ `lsof -i :3001` then `kill -9 <PID>`

**API not working after key rotation?**
→ Update BOTH `.env` AND database config (see Emergency Procedures above)

**System prompt not applying?**
→ Check for chat-level override, restart container

**CI/CD deployment failed?**
→ `gh run view --log` then SSH to check server logs

**Redis cache not working?**
→ Check `docker ps` shows redis container running
→ View cache stats in application logs

**High memory usage?**
→ `./scripts/view-memory-stats.sh` - CloudWatch monitors automatically
→ Alerts fire at >85% memory usage

**Backup failed?**
→ Check disk space: `df -h`
→ Verify S3 credentials in `.env` if using S3

## PERFORMANCE METRICS

**Current Baseline (Phase 1-3 Complete):**
- Query time: 1.90ms average (154x faster than 294ms baseline)
- File queries: 0.094ms (222x faster than 20.86ms baseline)
- Cache hit rate: 90%+ achieved (10-50x speedup on cached queries)
- API costs: $1.50/month (90% reduction from $15/month)
- Memory usage: 48.9% average (σ=0.72%, extremely stable)
- Swap usage: 0% (available but unused)
- Instance capacity: Supports up to 50 concurrent users
- Database: Optimized with indexes (154x faster)

## SECURITY CHECKLIST

✅ fail2ban active (5 failed attempts = 10min ban)
✅ SSH hardened (key-only, no password auth)
✅ CloudWatch monitoring (8 alarms configured)
✅ GitHub secret scanning enabled
✅ API keys in `.env` (gitignored)
✅ Daily backup automation ready
✅ Firewall: Only ports 22, 80, 443 open

**Check security status:** `./scripts/security-status.sh`

## REMEMBER

- **Max file size:** 300 lines (see `.claude/coding-standards.md`)
- **Never commit:** `.env`, `config/`, `data/`, `*.pem`, backups/
- **Always backup:** Before major changes (automated daily backups available)
- **Test locally:** Before pushing to main (CI/CD auto-deploys!)
- **Update docs:** When architecture/features change
- **API key rotation:** Update BOTH `.env` and database config table
- **Self-hosted runner:** Located at /opt/actions-runner on production server

## REFERENCES

**Full details in modular files:**
- System architecture → `.claude/architecture.md`
- Technology stack → `.claude/tech-stack.md`
- Coding standards → `.claude/coding-standards.md`
- File organization → `.claude/file-structure.md`
- Future plans → `.claude/roadmap.md`

**Git Repository:** https://github.com/AutonomosCdM/smartFarm.git
