# Documentation Archive

This directory contains historical and superseded documentation preserved for reference.

## Purpose

Archived documentation serves several purposes:
- **Historical context** - Understanding past decisions and approaches
- **Migration reference** - Comparing old vs new procedures
- **Audit trail** - Complete record of documentation evolution
- **Troubleshooting** - Reference for legacy systems or procedures

## File Naming Convention

Archived files use date prefixes: `YYYY-MM-DD-ORIGINAL_NAME.md`

Example: `2025-10-19-SSH_HARDENING_REPORT.md`

## Archive Index

### 2025-10-19 - Documentation Consolidation

**CI/CD Documentation** (replaced by [../operations/CICD.md](../operations/CICD.md)):
- `2025-10-19-CICD_DEPLOYMENT.md` - Basic CI/CD guide
- `2025-10-19-CICD_OPTIMIZATION.md` - Performance optimization
- `2025-10-19-CICD_TROUBLESHOOTING.md` - Troubleshooting procedures

**Reason:** Consolidated into single comprehensive CI/CD guide reflecting self-hosted runner architecture.

---

**SSH Security Documentation** (replaced by [../security/SSH_HARDENING.md](../security/SSH_HARDENING.md)):
- `2025-10-19-SSH_HARDENING_REFERENCE.md` - Command reference
- `2025-10-19-SSH_HARDENING_REPORT.md` - Implementation report
- `2025-10-19-GITHUB_ACTIONS_SSH_SECURITY.md` - GitHub Actions SSH security
- `2025-10-19-SECURITY_QUICK_REFERENCE.md` - Quick reference card

**Reason:** Consolidated into single authoritative SSH hardening guide with all commands and procedures.

---

**GitHub Actions Investigation:**
- `2025-10-19-GITHUB_ACTIONS_SSH_INVESTIGATION.md` - SSH connection troubleshooting

**Reason:** Historical investigation that led to self-hosted runner solution. Problem solved, kept for reference.

---

**Project Summary:**
- `2025-10-19-PHASE_3_EXECUTIVE_SUMMARY.md` - Phase 3 completion report

**Reason:** Project milestone documentation. Functionality now integrated into active docs.

---

### 2025-10-17 - Backup Automation Implementation

**Backup Documentation** (functionality in [scripts/](../../scripts/)):
- `2025-10-17-BACKUP_AUTOMATION.md` - Complete backup automation guide
- `2025-10-17-BACKUP_EXECUTIVE_SUMMARY.md` - Executive summary
- `2025-10-17-BACKUP_IMPLEMENTATION_REPORT.md` - Technical implementation
- `2025-10-17-BACKUP_QUICK_START.md` - Quick start guide

**Reason:** Scripts implemented and documented in [../operations/BACKUP_RESTORE.md](../operations/BACKUP_RESTORE.md). Original detailed implementation docs preserved for reference.

---

### 2025-10-17 - Initial Documentation Organization

**Security Documents** (consolidated into [../security/](../security/)):
- `INCIDENT_REPORT_2025-10-17.md` → `INCIDENTS.md`
- `INCIDENT_REPORT_2025-10-17_AUTH_SECURITY.md` → `INCIDENTS.md`
- `SECURITY_INCIDENT_2025-10-17.md` → `INCIDENTS.md`
- `SECRETS_INVENTORY.md` → `SECRETS_MANAGEMENT.md`
- `SECRETS_ROTATION_SOP.md` → `SECRETS_MANAGEMENT.md`
- `ROTATION_CHECKLIST.md` → `SECRETS_MANAGEMENT.md`
- `KEY_ROTATION_2025-10-17.md` → `SECRETS_MANAGEMENT.md`
- `GROQ_KEY_ROTATION_2025-10-17.md` → `SECRETS_MANAGEMENT.md`
- `SECURITY_AUDIT_SUMMARY.md` → `AUDIT_REPORTS.md`
- `INPUT_VALIDATION_SECURITY_SUMMARY.md` → `AUDIT_REPORTS.md`
- `PHASE_1_EXECUTIVE_SUMMARY.md` → `AUDIT_REPORTS.md`
- `PHASE_2_EXECUTIVE_SUMMARY.md` → `AUDIT_REPORTS.md`

**Operations Documents** (consolidated into [../operations/](../operations/)):
- `CLOUDWATCH_MONITORING.md` → `MONITORING.md`
- `MEMORY_MONITORING.md` → `MONITORING.md`
- `DATABASE_OPTIMIZATION.md` → `PERFORMANCE_TUNING.md`

**DNS Documents** (no longer needed):
- `DNS_QUICK_REFERENCE.md` - DNS properly configured
- `DNS_STATUS_REPORT.md`
- `DNS_MISSION_COMPLETE.md`
- `DNS_VERIFICATION_SUMMARY.md`
- `DNS_UPDATE_MANUAL.md`

**Implementation Documents:**
- `INPUT_VALIDATION.md` → `AUDIT_REPORTS.md`
- `REDIS_CACHE.md` → `PERFORMANCE_TUNING.md`
- `REDIS_CACHE_IMPLEMENTATION.md` → `PERFORMANCE_TUNING.md`
- `SECURITY_IMPLEMENTATION_ROADMAP.md` - Integrated into roadmaps
- `SECURITY_RECOMMENDATIONS.md` → `SECURITY.md`

---

### 2024-10-19 - Initial Deployment Documentation

**Deployment Summaries:**
- `2024-10-19-DEPLOYMENT_SUMMARY.md` - Initial deployment summary
- `2024-10-19-DEPLOYMENT_SUMMARY_REDIS_CACHE.md` - Redis cache deployment

**Security Policy:**
- `2024-10-19-SECURITY_POLICY.md` - Original security policy

**Testing:**
- `2024-10-19-TEST_RESULTS.md` - Initial test results
- `2024-10-19-test_artifacts.md` - Test artifacts documentation

**Reason:** Historical record of initial deployment. Current procedures in active documentation.

---

### Undated - Instance Upgrade Analysis

**Capacity Planning:**
- `INSTANCE_UPGRADE_ANALYSIS.md` - Detailed memory and performance analysis
- `UPGRADE_DECISION_SUMMARY.md` - Decision not to upgrade (stay on 2GB)

**Reason:** Analysis complete, decision made. Kept for future capacity planning reference.

**Decision:** Stay on 2GB instance (85% confidence). Current memory usage 48.9% with 51% headroom. Supports up to 50 concurrent users (25x current load).

---

## When to Consult Archives

### Historical Context
Need to understand why a decision was made? Check relevant archived docs.

### Migration Reference
Comparing old vs new procedures? Archives show previous implementation.

### Troubleshooting Legacy Issues
Dealing with an old backup or configuration? Archives may have relevant context.

### Capacity Planning
Future upgrade decisions? See `INSTANCE_UPGRADE_ANALYSIS.md` for methodology.

### CI/CD Evolution
Understanding deployment pipeline evolution? Review CI/CD archive sequence.

## Active Documentation

For current procedures, see:
- **Main Hub:** [../README.md](../README.md)
- **Operations:** [../operations/](../operations/)
- **Security:** [../security/](../security/)
- **Deployment:** [../DEPLOYMENT.md](../DEPLOYMENT.md)

## Archive Maintenance

### Adding to Archive

When consolidating or superseding documentation:

1. **Add date prefix:** `YYYY-MM-DD-ORIGINAL_NAME.md`
2. **Update this README:** Add entry explaining what and why
3. **Update links:** Ensure active docs link to replacements
4. **Preserve content:** Never delete, only archive

### Removing from Archive

Archives are **permanent**. Don't remove unless:
- Duplicate entry (keep most recent)
- Contains exposed secrets (must be removed)
- Legal requirement (document removal in this README)

---

**Archive Policy:**
- ✅ Preserve all superseded documentation
- ✅ Date-prefix all archived files
- ✅ Explain replacement in this index
- ✅ Maintain links where relevant
- ❌ Never delete historical context

**Last Updated:** 2025-10-19
**Total Archived Files:** 64
**Active Documentation:** 14 files (see [../README.md](../README.md))
