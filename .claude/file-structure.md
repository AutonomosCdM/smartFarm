# SMARTFARM FILE STRUCTURE

## PROJECT LAYOUT

```
smartFarm_v5/
├── .env.example              # Template (commit)
├── .env                      # Secrets (NEVER commit)
├── docker-compose.yml        # Service definition
├── README.md                 # User getting started
├── CLAUDE.md                 # Claude Code instructions
├── CONTRIBUTING.md           # Contribution guide
├── DEPLOYMENT_SUMMARY.md     # Deployment status
│
├── .claude/                  # Claude Code configuration
│   ├── architecture.md       # System architecture
│   ├── tech-stack.md         # Technology decisions
│   ├── coding-standards.md   # Coding conventions
│   ├── file-structure.md     # This file
│   ├── roadmap.md            # Future plans
│   ├── settings.local.json   # Local Claude settings
│   └── agents/               # Specialized agent configs
│       ├── hamilton-ai-engineer.md
│       ├── valtteri-code-master.md
│       └── ...
│
├── .github/workflows/        # CI/CD
│   └── deploy-production.yml
│
├── deployment/               # Production deployment
│   ├── deploy.sh            # Auto-deployment script
│   ├── setup-nginx.sh       # Nginx + SSL setup
│   ├── nginx.conf           # HTTP config
│   └── nginx-ssl.conf       # HTTPS config
│
├── scripts/                  # Management utilities
│   ├── automate-backups.sh          # Daily S3 backups
│   ├── restore-from-backup.sh       # Interactive restore
│   ├── test-restore.sh              # Weekly restore testing
│   ├── setup-s3-backups.sh          # S3 configuration
│   ├── install-backup-automation.sh # One-command setup
│   ├── backup.sh                    # Legacy manual backup
│   ├── restore.sh                   # Legacy manual restore
│   ├── update.sh                    # Container updates
│   ├── monitor-memory.sh            # Memory monitoring
│   ├── deploy-monitoring.sh         # CloudWatch deployment
│   ├── optimize-database.sh         # Database optimization
│   ├── security-status.sh           # Security audit
│   ├── view-memory-stats.sh         # Memory statistics
│   └── check-memory-alert.sh        # Memory alerts
│
├── docs/                     # User documentation
│   ├── README.md                    # Documentation hub
│   ├── QUICKSTART.md               # 5-minute guide
│   ├── ARCHITECTURE.md             # System design + diagrams
│   ├── DEPLOYMENT.md               # Production guide
│   ├── SECURITY.md                 # Security overview
│   ├── TROUBLESHOOTING.md          # Problem solving
│   ├── INSTALLATION.md             # Setup guide
│   ├── GROQ_CONFIGURATION.md       # Groq API setup
│   ├── EXCEL_PROCESSING.md         # Excel tool details
│   ├── MODELS.md                   # AI model catalog
│   ├── PHASE_3_EXECUTIVE_SUMMARY.md # Phase 1-3 report
│   ├── UPGRADE_ANALYSIS_CHARTS.txt  # Instance analysis
│   ├── security/                    # Security documentation
│   │   ├── INCIDENTS.md            # All incidents consolidated
│   │   ├── SECRETS_MANAGEMENT.md   # Key rotation & secrets
│   │   └── AUDIT_REPORTS.md        # Security audit findings
│   ├── operations/                  # Operational procedures
│   │   ├── BACKUP_RESTORE.md       # Backup & recovery
│   │   ├── MONITORING.md           # CloudWatch & metrics
│   │   └── PERFORMANCE_TUNING.md   # Optimization guide
│   └── archive/                     # Deprecated docs (32 files)
│       └── README.md               # Archive index
│
├── config/                   # User configs (gitignored)
├── data/                     # User data (gitignored)
└── backups/                  # Data backups (gitignored)
```

## DIRECTORY CONVENTIONS

### Root Level
**Purpose:** Core configuration and quick reference

**Files:**
- `docker-compose.yml` - Single source of truth for services
- `.env.example` - Template with all variables
- `CLAUDE.md` - Quick reference for Claude Code
- `README.md` - Getting started for users
- `DEPLOYMENT_SUMMARY.md` - Current deployment status

**Rules:**
- Keep root clean (max 10 files)
- No data/config files (use subdirs)
- No nested docker-compose files

### .claude/
**Purpose:** Claude Code agent configuration

**Structure:**
```
.claude/
├── *.md                  # Modular instructions
├── settings.local.json   # Local settings (gitignored)
└── agents/               # Specialized agents
```

**Rules:**
- Each module under 300 lines
- Use @imports in CLAUDE.md
- Agent files follow naming: `name-role.md`

### deployment/
**Purpose:** Production deployment automation

**Files:**
- `deploy.sh` - Main deployment script
- `setup-nginx.sh` - Initial server setup
- `nginx*.conf` - Nginx configs

**Rules:**
- Scripts must be idempotent
- Include health checks
- Document all manual steps

### scripts/
**Purpose:** Operational utilities

**Files:**
- `backup.sh` - Data backup
- `restore.sh` - Data restore
- `update.sh` - Container updates

**Rules:**
- Each script single responsibility
- Exit codes: 0=success, 1=failure
- User-friendly output (emojis ok)

### docs/
**Purpose:** User-facing documentation

**Structure:**
```
docs/
├── *.md              # Main docs
├── archive/          # Deprecated
│   └── YYYY-MM-DD-filename.md
└── roadmap/          # Future plans
    └── *.md
```

**Rules:**
- One topic per file
- Step-by-step instructions
- Code examples for all commands
- Archive when obsolete (don't delete)

### config/ (gitignored)
**Purpose:** Runtime configuration

**Contents:**
- User-specific settings
- Generated configs
- Cache files

**Rules:**
- Never commit
- Document expected structure
- Safe to delete/recreate

### data/ (gitignored)
**Purpose:** Application data

**Contents:**
- Uploaded files
- Temporary data
- Processing artifacts

**Rules:**
- Never commit
- Include in backups
- Document data lifecycle

### backups/ (gitignored)
**Purpose:** Data backups

**Naming:** `openwebui-backup-YYYYMMDD_HHMMSS.tar.gz`

**Rules:**
- Automated naming (timestamp)
- Keep last 7 backups
- Archive monthly backups

## FILE NAMING CONVENTIONS

### Scripts
```bash
backup.sh           # Verb.sh
restore.sh
update.sh
deploy.sh
setup-nginx.sh      # action-target.sh
```

### Documentation
```markdown
README.md               # ALL CAPS for main docs
INSTALLATION.md
TROUBLESHOOTING.md
GROQ_CONFIGURATION.md   # NOUN_NOUN.md for specific topics
```

### Configuration
```
docker-compose.yml      # Standard Docker naming
nginx.conf              # Standard Nginx naming
nginx-ssl.conf          # config-variant.ext
.env.example            # Standard dotfile naming
```

### Archives
```
docs/archive/2024-10-15-OLD_INSTALLATION.md
docs/archive/2024-09-01-DEPRECATED_PROCESS.md
```

**Format:** `YYYY-MM-DD-ORIGINAL_NAME.md`

## GITIGNORE RULES

```gitignore
# Secrets
.env
*.pem
*.key
*.secret

# User data
config/
data/
backups/

# IDE
.vscode/
.idea/
*.swp

# System
.DS_Store
__pycache__/
*.pyc
node_modules/

# Logs
*.log
```

## IMPORT STRUCTURE (.claude/)

### Main CLAUDE.md
```markdown
# CLAUDE.md

@.claude/architecture.md
@.claude/tech-stack.md
@.claude/coding-standards.md
@.claude/file-structure.md
@.claude/roadmap.md

## Quick Commands
[Essential commands here]

## References
[Links to docs/]
```

**Rules:**
- Max 5 levels deep imports
- Import at top of file
- Keep main CLAUDE.md under 200 lines

### Module Organization
- `architecture.md` - System design
- `tech-stack.md` - Technologies used
- `coding-standards.md` - Development rules
- `file-structure.md` - This file
- `roadmap.md` - Future plans

## DOCUMENTATION HIERARCHY

```
Quick Reference: CLAUDE.md (200 lines)
    ↓
Detailed Instructions: .claude/*.md (300 lines each)
    ↓
User Documentation: docs/*.md (no limit)
    ↓
Code Comments: Inline (explain WHY)
```

## WHEN TO CREATE NEW FILES

### Create new file when:
- Existing file approaching 300 lines
- New distinct functionality
- Separate concern/responsibility
- Different audience (user vs agent)

### Merge files when:
- Under 100 lines combined
- Tightly coupled concerns
- Same audience
- Rarely updated separately

## DIRECTORY CREATION RULES

### Auto-created by scripts:
```bash
backups/    # Created by backup.sh
config/     # Created by first run
data/       # Created by docker-compose
```

### Must pre-exist:
```bash
deployment/
scripts/
docs/
.claude/
.github/workflows/
```

## FILE PERMISSION STANDARDS

```bash
# Scripts (executable)
chmod +x scripts/*.sh
chmod +x deployment/*.sh

# Configs (read-only)
chmod 644 *.yml
chmod 644 *.conf

# Secrets (restricted)
chmod 600 .env
chmod 600 *.pem
```

## VERSION CONTROL RULES

### Always commit:
- Code
- Scripts
- Documentation
- .env.example
- .gitignore

### Never commit:
- .env (secrets)
- config/ (user-specific)
- data/ (application data)
- backups/ (large files)
- *.pem (SSH keys)

### Commit message format:
```
[Type]: Brief description

Type: Add, Fix, Update, Remove, Docs
```

## FILE LIFECYCLE

### Creation:
1. Create file
2. Add to git if needed
3. Update relevant docs
4. Add to .gitignore if secret/data

### Modification:
1. Check file size (<300 lines)
2. Update CLAUDE.md if architecture change
3. Update docs/ if user-facing change
4. Test changes

### Deprecation:
1. Move to docs/archive/ (if doc)
2. Add deprecation date to filename
3. Update references
4. Don't delete (keep history)

## TROUBLESHOOTING FILE LOCATIONS

**Common issues:**

**"Where is the database?"**
→ `/var/lib/docker/volumes/open-webui/_data/webui.db`

**"Where are the logs?"**
→ `docker logs open-webui`

**"Where is my .env?"**
→ Root directory (copy from .env.example)

**"Where are backups?"**
→ `./backups/` (created by backup.sh)

**"Where is SSL cert?"**
→ `/etc/letsencrypt/live/smartfarm.autonomos.dev/`

**"Where is Nginx config?"**
→ `deployment/nginx-ssl.conf`
