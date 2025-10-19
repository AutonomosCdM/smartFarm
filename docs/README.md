# SmartFarm Documentation Index

Welcome to SmartFarm - an AI agricultural assistant for Chilean farmers using Open WebUI + Groq API.

## 📚 Documentation Overview

This documentation is organized by audience and use case to help you find what you need quickly.

### 🚀 Getting Started
- **[QUICKSTART.md](QUICKSTART.md)** - Get SmartFarm running in 5 minutes
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System design, components, and data flow
- **[INSTALLATION.md](INSTALLATION.md)** - Detailed installation guide

### 🔧 For Developers
- **[GROQ_CONFIGURATION.md](GROQ_CONFIGURATION.md)** - Set up Groq API for AI capabilities
- **[EXCEL_PROCESSING.md](EXCEL_PROCESSING.md)** - Excel file analysis with SQL queries
- **[ADVANCED_CONFIGURATION.md](ADVANCED_CONFIGURATION.md)** - Database configuration and system prompts

### 🚢 For Operations
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment on AWS Lightsail
- **[operations/](operations/)** - Day-to-day operational procedures
  - [BACKUP_RESTORE.md](operations/BACKUP_RESTORE.md) - Backup and restore procedures
  - [MONITORING.md](operations/MONITORING.md) - System monitoring and alerts
  - [PERFORMANCE_TUNING.md](operations/PERFORMANCE_TUNING.md) - Optimization guide
  - **[CICD_DEPLOYMENT.md](operations/CICD_DEPLOYMENT.md)** - GitHub Actions CI/CD guide

### 🔒 For Security
- **[SECURITY.md](SECURITY.md)** - Security overview and best practices
- **[security/](security/)** - Security-specific documentation
  - [INCIDENTS.md](security/INCIDENTS.md) - Incident reports and postmortems
  - [SECRETS_MANAGEMENT.md](security/SECRETS_MANAGEMENT.md) - API keys and rotation procedures
  - [AUDIT_REPORTS.md](security/AUDIT_REPORTS.md) - Security audit findings
  - **[GITHUB_ACTIONS_SSH_SECURITY.md](security/GITHUB_ACTIONS_SSH_SECURITY.md)** - CI/CD SSH security configuration

### 🛠 Troubleshooting
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Common issues and solutions

### 📖 Reference
- **[MODELS.md](MODELS.md)** - Available AI models and capabilities
- **[api/](api/)** - API documentation for tools and integrations

## 🎯 Quick Links by Role

### I'm a New Developer
1. Start with **[QUICKSTART.md](QUICKSTART.md)**
2. Read **[ARCHITECTURE.md](ARCHITECTURE.md)** to understand the system
3. Follow **[INSTALLATION.md](INSTALLATION.md)** for local setup
4. Check **[GROQ_CONFIGURATION.md](GROQ_CONFIGURATION.md)** for AI setup

### I'm an Operator
1. Review **[DEPLOYMENT.md](DEPLOYMENT.md)** for production deployment
2. Learn **[operations/CICD_DEPLOYMENT.md](operations/CICD_DEPLOYMENT.md)** for CI/CD
3. Set up **[operations/MONITORING.md](operations/MONITORING.md)**
4. Learn **[operations/BACKUP_RESTORE.md](operations/BACKUP_RESTORE.md)**
5. Keep **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** handy

### I'm Handling an Incident
1. Check **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** for known issues
2. Review **[security/INCIDENTS.md](security/INCIDENTS.md)** for similar past incidents
3. Follow **[operations/BACKUP_RESTORE.md](operations/BACKUP_RESTORE.md)** if rollback needed
4. Document in **[security/INCIDENTS.md](security/INCIDENTS.md)** after resolution

### I'm Doing a Security Review
1. Start with **[SECURITY.md](SECURITY.md)** for overview
2. Review **[security/GITHUB_ACTIONS_SSH_SECURITY.md](security/GITHUB_ACTIONS_SSH_SECURITY.md)** for CI/CD security
3. Review **[security/AUDIT_REPORTS.md](security/AUDIT_REPORTS.md)** for past findings
4. Check **[security/SECRETS_MANAGEMENT.md](security/SECRETS_MANAGEMENT.md)** for key rotation
5. Read **[security/INCIDENTS.md](security/INCIDENTS.md)** for incident history

## 📊 System Overview

```
User → Browser → HTTPS → Nginx → Docker → Open WebUI → Groq API
                  ↓                ↓           ↓          ↓
                 SSL             SQLite    RAG/Tools   AI Models
                                           Knowledge
```

## 🔑 Key Information

- **Production URL**: https://smartfarm.autonomos.dev
- **Server IP**: 98.87.30.163 (AWS Lightsail, Static IP)
- **Tech Stack**: Docker, Open WebUI, Groq API, Nginx, Let's Encrypt
- **Repository**: https://github.com/AutonomosCdM/smartFarm
- **CI/CD**: GitHub Actions (auto-deploy on push to main)

## 📝 Documentation Standards

- **Markdown** format for all documentation
- **ASCII art** or Mermaid.js for diagrams
- **Single source of truth** - no duplicate information
- **Clear examples** with actual commands and outputs
- **Version tracking** through git

## 🗂 Archive

Older or deprecated documentation has been moved to **[archive/](archive/)**. This includes:
- Future roadmap items (k8s, automation)
- Superseded procedures
- Historical documentation

---

*Last updated: 2025-10-17*
*Documentation version: 2.0*