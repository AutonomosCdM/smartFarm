"""
title: Cache Administration for SmartFarm
author: SmartFarm Team
description: Admin tool for managing Redis query cache - view stats, clear cache, configure settings
required_open_webui_version: 0.5.0
requirements: redis
version: 1.0.0
licence: MIT
"""

import os
import json
from typing import Optional, Dict, List
from datetime import datetime
from pydantic import BaseModel, Field
import redis


class Tools:
    def __init__(self):
        self.valves = self.Valves()
        self.citation = False

        # Initialize Redis connection
        self.redis_client = None
        try:
            redis_host = os.getenv("REDIS_HOST", "redis")
            redis_port = int(os.getenv("REDIS_PORT", 6379))
            self.redis_client = redis.Redis(
                host=redis_host,
                port=redis_port,
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2
            )
            self.redis_client.ping()
        except Exception as e:
            print(f"Warning: Redis unavailable ({e})")
            self.redis_client = None

    class Valves(BaseModel):
        ADMIN_ONLY: bool = Field(
            default=True,
            description="Restrict tool to admin users only"
        )

    async def cache_dashboard(
        self,
        __user__: Optional[dict] = None,
        __event_emitter__=None,
    ) -> str:
        """
        Display comprehensive cache dashboard with all metrics and status.

        :return: Formatted dashboard with cache statistics
        """

        if not self.redis_client:
            return "❌ Redis is not available."

        try:
            # Get all metrics
            total = int(self.redis_client.get("excel:queries:total") or 0)
            hits = int(self.redis_client.get("excel:queries:cache_hit") or 0)
            misses = int(self.redis_client.get("excel:queries:cache_miss") or 0)
            errors = int(self.redis_client.get("excel:queries:error") or 0)

            hit_rate = (hits / total * 100) if total > 0 else 0

            # Response times
            response_times = [float(t) for t in self.redis_client.lrange("excel:response_times", 0, -1)]
            avg_response = sum(response_times) / len(response_times) if response_times else 0
            min_response = min(response_times) if response_times else 0
            max_response = max(response_times) if response_times else 0

            # Cache info
            cache_keys = self.redis_client.keys("sql_cache:*")
            cache_size = len(cache_keys)

            # Redis info
            info = self.redis_client.info("memory")
            used_memory_mb = info.get("used_memory", 0) / 1024 / 1024
            max_memory_mb = info.get("maxmemory", 256 * 1024 * 1024) / 1024 / 1024
            memory_pct = (used_memory_mb / max_memory_mb * 100) if max_memory_mb > 0 else 0

            stats_info = self.redis_client.info("stats")
            evicted_keys = stats_info.get("evicted_keys", 0)

            # Server info
            server_info = self.redis_client.info("server")
            redis_version = server_info.get("redis_version", "unknown")
            uptime_days = server_info.get("uptime_in_days", 0)

            # Last query
            last_query = self.redis_client.get("excel:last_query")
            if last_query:
                last_query_str = datetime.fromtimestamp(int(last_query)).strftime("%Y-%m-%d %H:%M:%S")
            else:
                last_query_str = "Never"

            # Performance indicator
            if hit_rate >= 90:
                perf_indicator = "🟢 EXCELLENT"
            elif hit_rate >= 70:
                perf_indicator = "🟡 GOOD"
            elif hit_rate >= 50:
                perf_indicator = "🟠 FAIR"
            else:
                perf_indicator = "🔴 POOR"

            return f"""
# 📊 SmartFarm Cache Dashboard

## 🎯 Performance Overview
**Hit Rate:** {hit_rate:.1f}% {perf_indicator}
**Target:** 90% {'✅ ACHIEVED' if hit_rate >= 90 else '⚠️ In Progress'}

---

## 📈 Query Statistics
| Metric | Count | Percentage |
|--------|-------|------------|
| Total Queries | {total} | 100% |
| Cache Hits | {hits} | {(hits/total*100) if total > 0 else 0:.1f}% |
| Cache Misses | {misses} | {(misses/total*100) if total > 0 else 0:.1f}% |
| Errors | {errors} | {(errors/total*100) if total > 0 else 0:.1f}% |

---

## ⚡ Response Times
- **Average:** {avg_response:.3f}s
- **Min:** {min_response:.3f}s
- **Max:** {max_response:.3f}s
- **Samples:** {len(response_times)}

---

## 💾 Cache Status
- **Cached Queries:** {cache_size} entries
- **Memory Used:** {used_memory_mb:.2f} MB / {max_memory_mb:.0f} MB ({memory_pct:.1f}%)
- **Evicted Keys:** {evicted_keys} (LRU evictions)
- **Eviction Policy:** allkeys-lru

---

## 🔧 Redis Server
- **Version:** {redis_version}
- **Uptime:** {uptime_days} days
- **Last Query:** {last_query_str}

---

## 💡 Recommendations

"""
            # Add dynamic recommendations
            recommendations = []

            if hit_rate < 50:
                recommendations.append("⚠️ **Low hit rate:** Increase cache TTL or check if queries are too diverse")

            if memory_pct > 80:
                recommendations.append("⚠️ **High memory usage:** Consider increasing max memory or reducing TTL")

            if errors > 0 and total > 0 and (errors / total) > 0.1:
                recommendations.append("⚠️ **High error rate:** Check API keys and tool configuration")

            if avg_response > 5:
                recommendations.append("⚠️ **Slow responses:** Check network latency and API performance")

            if not recommendations:
                recommendations.append("✅ **All systems optimal!** Cache is performing well.")

            return f"""
# 📊 SmartFarm Cache Dashboard

## 🎯 Performance Overview
**Hit Rate:** {hit_rate:.1f}% {perf_indicator}
**Target:** 90% {'✅ ACHIEVED' if hit_rate >= 90 else '⚠️ In Progress'}

---

## 📈 Query Statistics
| Metric | Count | Percentage |
|--------|-------|------------|
| Total Queries | {total} | 100% |
| Cache Hits | {hits} | {(hits/total*100) if total > 0 else 0:.1f}% |
| Cache Misses | {misses} | {(misses/total*100) if total > 0 else 0:.1f}% |
| Errors | {errors} | {(errors/total*100) if total > 0 else 0:.1f}% |

---

## ⚡ Response Times
- **Average:** {avg_response:.3f}s
- **Min:** {min_response:.3f}s
- **Max:** {max_response:.3f}s
- **Samples:** {len(response_times)}

---

## 💾 Cache Status
- **Cached Queries:** {cache_size} entries
- **Memory Used:** {used_memory_mb:.2f} MB / {max_memory_mb:.0f} MB ({memory_pct:.1f}%)
- **Evicted Keys:** {evicted_keys} (LRU evictions)
- **Eviction Policy:** allkeys-lru

---

## 🔧 Redis Server
- **Version:** {redis_version}
- **Uptime:** {uptime_days} days
- **Last Query:** {last_query_str}

---

## 💡 Recommendations

{chr(10).join(recommendations)}

---

**Available Commands:**
- `view_cached_queries()` - List all cached queries
- `clear_all_cache()` - Clear all cache and reset metrics
- `adjust_cache_ttl(seconds)` - Adjust cache TTL
"""

        except Exception as e:
            return f"❌ Error: {str(e)}"

    async def view_cached_queries(
        self,
        limit: int = 20,
        __user__: Optional[dict] = None,
        __event_emitter__=None,
    ) -> str:
        """
        List all cached queries with their details.

        :param limit: Maximum number of queries to display (default: 20)
        :return: List of cached queries
        """

        if not self.redis_client:
            return "❌ Redis is not available."

        try:
            cache_keys = self.redis_client.keys("sql_cache:*")

            if not cache_keys:
                return "📭 No cached queries found."

            output = f"# 📋 Cached Queries ({len(cache_keys)} total)\n\n"

            # Sort keys by TTL (remaining time)
            key_info = []
            for key in cache_keys[:limit]:
                ttl = self.redis_client.ttl(key)
                data = json.loads(self.redis_client.get(key))
                key_info.append((key, ttl, data))

            # Sort by TTL descending (most time remaining first)
            key_info.sort(key=lambda x: x[1], reverse=True)

            for i, (key, ttl, data) in enumerate(key_info, 1):
                sql_query = data.get("sql_query", "N/A")[:100]  # Truncate long queries
                row_count = data.get("row_count", 0)
                table_name = data.get("table_name", "unknown")

                ttl_min = ttl // 60
                ttl_sec = ttl % 60

                output += f"""
## {i}. Query: `{key[-8:]...}`
- **Table:** {table_name}
- **SQL:** `{sql_query}...`
- **Rows:** {row_count}
- **TTL:** {ttl_min}m {ttl_sec}s

"""

            if len(cache_keys) > limit:
                output += f"\n*Showing {limit} of {len(cache_keys)} cached queries*"

            return output

        except Exception as e:
            return f"❌ Error: {str(e)}"

    async def clear_all_cache(
        self,
        confirm: str = "",
        __user__: Optional[dict] = None,
        __event_emitter__=None,
    ) -> str:
        """
        Clear all cached queries and reset metrics.

        :param confirm: Type 'YES' to confirm cache clearing
        :return: Confirmation message
        """

        if confirm != "YES":
            return """
⚠️ **Warning: This will clear all cached queries and reset metrics!**

To confirm, call this function again with:
`clear_all_cache(confirm="YES")`
"""

        if not self.redis_client:
            return "❌ Redis is not available."

        try:
            # Get count before clearing
            cache_keys = self.redis_client.keys("sql_cache:*")
            count = len(cache_keys)

            # Clear cache
            if cache_keys:
                self.redis_client.delete(*cache_keys)

            # Reset metrics
            self.redis_client.delete("excel:queries:total")
            self.redis_client.delete("excel:queries:cache_hit")
            self.redis_client.delete("excel:queries:cache_miss")
            self.redis_client.delete("excel:queries:error")
            self.redis_client.delete("excel:response_times")
            self.redis_client.delete("excel:last_query")

            return f"""
✅ **Cache cleared successfully!**

- Deleted {count} cached queries
- Reset all metrics
- Cache is now empty

Next queries will be cache misses and will rebuild the cache.
"""

        except Exception as e:
            return f"❌ Error: {str(e)}"

    async def adjust_cache_ttl(
        self,
        seconds: int,
        __user__: Optional[dict] = None,
        __event_emitter__=None,
    ) -> str:
        """
        View or get information about cache TTL settings.

        :param seconds: TTL value in seconds (informational only, actual change requires tool valve update)
        :return: TTL information and instructions
        """

        if not self.redis_client:
            return "❌ Redis is not available."

        # Get current TTL from a sample key
        cache_keys = self.redis_client.keys("sql_cache:*")
        current_ttl = "N/A"

        if cache_keys:
            sample_ttl = self.redis_client.ttl(cache_keys[0])
            current_ttl = f"{sample_ttl}s ({sample_ttl // 60}m)"

        return f"""
# ⏱️ Cache TTL Configuration

## Current Settings
- **Sample TTL:** {current_ttl}
- **Requested TTL:** {seconds}s ({seconds // 60}m {seconds % 60}s)

## To Change TTL:

1. Update tool valve in Admin Panel:
   - Go to Tools → sql_cache_tool → Settings
   - Change `CACHE_TTL` to `{seconds}`
   - Save

2. New TTL will apply to:
   - All NEW cache entries
   - Existing entries keep their original TTL

3. To apply to all entries:
   - Clear cache: `clear_all_cache(confirm="YES")`
   - Next queries will use new TTL

## Recommended TTL Values:
- **1 hour (3600s)** - Default, good for most use cases
- **30 min (1800s)** - Frequently changing data
- **6 hours (21600s)** - Stable reference data
- **24 hours (86400s)** - Static datasets

**Note:** Longer TTL = higher hit rate but older data
"""

    async def redis_health_check(
        self,
        __user__: Optional[dict] = None,
        __event_emitter__=None,
    ) -> str:
        """
        Perform comprehensive Redis health check.

        :return: Health check report
        """

        if not self.redis_client:
            return """
❌ **Redis Health Check: FAILED**

**Status:** Connection failed
**Issue:** Redis server is not reachable

**Troubleshooting:**
1. Check if Redis container is running: `docker ps | grep redis`
2. Check logs: `docker logs smartfarm-redis`
3. Verify network: `docker network inspect smartfarm-network`
4. Check environment variables: REDIS_HOST and REDIS_PORT
"""

        try:
            # Test basic operations
            tests = []

            # 1. Ping test
            try:
                self.redis_client.ping()
                tests.append(("Connection", "✅ OK", "Successfully connected to Redis"))
            except Exception as e:
                tests.append(("Connection", "❌ FAILED", str(e)))

            # 2. Write test
            try:
                test_key = "health_check_test"
                self.redis_client.set(test_key, "test", ex=10)
                tests.append(("Write", "✅ OK", "Can write to Redis"))
            except Exception as e:
                tests.append(("Write", "❌ FAILED", str(e)))

            # 3. Read test
            try:
                value = self.redis_client.get(test_key)
                if value == "test":
                    tests.append(("Read", "✅ OK", "Can read from Redis"))
                else:
                    tests.append(("Read", "⚠️ WARNING", f"Unexpected value: {value}"))
            except Exception as e:
                tests.append(("Read", "❌ FAILED", str(e)))

            # 4. Delete test
            try:
                self.redis_client.delete(test_key)
                tests.append(("Delete", "✅ OK", "Can delete from Redis"))
            except Exception as e:
                tests.append(("Delete", "❌ FAILED", str(e)))

            # 5. Memory check
            try:
                info = self.redis_client.info("memory")
                used_mb = info.get("used_memory", 0) / 1024 / 1024
                max_mb = info.get("maxmemory", 0) / 1024 / 1024
                if max_mb > 0:
                    pct = (used_mb / max_mb) * 100
                    if pct < 80:
                        tests.append(("Memory", "✅ OK", f"{used_mb:.1f}MB / {max_mb:.0f}MB ({pct:.1f}%)"))
                    else:
                        tests.append(("Memory", "⚠️ WARNING", f"High usage: {pct:.1f}%"))
                else:
                    tests.append(("Memory", "✅ OK", f"{used_mb:.1f}MB used"))
            except Exception as e:
                tests.append(("Memory", "❌ FAILED", str(e)))

            # 6. Persistence check
            try:
                info = self.redis_client.info("persistence")
                rdb_last_save = info.get("rdb_last_save_time", 0)
                if rdb_last_save > 0:
                    last_save = datetime.fromtimestamp(rdb_last_save).strftime("%Y-%m-%d %H:%M:%S")
                    tests.append(("Persistence", "✅ OK", f"Last save: {last_save}"))
                else:
                    tests.append(("Persistence", "⚠️ WARNING", "No persistence configured"))
            except Exception as e:
                tests.append(("Persistence", "❌ FAILED", str(e)))

            # Format results
            output = "# 🏥 Redis Health Check\n\n"

            all_ok = all(t[1].startswith("✅") for t in tests)
            if all_ok:
                output += "**Overall Status:** 🟢 HEALTHY\n\n"
            elif any("❌" in t[1] for t in tests):
                output += "**Overall Status:** 🔴 CRITICAL\n\n"
            else:
                output += "**Overall Status:** 🟡 WARNING\n\n"

            output += "| Test | Status | Details |\n"
            output += "|------|--------|----------|\n"

            for test_name, status, details in tests:
                output += f"| {test_name} | {status} | {details} |\n"

            return output

        except Exception as e:
            return f"❌ Health check failed: {str(e)}"
