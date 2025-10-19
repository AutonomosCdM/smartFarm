# Root Directory Cleanup Migration Plan

**Date:** October 19, 2024
**Purpose:** Transform root directory from cluttered state to professional, production-ready structure

## Current Issues

1. **Tool Files in Root** (5 files)
   - cache_admin_tool.py
   - csv_analyzer_tool.py
   - export_excel_tool.py
   - sql_cache_tool.py
   - test_redis_cache.py

2. **Test/Development Files** (4 files)
   - produccion_test.csv
   - test_artifacts.md
   - test_dashboard.html
   - TEST_RESULTS.md

3. **Duplicate/Obsolete Files** (3 files)
   - DEPLOYMENT_SUMMARY.md (obsolete)
   - DEPLOYMENT_SUMMARY_REDIS_CACHE.md (obsolete)
   - .env.monitor (unused)

4. **Misplaced Directories** (5 directories)
   - monitoring/ → should be in docs/operations/
   - security/ → Python modules should be in tools/
   - pipelines/ → empty, should be removed
   - tests/ → keep but organize
   - __pycache__/ → should be removed

5. **System Files** (2 files)
   - .DS_Store → should be removed
   - __pycache__/ → should be removed

6. **Documentation Sprawl** (2 files)
   - SECURITY.md → duplicate of docs/SECURITY.md
   - SECURITY_HARDENING_SUMMARY.md → should be in docs/security/

## Migration Actions

### Phase 1: Create New Structure
```bash
tools/                      # All Python tools
├── excel/                  # Excel processing tools
│   ├── cache_admin_tool.py
│   ├── csv_analyzer_tool.py
│   ├── export_excel_tool.py
│   └── sql_cache_tool.py
├── security/              # Security modules
│   ├── file_validator.py
│   ├── output_sanitizer.py
│   ├── rate_limiter.py
│   └── sql_validator.py
└── __init__.py
```

### Phase 2: Move Files

#### Tools Migration
- `cache_admin_tool.py` → `tools/excel/cache_admin_tool.py`
- `csv_analyzer_tool.py` → `tools/excel/csv_analyzer_tool.py`
- `export_excel_tool.py` → `tools/excel/export_excel_tool.py`
- `sql_cache_tool.py` → `tools/excel/sql_cache_tool.py`
- `test_redis_cache.py` → `tests/redis/test_redis_cache.py`

#### Security Migration
- `security/*.py` → `tools/security/`
- `security/README.md` → `docs/security/SECURITY_MODULES.md`

#### Test Files Migration
- `produccion_test.csv` → `data/test/produccion_test.csv`
- `test_artifacts.md` → `docs/archive/2024-10-19-test_artifacts.md`
- `test_dashboard.html` → `docs/archive/2024-10-19-test_dashboard.html`
- `TEST_RESULTS.md` → `docs/archive/2024-10-19-TEST_RESULTS.md`

#### Documentation Migration
- `DEPLOYMENT_SUMMARY.md` → `docs/archive/2024-10-19-DEPLOYMENT_SUMMARY.md`
- `DEPLOYMENT_SUMMARY_REDIS_CACHE.md` → `docs/archive/2024-10-19-DEPLOYMENT_SUMMARY_REDIS_CACHE.md`
- `SECURITY_HARDENING_SUMMARY.md` → `docs/security/HARDENING_SUMMARY.md`
- `SECURITY.md` → Remove (duplicate of docs/SECURITY.md)
- `monitoring/` → `docs/operations/monitoring/`

### Phase 3: Clean Up
- Remove `.env.monitor` (unused)
- Remove `.DS_Store`
- Remove `__pycache__/`
- Remove empty `pipelines/` directory
- Update `.gitignore` to prevent future clutter

### Phase 4: Update References
- Update any import statements in Python files
- Update documentation references
- Update CLAUDE.md if needed

## Final Root Structure

```
smartFarm_v5/
├── .claude/                # Claude configuration ✓
├── .github/                # GitHub workflows ✓
├── .git/                   # Git repository ✓
├── data/                   # Data directory ✓
├── deployment/             # Deployment scripts ✓
├── docs/                   # Documentation ✓
├── scripts/                # Operational scripts ✓
├── tests/                  # Test files ✓
├── tools/                  # Python tools (NEW)
├── .env                    # Environment variables ✓
├── .env.example            # Environment template ✓
├── .gitignore              # Git ignore rules ✓
├── CLAUDE.md               # Claude instructions ✓
├── CONTRIBUTING.md         # Contribution guide ✓
├── docker-compose.yml      # Docker services ✓
├── LICENSE                 # License file ✓
└── README.md               # Project readme ✓
```

## Rollback Plan

If any issues arise:
1. All moves are logged in this document
2. Git history preserves original locations
3. No data is deleted, only moved/archived

## Success Criteria

✅ Root directory contains only 15 items (8 dirs, 7 files)
✅ All Python tools organized in `tools/`
✅ All test files in appropriate locations
✅ No duplicate or obsolete files in root
✅ Clean, professional appearance
✅ Follows industry best practices