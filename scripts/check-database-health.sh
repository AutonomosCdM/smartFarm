#!/bin/bash

# SmartFarm Database Health Check
# Monitor database performance and statistics

set -e

echo "🏥 SmartFarm Database Health Check"
echo "=================================="
echo ""

# Check if running on production
if [ -f /opt/smartfarm/docker-compose.yml ]; then
    DOCKER_CMD="sudo docker exec open-webui"
else
    DOCKER_CMD="docker exec open-webui"
fi

# Run health check
$DOCKER_CMD python3 << 'PYTHON_SCRIPT'
import sqlite3
from datetime import datetime

DB_PATH = '/app/backend/data/webui.db'
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

print("📊 DATABASE STATISTICS")
print("-" * 50)

# Database size
cursor.execute('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()')
size_bytes = cursor.fetchone()[0]
size_mb = size_bytes / 1024 / 1024
print(f"Database size: {size_mb:.2f} MB")

# Fragmentation
cursor.execute('PRAGMA freelist_count')
free_pages = cursor.fetchone()[0]
cursor.execute('PRAGMA page_count')
total_pages = cursor.fetchone()[0]
frag_pct = (free_pages / total_pages * 100) if total_pages > 0 else 0
print(f"Fragmentation: {free_pages} free pages ({frag_pct:.1f}%)")

# Table row counts
print()
print("📋 TABLE ROW COUNTS")
print("-" * 50)

tables = [
    'auth', 'chat', 'chatidtag', 'config', 'document', 'feedback',
    'file', 'folder', 'function', 'group', 'knowledge', 'memory',
    'message', 'model', 'note', 'prompt', 'tag', 'tool', 'user',
    'channel', 'channel_member'
]

total_rows = 0
for table in sorted(tables):
    try:
        cursor.execute(f'SELECT COUNT(*) FROM {table}')
        count = cursor.fetchone()[0]
        if count > 0:
            print(f"  {table:20s} {count:>8,} rows")
            total_rows += count
    except:
        pass

print(f"  {'TOTAL':20s} {total_rows:>8,} rows")

# Index statistics
print()
print("🔍 INDEX STATISTICS")
print("-" * 50)

cursor.execute("""
    SELECT name, tbl_name
    FROM sqlite_master
    WHERE type='index' AND name LIKE 'idx_%'
    ORDER BY tbl_name, name
""")

custom_indexes = cursor.fetchall()
print(f"Custom indexes: {len(custom_indexes)}")

for idx_name, tbl_name in custom_indexes:
    print(f"  ✓ {tbl_name}.{idx_name}")

# PRAGMA settings
print()
print("⚙️  PRAGMA SETTINGS")
print("-" * 50)

settings = [
    ('journal_mode', 'WAL'),
    ('synchronous', '1 (NORMAL)'),
    ('cache_size', '-64000 (64MB)'),
    ('temp_store', '2 (MEMORY)')
]

for pragma, expected in settings:
    cursor.execute(f'PRAGMA {pragma}')
    value = cursor.fetchone()[0]

    if pragma == 'cache_size':
        status = "✓" if int(value) <= -60000 else "⚠"
        print(f"{status} {pragma:15s} {value} pages")
    elif pragma == 'synchronous':
        status = "✓" if int(value) <= 1 else "⚠"
        print(f"{status} {pragma:15s} {value} ({expected.split('(')[1].split(')')[0]})")
    elif pragma == 'temp_store':
        status = "✓" if int(value) == 2 else "⚠"
        print(f"{status} {pragma:15s} {value} (MEMORY)")
    else:
        status = "✓"
        print(f"{status} {pragma:15s} {value}")

# Integrity check
print()
print("🔐 INTEGRITY CHECK")
print("-" * 50)

cursor.execute('PRAGMA quick_check')
result = cursor.fetchone()[0]
status = "✅" if result == "ok" else "❌"
print(f"{status} Database integrity: {result}")

# Vacuum recommendation
print()
print("🧹 MAINTENANCE RECOMMENDATIONS")
print("-" * 50)

if frag_pct > 10:
    print("⚠️  High fragmentation detected!")
    print("   Run: ./scripts/vacuum-database.sh")
elif frag_pct > 5:
    print("ℹ️  Moderate fragmentation")
    print("   Consider running VACUUM if performance degrades")
else:
    print("✅ Fragmentation levels are healthy")

# Last vacuum check (WAL checkpoint)
cursor.execute('PRAGMA wal_checkpoint(PASSIVE)')
checkpoint_result = cursor.fetchone()
print(f"   WAL checkpoint: {checkpoint_result}")

conn.close()

print()
print("=" * 50)
print(f"Health check completed at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
PYTHON_SCRIPT

echo ""
