#!/usr/bin/env python3
"""
Test script for Redis cache functionality
"""

import redis
import time
import json

def test_redis_connection():
    """Test basic Redis connection"""
    print("🔍 Testing Redis connection...")
    try:
        r = redis.Redis(host='localhost', port=6379, decode_responses=True)
        response = r.ping()
        print(f"✅ Redis connection: {response}")
        return r
    except Exception as e:
        print(f"❌ Redis connection failed: {e}")
        return None

def test_cache_operations(r):
    """Test cache read/write operations"""
    print("\n🔍 Testing cache operations...")

    # Test 1: Write
    try:
        test_key = "test:cache:query1"
        test_data = {
            "sql_query": "SELECT * FROM test",
            "results": [{"id": 1, "name": "test"}],
            "results_markdown": "| id | name |\n|---|---|\n| 1 | test |",
            "row_count": 1,
            "table_name": "test"
        }
        r.setex(test_key, 3600, json.dumps(test_data))
        print("✅ Write test: OK")
    except Exception as e:
        print(f"❌ Write test failed: {e}")
        return False

    # Test 2: Read
    try:
        cached = r.get(test_key)
        if cached:
            data = json.loads(cached)
            if data["table_name"] == "test":
                print("✅ Read test: OK")
            else:
                print("❌ Read test: Data mismatch")
                return False
        else:
            print("❌ Read test: No data found")
            return False
    except Exception as e:
        print(f"❌ Read test failed: {e}")
        return False

    # Test 3: TTL
    try:
        ttl = r.ttl(test_key)
        if ttl > 3500:  # Should be close to 3600
            print(f"✅ TTL test: OK ({ttl}s)")
        else:
            print(f"⚠️ TTL test: Unexpected value ({ttl}s)")
    except Exception as e:
        print(f"❌ TTL test failed: {e}")
        return False

    # Test 4: Delete
    try:
        r.delete(test_key)
        deleted_check = r.get(test_key)
        if deleted_check is None:
            print("✅ Delete test: OK")
        else:
            print("❌ Delete test: Key still exists")
            return False
    except Exception as e:
        print(f"❌ Delete test failed: {e}")
        return False

    return True

def test_metrics(r):
    """Test metrics recording"""
    print("\n🔍 Testing metrics...")

    try:
        # Clear previous metrics
        r.delete("excel:queries:total")
        r.delete("excel:queries:cache_hit")
        r.delete("excel:queries:cache_miss")
        r.delete("excel:response_times")

        # Record some metrics
        r.incr("excel:queries:total")
        r.incr("excel:queries:cache_hit")
        r.lpush("excel:response_times", 0.5)

        # Verify
        total = int(r.get("excel:queries:total") or 0)
        hits = int(r.get("excel:queries:cache_hit") or 0)
        times = r.lrange("excel:response_times", 0, -1)

        if total == 1 and hits == 1 and len(times) == 1:
            print("✅ Metrics test: OK")
            print(f"   - Total: {total}")
            print(f"   - Hits: {hits}")
            print(f"   - Response times: {times}")
        else:
            print("❌ Metrics test: Unexpected values")
            return False

    except Exception as e:
        print(f"❌ Metrics test failed: {e}")
        return False

    return True

def test_memory_config(r):
    """Test memory configuration"""
    print("\n🔍 Testing memory configuration...")

    try:
        info = r.info("memory")
        used_mb = info.get("used_memory", 0) / 1024 / 1024
        max_mb = info.get("maxmemory", 0) / 1024 / 1024
        policy = r.config_get("maxmemory-policy").get("maxmemory-policy")

        print(f"✅ Memory config:")
        print(f"   - Used: {used_mb:.2f} MB")
        print(f"   - Max: {max_mb:.0f} MB")
        print(f"   - Policy: {policy}")

        if max_mb == 256 and policy == "allkeys-lru":
            print("✅ Memory configuration is correct")
        else:
            print("⚠️ Memory configuration differs from expected")

    except Exception as e:
        print(f"❌ Memory config test failed: {e}")
        return False

    return True

def test_performance(r):
    """Test cache performance"""
    print("\n🔍 Testing cache performance...")

    try:
        # Write test
        start = time.time()
        for i in range(100):
            r.set(f"perf:test:{i}", f"value_{i}", ex=60)
        write_time = time.time() - start
        print(f"✅ Write performance: {100/write_time:.0f} ops/sec")

        # Read test
        start = time.time()
        for i in range(100):
            r.get(f"perf:test:{i}")
        read_time = time.time() - start
        print(f"✅ Read performance: {100/read_time:.0f} ops/sec")

        # Cleanup
        keys = r.keys("perf:test:*")
        if keys:
            r.delete(*keys)

        if write_time < 1 and read_time < 1:
            print("✅ Performance is good")
        else:
            print("⚠️ Performance might be slow")

    except Exception as e:
        print(f"❌ Performance test failed: {e}")
        return False

    return True

def main():
    print("=" * 60)
    print("🧪 SmartFarm Redis Cache Test Suite")
    print("=" * 60)

    # Test connection
    r = test_redis_connection()
    if not r:
        print("\n❌ Tests aborted: Cannot connect to Redis")
        return 1

    # Run tests
    tests_passed = 0
    tests_total = 4

    if test_cache_operations(r):
        tests_passed += 1

    if test_metrics(r):
        tests_passed += 1

    if test_memory_config(r):
        tests_passed += 1

    if test_performance(r):
        tests_passed += 1

    # Summary
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {tests_passed}/{tests_total} passed")

    if tests_passed == tests_total:
        print("✅ All tests passed! Redis cache is ready.")
        print("\n🚀 Next steps:")
        print("1. Install sql_cache_tool.py in Open WebUI")
        print("2. Install cache_admin_tool.py in Open WebUI")
        print("3. Test with real Excel files")
        print("4. Monitor cache hit rate")
        return 0
    else:
        print("⚠️ Some tests failed. Check configuration.")
        return 1

    print("=" * 60)

if __name__ == "__main__":
    exit(main())
