#!/bin/bash

# SmartFarm Database Optimization Script
# Applies strategic indexes and SQLite optimizations for blazing fast queries

set -e

echo "🚀 SmartFarm Database Optimization"
echo "=================================="
echo ""

# Check if running on production
if [ -f /opt/smartfarm/docker-compose.yml ]; then
    PRODUCTION=true
    DB_PATH="/app/backend/data/webui.db"
    DOCKER_CMD="sudo docker exec open-webui"
else
    PRODUCTION=false
    DB_PATH="/app/backend/data/webui.db"
    DOCKER_CMD="docker exec open-webui"
fi

echo "📊 Analyzing current database state..."

# Get current stats
$DOCKER_CMD python3 -c "
import sqlite3
conn = sqlite3.connect('$DB_PATH')
cursor = conn.cursor()

# Database size
cursor.execute('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()')
size_mb = cursor.fetchone()[0] / 1024 / 1024
print(f'Current size: {size_mb:.2f} MB')

# Free pages (fragmentation)
cursor.execute('PRAGMA freelist_count')
free_pages = cursor.fetchone()[0]
print(f'Fragmentation: {free_pages} free pages')
"

echo ""
echo "🔧 Creating performance indexes..."
echo ""

# Apply optimizations
$DOCKER_CMD python3 << 'PYTHON_SCRIPT'
import sqlite3
import time

conn = sqlite3.connect('/app/backend/data/webui.db')
cursor = conn.cursor()

# Track created indexes
created_indexes = []

def create_index(name, sql):
    try:
        start = time.time()
        cursor.execute(sql)
        elapsed = time.time() - start
        created_indexes.append((name, elapsed))
        print(f"✓ {name} ({elapsed:.2f}s)")
        return True
    except sqlite3.OperationalError as e:
        if "already exists" in str(e):
            print(f"⊙ {name} (already exists)")
            return False
        raise

# Strategic indexes based on query analysis
print("Creating strategic indexes...")

# 1. CRITICAL: Chat queries ordered by updated_at DESC (most common operation)
create_index(
    "idx_chat_updated_desc",
    "CREATE INDEX IF NOT EXISTS idx_chat_updated_desc ON chat(updated_at DESC)"
)

# 2. File queries by user (20ms -> should be <1ms)
create_index(
    "idx_file_user_created",
    "CREATE INDEX IF NOT EXISTS idx_file_user_created ON file(user_id, created_at DESC)"
)

# 3. Memory lookup optimization
create_index(
    "idx_memory_user_updated",
    "CREATE INDEX IF NOT EXISTS idx_memory_user_updated ON memory(user_id, updated_at DESC)"
)

# 4. Tag lookups by chat_id (for JOIN operations)
create_index(
    "idx_chatidtag_chat_user",
    "CREATE INDEX IF NOT EXISTS idx_chatidtag_chat_user ON chatidtag(chat_id, user_id)"
)

# 5. Message queries by channel
create_index(
    "idx_message_channel_created",
    "CREATE INDEX IF NOT EXISTS idx_message_channel_created ON message(channel_id, created_at DESC)"
)

# 6. User lookup by username (login optimization)
create_index(
    "idx_user_username",
    "CREATE INDEX IF NOT EXISTS idx_user_username ON user(username)"
)

# 7. Knowledge base access
create_index(
    "idx_knowledge_user_updated",
    "CREATE INDEX IF NOT EXISTS idx_knowledge_user_updated ON knowledge(user_id, updated_at DESC)"
)

# 8. Note queries
create_index(
    "idx_note_user_updated",
    "CREATE INDEX IF NOT EXISTS idx_note_user_updated ON note(user_id, updated_at DESC)"
)

print("")
print("📈 Configuring SQLite PRAGMA optimizations...")

# WAL mode for better concurrency
cursor.execute("PRAGMA journal_mode = WAL")
print(f"✓ Journal mode: {cursor.fetchone()[0]}")

# Optimal synchronous setting (balance safety/speed)
cursor.execute("PRAGMA synchronous = NORMAL")
print(f"✓ Synchronous: {cursor.fetchone()[0]}")

# Increase cache size to 64MB
cursor.execute("PRAGMA cache_size = -64000")
print(f"✓ Cache size: 64MB")

# Use memory for temp tables
cursor.execute("PRAGMA temp_store = MEMORY")
print(f"✓ Temp store: {cursor.fetchone()[0]}")

# Update query planner statistics
print("")
print("📊 Updating query planner statistics...")
start = time.time()
cursor.execute("ANALYZE")
elapsed = time.time() - start
print(f"✓ ANALYZE completed ({elapsed:.2f}s)")

conn.commit()
conn.close()

if created_indexes:
    print("")
    print(f"✅ Created {len(created_indexes)} new indexes")
else:
    print("")
    print("✅ All indexes already exist")

PYTHON_SCRIPT

echo ""
echo "🧹 Running VACUUM to defragment and reclaim space..."
echo "(This may take a few moments for large databases)"
echo ""

# Run VACUUM in a separate connection
$DOCKER_CMD python3 -c "
import sqlite3
import time

conn = sqlite3.connect('/app/backend/data/webui.db')
cursor = conn.cursor()

# Check integrity before VACUUM
print('Checking database integrity...')
cursor.execute('PRAGMA integrity_check')
result = cursor.fetchone()[0]
if result != 'ok':
    print(f'⚠️  Integrity check failed: {result}')
    exit(1)
print('✓ Integrity check passed')

# Get size before
cursor.execute('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()')
size_before = cursor.fetchone()[0]

print('Running VACUUM...')
start = time.time()
cursor.execute('VACUUM')
elapsed = time.time() - start

# Get size after
cursor.execute('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()')
size_after = cursor.fetchone()[0]

saved_mb = (size_before - size_after) / 1024 / 1024
print(f'✓ VACUUM completed ({elapsed:.2f}s)')
print(f'✓ Space reclaimed: {saved_mb:.2f} MB')

conn.close()
"

echo ""
echo "✅ Database optimization complete!"
echo ""
echo "Next steps:"
echo "  1. Run benchmark: ./scripts/benchmark-database.sh"
echo "  2. Monitor performance: ./scripts/check-database-health.sh"
echo "  3. Schedule weekly maintenance: sudo crontab -e"
echo "     Add: 0 3 * * 0 /opt/smartfarm/scripts/vacuum-database.sh"
echo ""
