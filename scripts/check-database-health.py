#!/usr/bin/env python3
"""
SmartFarm Database Health Check
Monitor database performance and statistics
"""

import sqlite3
from datetime import datetime

DB_PATH = '/app/backend/data/webui.db'

def main():
    print("🏥 SmartFarm Database Health Check")
    print("=" * 50)
    print()

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
        ('synchronous', 'NORMAL'),
        ('cache_size', '-64000'),
        ('temp_store', 'MEMORY')
    ]

    for pragma, expected in settings:
        cursor.execute(f'PRAGMA {pragma}')
        value = cursor.fetchone()[0]

        if pragma == 'cache_size':
            status = "✓" if int(value) <= -60000 else "⚠"
            print(f"{status} {pragma:15s} {value} pages (64MB)")
        elif pragma == 'synchronous':
            val_int = int(value)
            val_str = {0: 'OFF', 1: 'NORMAL', 2: 'FULL', 3: 'EXTRA'}.get(val_int, str(val_int))
            status = "✓" if val_int <= 1 else "⚠"
            print(f"{status} {pragma:15s} {val_str}")
        elif pragma == 'temp_store':
            val_int = int(value)
            val_str = {0: 'DEFAULT', 1: 'FILE', 2: 'MEMORY'}.get(val_int, str(val_int))
            status = "✓" if val_int == 2 else "⚠"
            print(f"{status} {pragma:15s} {val_str}")
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

    # WAL info
    cursor.execute('PRAGMA wal_checkpoint(PASSIVE)')
    checkpoint_result = cursor.fetchone()
    print(f"   WAL checkpoint: {checkpoint_result}")

    conn.close()

    print()
    print("=" * 50)
    print(f"Health check completed at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == '__main__':
    main()
