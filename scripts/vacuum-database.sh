#!/bin/bash

# SmartFarm Weekly Database Maintenance
# Run VACUUM to defragment and optimize database
# Designed for cron: 0 3 * * 0 (Sundays at 3 AM)

set -e

LOG_FILE="/opt/smartfarm/logs/vacuum-$(date +%Y%m%d-%H%M%S).log"
mkdir -p /opt/smartfarm/logs

exec 1> >(tee -a "$LOG_FILE")
exec 2>&1

echo "🧹 SmartFarm Weekly Database VACUUM"
echo "===================================="
echo "Started at: $(date)"
echo ""

# Check if running on production
if [ -f /opt/smartfarm/docker-compose.yml ]; then
    DOCKER_CMD="sudo docker exec open-webui"
else
    DOCKER_CMD="docker exec open-webui"
fi

# Run VACUUM
$DOCKER_CMD python3 << 'PYTHON_SCRIPT'
import sqlite3
import time
from datetime import datetime

DB_PATH = '/app/backend/data/webui.db'
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Get size before
cursor.execute('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()')
size_before = cursor.fetchone()[0]
size_before_mb = size_before / 1024 / 1024

# Fragmentation before
cursor.execute('PRAGMA freelist_count')
free_pages_before = cursor.fetchone()[0]

print(f"Database size before: {size_before_mb:.2f} MB")
print(f"Free pages before: {free_pages_before}")
print()

# Integrity check
print("Checking database integrity...")
cursor.execute('PRAGMA integrity_check')
result = cursor.fetchone()[0]
if result != 'ok':
    print(f"❌ Integrity check failed: {result}")
    exit(1)
print("✓ Integrity check passed")
print()

# Run VACUUM
print("Running VACUUM...")
start = time.time()
cursor.execute('VACUUM')
elapsed = time.time() - start
print(f"✓ VACUUM completed in {elapsed:.2f}s")
print()

# Get size after
cursor.execute('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()')
size_after = cursor.fetchone()[0]
size_after_mb = size_after / 1024 / 1024

# Fragmentation after
cursor.execute('PRAGMA freelist_count')
free_pages_after = cursor.fetchone()[0]

saved_bytes = size_before - size_after
saved_mb = saved_bytes / 1024 / 1024
saved_pct = (saved_bytes / size_before * 100) if size_before > 0 else 0

print(f"Database size after: {size_after_mb:.2f} MB")
print(f"Free pages after: {free_pages_after}")
print(f"Space reclaimed: {saved_mb:.2f} MB ({saved_pct:.1f}%)")
print()

# Update statistics
print("Updating query planner statistics...")
cursor.execute('ANALYZE')
print("✓ ANALYZE completed")
print()

# WAL checkpoint
print("Checkpointing WAL...")
cursor.execute('PRAGMA wal_checkpoint(TRUNCATE)')
checkpoint_result = cursor.fetchone()
print(f"✓ WAL checkpoint: {checkpoint_result}")

conn.close()

print()
print(f"✅ Maintenance completed at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
PYTHON_SCRIPT

echo ""
echo "Completed at: $(date)"
echo "Log saved to: $LOG_FILE"
echo ""

# Keep only last 10 vacuum logs
cd /opt/smartfarm/logs
ls -t vacuum-*.log 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true

exit 0
