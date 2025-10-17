#!/usr/bin/env python3
"""
SmartFarm Database Index Optimizer
Creates strategic indexes for query performance
"""

import sqlite3
import time
import sys

DB_PATH = '/app/backend/data/webui.db'

def create_index(cursor, name, sql):
    """Create index and report timing"""
    try:
        start = time.time()
        cursor.execute(sql)
        elapsed = time.time() - start
        print(f"✓ {name} ({elapsed:.2f}s)")
        return True
    except sqlite3.OperationalError as e:
        if "already exists" in str(e):
            print(f"⊙ {name} (already exists)")
            return False
        raise

def main():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("Creating strategic indexes...")
    print()

    created_count = 0

    # 1. CRITICAL: Chat queries ordered by updated_at DESC
    if create_index(
        cursor,
        "idx_chat_updated_desc",
        "CREATE INDEX IF NOT EXISTS idx_chat_updated_desc ON chat(updated_at DESC)"
    ):
        created_count += 1

    # 2. File queries by user (20ms -> should be <1ms)
    if create_index(
        cursor,
        "idx_file_user_created",
        "CREATE INDEX IF NOT EXISTS idx_file_user_created ON file(user_id, created_at DESC)"
    ):
        created_count += 1

    # 3. Memory lookup optimization
    if create_index(
        cursor,
        "idx_memory_user_updated",
        "CREATE INDEX IF NOT EXISTS idx_memory_user_updated ON memory(user_id, updated_at DESC)"
    ):
        created_count += 1

    # 4. Tag lookups by chat_id (for JOIN operations)
    if create_index(
        cursor,
        "idx_chatidtag_chat_user",
        "CREATE INDEX IF NOT EXISTS idx_chatidtag_chat_user ON chatidtag(chat_id, user_id)"
    ):
        created_count += 1

    # 5. Message queries by channel
    if create_index(
        cursor,
        "idx_message_channel_created",
        "CREATE INDEX IF NOT EXISTS idx_message_channel_created ON message(channel_id, created_at DESC)"
    ):
        created_count += 1

    # 6. User lookup by username (login optimization)
    if create_index(
        cursor,
        "idx_user_username",
        "CREATE INDEX IF NOT EXISTS idx_user_username ON user(username)"
    ):
        created_count += 1

    # 7. Knowledge base access
    if create_index(
        cursor,
        "idx_knowledge_user_updated",
        "CREATE INDEX IF NOT EXISTS idx_knowledge_user_updated ON knowledge(user_id, updated_at DESC)"
    ):
        created_count += 1

    # 8. Note queries
    if create_index(
        cursor,
        "idx_note_user_updated",
        "CREATE INDEX IF NOT EXISTS idx_note_user_updated ON note(user_id, updated_at DESC)"
    ):
        created_count += 1

    print()
    print("📈 Configuring SQLite PRAGMA optimizations...")
    print()

    # WAL mode for better concurrency
    cursor.execute("PRAGMA journal_mode = WAL")
    print(f"✓ Journal mode: {cursor.fetchone()[0]}")

    # Optimal synchronous setting
    cursor.execute("PRAGMA synchronous = NORMAL")
    cursor.execute("PRAGMA synchronous")
    print(f"✓ Synchronous: {cursor.fetchone()[0]}")

    # Increase cache size to 64MB
    cursor.execute("PRAGMA cache_size = -64000")
    cursor.execute("PRAGMA cache_size")
    print(f"✓ Cache size: {cursor.fetchone()[0]} pages (64MB)")

    # Use memory for temp tables
    cursor.execute("PRAGMA temp_store = MEMORY")
    cursor.execute("PRAGMA temp_store")
    print(f"✓ Temp store: MEMORY")

    # Update query planner statistics
    print()
    print("📊 Updating query planner statistics...")
    start = time.time()
    cursor.execute("ANALYZE")
    elapsed = time.time() - start
    print(f"✓ ANALYZE completed ({elapsed:.2f}s)")

    conn.commit()
    conn.close()

    print()
    if created_count > 0:
        print(f"✅ Created {created_count} new indexes")
    else:
        print("✅ All indexes already exist")

    return 0

if __name__ == '__main__':
    sys.exit(main())
