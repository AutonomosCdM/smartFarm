# SmartFarm Documentation

Welcome to SmartFarm - an AI agricultural assistant for Chilean farmers using Open WebUI + Groq API.

**Production:** https://smartfarm.autonomos.dev | **Server:** 98.87.30.163

---

## 📚 Quick Navigation

### 🚀 Getting Started (5-15 minutes)
- **[QUICKSTART.md](QUICKSTART.md)** - Get SmartFarm running in 5 minutes
- **[INSTALLATION.md](INSTALLATION.md)** - Detailed local installation guide
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System design, components, and data flow

### ⚙️ Configuration
- **[GROQ_CONFIGURATION.md](GROQ_CONFIGURATION.md)** - Configure Groq API for AI models
- **[EXCEL_PROCESSING.md](EXCEL_PROCESSING.md)** - Excel file analysis with SQL
- **[MODELS.md](MODELS.md)** - Available AI models and capabilities

### 🚢 Deployment & Operations
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment guide (AWS Lightsail)
- **[operations/CICD.md](operations/CICD.md)** - CI/CD with GitHub Actions + self-hosted runner
- **[operations/BACKUP_RESTORE.md](operations/BACKUP_RESTORE.md)** - Backup and disaster recovery
- **[operations/MONITORING.md](operations/MONITORING.md)** - CloudWatch monitoring and alerts
- **[operations/PERFORMANCE_TUNING.md](operations/PERFORMANCE_TUNING.md)** - Redis cache and optimization

### 🔒 Security
- **[SECURITY.md](SECURITY.md)** - Security overview and best practices
- **[security/SSH_HARDENING.md](security/SSH_HARDENING.md)** - SSH security with fail2ban
- **[security/SECRETS_MANAGEMENT.md](security/SECRETS_MANAGEMENT.md)** - API key rotation procedures
- **[security/INCIDENTS.md](security/INCIDENTS.md)** - Security incident reports
- **[security/AUDIT_REPORTS.md](security/AUDIT_REPORTS.md)** - Security audit findings

### 🔧 Troubleshooting
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Common issues and solutions

---

## 🎯 Documentation by Role

### New Developer
**Goal:** Get SmartFarm running locally and understand the system

1. **[QUICKSTART.md](QUICKSTART.md)** - 5-minute local setup
2. **[ARCHITECTURE.md](ARCHITECTURE.md)** - Understand the system design
3. **[GROQ_CONFIGURATION.md](GROQ_CONFIGURATION.md)** - Configure AI capabilities
4. **[EXCEL_PROCESSING.md](EXCEL_PROCESSING.md)** - Learn the Excel analysis feature

**Time:** 30 minutes to productive

---

### DevOps Engineer
**Goal:** Deploy and maintain production infrastructure

1. **[DEPLOYMENT.md](DEPLOYMENT.md)** - Initial server setup
2. **[operations/CICD.md](operations/CICD.md)** - Automated deployments
3. **[operations/BACKUP_RESTORE.md](operations/BACKUP_RESTORE.md)** - Data protection
4. **[operations/MONITORING.md](operations/MONITORING.md)** - Observability setup
5. **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Problem solving

**Time:** 2 hours to production-ready

---

### Security Engineer
**Goal:** Audit and harden production security

1. **[SECURITY.md](SECURITY.md)** - Security posture overview
2. **[security/SSH_HARDENING.md](security/SSH_HARDENING.md)** - SSH security layers
3. **[security/SECRETS_MANAGEMENT.md](security/SECRETS_MANAGEMENT.md)** - Key management
4. **[security/AUDIT_REPORTS.md](security/AUDIT_REPORTS.md)** - Past audits
5. **[security/INCIDENTS.md](security/INCIDENTS.md)** - Incident history

**Time:** 1 hour to complete audit

---

### On-Call Engineer
**Goal:** Respond to incidents quickly

**Emergency Procedures:**
1. **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Start here for all issues
2. **[operations/BACKUP_RESTORE.md](operations/BACKUP_RESTORE.md)** - Restore from backup
3. **[operations/CICD.md](operations/CICD.md)** - Rollback deployments
4. **[security/INCIDENTS.md](security/INCIDENTS.md)** - Document the incident

**Emergency Contacts:**
- **SSH:** `ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163`
- **Logs:** `docker logs open-webui`
- **Rollback:** `cd /opt/smartfarm && sudo git reset --hard HEAD~1 && sudo ./deployment/deploy.sh`

**Time:** 2 minutes to incident response

---

## 📊 System Overview

```
User Browser
    ↓ HTTPS
Nginx (Port 443) + SSL
    ↓
Open WebUI Container (Port 8080)
    ↓                    ↓
Redis Cache          Groq API
(90% hit rate)      (AI Models)
    ↓
SQLite Database
(User data, chats, knowledge base)
```

**Key Technologies:**
- **Frontend/Backend:** Open WebUI (Docker)
- **AI:** Groq API (llama-3.3-70b-versatile)
- **Cache:** Redis 7 (90% hit rate, 10-50x speedup)
- **Database:** SQLite (Docker volume)
- **Infrastructure:** Nginx, Let's Encrypt SSL
- **CI/CD:** GitHub Actions + self-hosted runner
- **Monitoring:** CloudWatch (free tier)

---

## 🔑 Critical Information

| Item | Value | Notes |
|------|-------|-------|
| **Production URL** | https://smartfarm.autonomos.dev | Main application |
| **Server IP** | 98.87.30.163 | AWS Lightsail (static) |
| **SSH Key** | ~/Downloads/smartfarm-key.pem | For server access |
| **Repository** | github.com/AutonomosCdM/smartFarm | Main repo |
| **Deploy Method** | Self-hosted runner | Push to `main` auto-deploys |

**Environment Variables:**
```bash
GROQ_API_KEY=gsk_xxx    # For AI chat + SQL generation
OPENAI_API_KEY=sk-xxx   # For Excel embeddings only
OPENWEBUI_PORT=3001     # Local dev port
```

---

## 📈 Performance Metrics

**Current Production Performance:**
- **Query Speed:** 1.90ms average (154x faster vs baseline)
- **Cache Hit Rate:** 90% (Redis)
- **API Cost:** $1.50/month (90% reduction)
- **Uptime:** 99.9%+ (CloudWatch monitoring)
- **Backup RTO:** 5-10 minutes
- **Deployment Time:** 2-3 minutes

---

## 🗂️ Documentation Structure

```
docs/
├── README.md                      # This file - documentation hub
├── QUICKSTART.md                  # 5-minute getting started
├── ARCHITECTURE.md                # System design + diagrams
├── INSTALLATION.md                # Detailed setup
├── DEPLOYMENT.md                  # Production deployment
├── SECURITY.md                    # Security overview
├── TROUBLESHOOTING.md             # Problem solving
├── GROQ_CONFIGURATION.md          # API setup
├── EXCEL_PROCESSING.md            # Excel tool
├── MODELS.md                      # AI model catalog
│
├── operations/                    # Operational procedures
│   ├── CICD.md                   # CI/CD guide
│   ├── BACKUP_RESTORE.md         # Backup procedures
│   ├── MONITORING.md             # CloudWatch setup
│   └── PERFORMANCE_TUNING.md     # Optimization
│
├── security/                      # Security documentation
│   ├── SSH_HARDENING.md          # SSH security
│   ├── SECRETS_MANAGEMENT.md     # Key rotation
│   ├── INCIDENTS.md              # Incident reports
│   └── AUDIT_REPORTS.md          # Security audits
│
└── archive/                       # Historical documentation
    ├── README.md                  # Archive index
    └── 2025-10-XX-*.md           # Dated archived docs
```

---

## 📝 Documentation Standards

**Our Principles:**
- **Single source of truth** - No duplicate information
- **User-focused** - Organized by role and use case
- **Action-oriented** - Clear commands with examples
- **Always current** - Updated with each change
- **Well-archived** - Historical docs preserved with dates

**File Naming:**
- Active docs: `TOPIC.md` (e.g., `SECURITY.md`)
- Archived docs: `YYYY-MM-DD-TOPIC.md` (e.g., `2025-10-19-OLD_SECURITY.md`)

**Internal Links:**
- Relative paths: `[Link](../security/INCIDENTS.md)`
- Clear link text: `[Security Incidents](security/INCIDENTS.md)` not `[click here]`

---

## 🗃️ Archive

Older documentation has been preserved in **[archive/](archive/)** with date prefixes:

**Why We Archive:**
- Preserve historical context
- Track decision evolution
- Reference old procedures if needed
- Maintain clean active docs

**Archive Contents:**
- Phase 3 executive summary (2025-10-17)
- GitHub Actions SSH investigation (2025-10-19)
- Old CI/CD guides (replaced by unified CICD.md)
- SSH hardening reports (consolidated into SSH_HARDENING.md)
- Backup automation docs (functionality in scripts)

See **[archive/README.md](archive/README.md)** for complete index.

---

## 🔄 Keeping Documentation Updated

**When to Update:**
- System architecture changes
- New features added
- Configuration changes
- Security incidents
- Performance optimizations
- Deployment process changes

**How to Update:**
1. Update the relevant doc file
2. Check for broken links
3. Update this README if structure changes
4. Archive old versions if major rewrite
5. Commit with clear message: `docs: update X for Y change`

---

## 🆘 Getting Help

**For Issues:**
1. **Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Most common issues covered
2. **Review logs** - `docker logs open-webui --tail 100`
3. **Check [security/INCIDENTS.md](security/INCIDENTS.md)** - Similar past incidents
4. **GitHub Issues** - Report bugs/requests at github.com/AutonomosCdM/smartFarm/issues

**For Emergencies:**
1. SSH to server: `ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163`
2. Check container: `docker ps && docker logs open-webui`
3. Rollback if needed: See [operations/CICD.md](operations/CICD.md)
4. Restore from backup: See [operations/BACKUP_RESTORE.md](operations/BACKUP_RESTORE.md)

---

## 📚 External Resources

- **Open WebUI Docs:** https://docs.openwebui.com
- **Groq API Docs:** https://console.groq.com/docs
- **Docker Docs:** https://docs.docker.com
- **Nginx Docs:** https://nginx.org/en/docs/
- **AWS Lightsail:** https://lightsail.aws.amazon.com/

---

**Documentation Version:** 3.0
**Last Updated:** 2025-10-19
**Maintained By:** Autonomos Development Team

**Quality Metrics:**
- ✅ Zero documentation redundancy
- ✅ All docs under 300 lines (readable)
- ✅ Clear navigation by role
- ✅ Complete internal linking
- ✅ Historical context preserved
