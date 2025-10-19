# CLAUDE.md

**Guidance for Claude Code when working with SmartFarm repository.**

## MODULAR CONFIGURATION

@.claude/architecture.md
@.claude/tech-stack.md
@.claude/coding-standards.md
@.claude/file-structure.md
@.claude/roadmap.md

## QUICK REFERENCE

### Essential Commands

**Local Development:**
```bash
docker-compose up -d          # Start
docker logs -f open-webui     # Logs
docker-compose restart        # Restart
```

**Production Deployment:**
```bash
git push origin main          # Auto-deploy via CI/CD
gh run watch                  # Monitor deployment
```

**Data Management:**
```bash
./scripts/backup.sh           # Create backup
./scripts/restore.sh FILE     # Restore from backup
./scripts/update.sh           # Update Open WebUI
```

### Critical URLs

- **Local:** http://localhost:3001
- **Production:** https://smartfarm.autonomos.dev
- **Server IP:** 98.87.30.163 (Static)
- **SSH:** `ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163`

### Emergency Procedures

**Rollback:**
```bash
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163
cd /opt/smartfarm
sudo git reset --hard HEAD~1
sudo ./deployment/deploy.sh
```

**Complete Reset (⚠️ destroys data):**
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

**API not working?**
→ Verify `.env` has both GROQ_API_KEY and OPENAI_API_KEY

**System prompt not applying?**
→ Check for chat-level override, restart container

**CI/CD failed?**
→ `gh run view --log` then check server logs

## REMEMBER

- **Max file size:** 300 lines (see `.claude/coding-standards.md`)
- **Never commit:** `.env`, `config/`, `data/`, `*.pem`
- **Always backup:** Before major changes
- **Test locally:** Before pushing to main
- **Update docs:** When architecture/features change

## REFERENCES

**Full details in modular files:**
- System architecture → `.claude/architecture.md`
- Technology stack → `.claude/tech-stack.md`
- Coding standards → `.claude/coding-standards.md`
- File organization → `.claude/file-structure.md`
- Future plans → `.claude/roadmap.md`

**Git Repository:** https://github.com/AutonomosCdM/smartFarm.git
