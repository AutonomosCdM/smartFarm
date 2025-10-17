#!/usr/bin/env python3
"""
SmartFarm Database Benchmark
Measures query performance to validate optimizations
"""

import sqlite3
import time
import sys

DB_PATH = '/app/backend/data/webui.db'

def benchmark(cursor, name, query, params=()):
    """Benchmark a query and return timing"""
    start = time.time()
    cursor.execute(query, params)
    cursor.fetchall()
    elapsed = (time.time() - start) * 1000  # Convert to ms
    return name, elapsed

def main():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("🏎️  SmartFarm Database Benchmark")
    print("=" * 50)
    print()

    # Get a sample user_id
    cursor.execute('SELECT id FROM user LIMIT 1')
    user_result = cursor.fetchone()
    if not user_result:
        print("❌ No users found in database")
        return 1
    user_id = user_result[0]

    # Run benchmarks
    results = []

    # Query 1: Recent chats (CRITICAL - was 294ms)
    results.append(benchmark(
        cursor,
        "Q1: Recent chats (20)",
        "SELECT * FROM chat ORDER BY updated_at DESC LIMIT 20"
    ))

    # Query 2: User chats with index
    results.append(benchmark(
        cursor,
        "Q2: User chats (50)",
        "SELECT * FROM chat WHERE user_id = ? ORDER BY updated_at DESC LIMIT 50",
        (user_id,)
    ))

    # Query 3: Model lookup (should be fast)
    results.append(benchmark(
        cursor,
        "Q3: Model by ID",
        "SELECT * FROM model WHERE id = ?",
        ('llama-3.3-70b-versatile',)
    ))

    # Query 4: Tags by user
    results.append(benchmark(
        cursor,
        "Q4: Tags by user",
        "SELECT * FROM tag WHERE user_id = ?",
        (user_id,)
    ))

    # Query 5: Chat with tags (JOIN)
    results.append(benchmark(
        cursor,
        "Q5: Chats with tags",
        "SELECT c.*, t.tag_name FROM chat c LEFT JOIN chatidtag t ON c.id = t.chat_id WHERE c.user_id = ?",
        (user_id,)
    ))

    # Query 6: Files by user (was 20ms)
    results.append(benchmark(
        cursor,
        "Q6: Files by user",
        "SELECT * FROM file WHERE user_id = ?",
        (user_id,)
    ))

    # Query 7: Memory retrieval (should use new index)
    results.append(benchmark(
        cursor,
        "Q7: Memory by user",
        "SELECT * FROM memory WHERE user_id = ? ORDER BY updated_at DESC",
        (user_id,)
    ))

    # Query 8: Knowledge base
    results.append(benchmark(
        cursor,
        "Q8: Knowledge by user",
        "SELECT * FROM knowledge WHERE user_id = ? ORDER BY updated_at DESC",
        (user_id,)
    ))

    # Display results
    print("Query Performance Results:")
    print("-" * 50)

    total_time = 0
    fast_queries = 0
    slow_queries = 0

    for name, elapsed in results:
        status = "🟢" if elapsed < 10 else "🟡" if elapsed < 50 else "🔴"
        print(f"{status} {name:30s} {elapsed:8.2f}ms")

        total_time += elapsed
        if elapsed < 100:
            fast_queries += 1
        else:
            slow_queries += 1

    print("-" * 50)
    print(f"Total queries: {len(results)}")
    print(f"Fast queries (<100ms): {fast_queries}")
    print(f"Slow queries (≥100ms): {slow_queries}")
    print(f"Average query time: {total_time/len(results):.2f}ms")
    print()

    # Check index usage for critical query
    print("Index Usage Analysis:")
    print("-" * 50)
    cursor.execute('EXPLAIN QUERY PLAN SELECT * FROM chat ORDER BY updated_at DESC LIMIT 20')
    plan = cursor.fetchall()
    for row in plan:
        print(f"  {row}")

    conn.close()

    if slow_queries == 0:
        print()
        print("✅ All queries under 100ms! BLAZING FAST!")
        return 0
    else:
        print()
        print(f"⚠️  {slow_queries} queries still need optimization")
        return 1

if __name__ == '__main__':
    sys.exit(main())
