# Archived Documentation

This directory contains outdated or superseded documentation that has been consolidated into the new structure.

## Why These Files Were Archived

These documents have been archived because:
- Content has been consolidated into new organized documents
- Information was redundant across multiple files
- Documents contained outdated future plans (k8s, automation)
- Better organization achieved through new structure

## Archived Files Index

### Security Documents (Consolidated into `/security/`)
- `INCIDENT_REPORT_2025-10-17.md` → See `security/INCIDENTS.md`
- `INCIDENT_REPORT_2025-10-17_AUTH_SECURITY.md` → See `security/INCIDENTS.md`
- `SECURITY_INCIDENT_2025-10-17.md` → See `security/INCIDENTS.md`
- `SECRETS_INVENTORY.md` → See `security/SECRETS_MANAGEMENT.md`
- `SECRETS_ROTATION_SOP.md` → See `security/SECRETS_MANAGEMENT.md`
- `ROTATION_CHECKLIST.md` → See `security/SECRETS_MANAGEMENT.md`
- `KEY_ROTATION_2025-10-17.md` → See `security/SECRETS_MANAGEMENT.md`
- `GROQ_KEY_ROTATION_2025-10-17.md` → See `security/SECRETS_MANAGEMENT.md`
- `SECURITY_AUDIT_SUMMARY.md` → See `security/AUDIT_REPORTS.md`
- `INPUT_VALIDATION_SECURITY_SUMMARY.md` → See `security/AUDIT_REPORTS.md`
- `PHASE_1_EXECUTIVE_SUMMARY.md` → See `security/AUDIT_REPORTS.md`
- `PHASE_2_EXECUTIVE_SUMMARY.md` → See `security/AUDIT_REPORTS.md`

### Operations Documents (Consolidated into `/operations/`)
- `CLOUDWATCH_MONITORING.md` → See `operations/MONITORING.md`
- `MEMORY_MONITORING.md` → See `operations/MONITORING.md`
- `DATABASE_OPTIMIZATION.md` → See `operations/PERFORMANCE_TUNING.md`

### DNS Documents (No longer needed - DNS properly configured)
- `DNS_QUICK_REFERENCE.md`
- `DNS_STATUS_REPORT.md`
- `DNS_MISSION_COMPLETE.md`
- `DNS_VERIFICATION_SUMMARY.md`
- `DNS_UPDATE_MANUAL.md`

### Implementation Documents (Consolidated or outdated)
- `INPUT_VALIDATION.md` → See `security/AUDIT_REPORTS.md`
- `REDIS_CACHE.md` → Future implementation, see `operations/PERFORMANCE_TUNING.md`
- `REDIS_CACHE_IMPLEMENTATION.md` → Future implementation
- `SECURITY_IMPLEMENTATION_ROADMAP.md` → See roadmap sections in new docs
- `SECURITY_RECOMMENDATIONS.md` → Integrated into `SECURITY.md`

## How to Access Current Documentation

The active documentation is now organized as follows:

```
/docs/
├── README.md                    # Documentation index
├── QUICKSTART.md               # 5-minute setup
├── ARCHITECTURE.md             # System design
├── DEPLOYMENT.md               # Production deployment
├── SECURITY.md                 # Security overview
├── TROUBLESHOOTING.md          # Problem solving
├── security/                   # Security docs
│   ├── INCIDENTS.md
│   ├── SECRETS_MANAGEMENT.md
│   └── AUDIT_REPORTS.md
└── operations/                 # Operations docs
    ├── BACKUP_RESTORE.md
    ├── MONITORING.md
    └── PERFORMANCE_TUNING.md
```

## Note on Archived Content

All critical information from these archived documents has been preserved in the new structure. These files are kept for historical reference only and should not be used for current operations.

If you need to reference old documentation for historical context, the files are preserved here with their original content.

---

*Archive created: 2025-10-17*
*Documentation reorganization: Version 2.0*