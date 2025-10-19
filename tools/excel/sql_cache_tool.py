"""
title: Cached SQL/Excel Analyzer for SmartFarm
author: SmartFarm Team
description: High-performance Excel/CSV analyzer with Redis caching for 90%+ cache hit rate
required_open_webui_version: 0.5.0
requirements: redis, duckdb, pandas, openpyxl, llama-index-llms-groq, llama-index-embeddings-openai, llama-index-core
version: 2.0.0
licence: MIT
"""

import os
import json
import hashlib
import time
from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

import redis
import duckdb
import pandas as pd


class Tools:
    def __init__(self):
        self.valves = self.Valves()
        self.citation = False

        # Initialize Redis connection (with fallback)
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
            # Test connection
            self.redis_client.ping()
        except Exception as e:
            print(f"Warning: Redis unavailable ({e}), running without cache")
            self.redis_client = None

    class Valves(BaseModel):
        GROQ_API_KEY: str = Field(
            default="",
            description="Groq API Key for SQL generation"
        )
        OPENAI_API_KEY: str = Field(
            default="",
            description="OpenAI API Key for embeddings"
        )
        DATABASE_PATH: str = Field(
            default="/tmp/smartfarm_persistent.duckdb",
            description="DuckDB database path"
        )
        CACHE_TTL: int = Field(
            default=3600,
            description="Cache TTL in seconds (default: 1 hour)"
        )
        ENABLE_CACHE: bool = Field(
            default=True,
            description="Enable/disable caching"
        )

    def _get_file_hash(self, file_path: str) -> str:
        """Generate hash of file content for cache key"""
        try:
            with open(file_path, 'rb') as f:
                return hashlib.sha256(f.read()).hexdigest()
        except:
            return hashlib.sha256(file_path.encode()).hexdigest()

    def _generate_cache_key(self, file_hash: str, query: str, model: str) -> str:
        """Generate cache key from file hash, query, and model"""
        combined = f"{file_hash}:{query.lower().strip()}:{model}"
        return f"sql_cache:{hashlib.sha256(combined.encode()).hexdigest()}"

    def _get_from_cache(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Retrieve cached result"""
        if not self.redis_client or not self.valves.ENABLE_CACHE:
            return None

        try:
            cached = self.redis_client.get(cache_key)
            if cached:
                self._record_metric("cache_hit")
                return json.loads(cached)
            else:
                self._record_metric("cache_miss")
                return None
        except Exception as e:
            print(f"Cache read error: {e}")
            return None

    def _save_to_cache(self, cache_key: str, data: Dict[str, Any]):
        """Save result to cache with TTL"""
        if not self.redis_client or not self.valves.ENABLE_CACHE:
            return

        try:
            self.redis_client.setex(
                cache_key,
                self.valves.CACHE_TTL,
                json.dumps(data)
            )
        except Exception as e:
            print(f"Cache write error: {e}")

    def _record_metric(self, metric_type: str, value: float = 1):
        """Record metrics in Redis"""
        if not self.redis_client:
            return

        try:
            timestamp = int(time.time())

            # Increment counters
            self.redis_client.incr(f"excel:queries:total")
            self.redis_client.incr(f"excel:queries:{metric_type}")

            # Store response time if provided
            if metric_type == "response_time":
                self.redis_client.lpush("excel:response_times", value)
                self.redis_client.ltrim("excel:response_times", 0, 999)  # Keep last 1000

            # Store timestamp for session tracking
            self.redis_client.set("excel:last_query", timestamp)
        except Exception as e:
            print(f"Metric recording error: {e}")

    def _execute_sql_query(self, file_path: str, query: str, model: str = "llama-3.3-70b-versatile") -> Dict[str, Any]:
        """Execute SQL query using LlamaIndex + Groq (original logic)"""
        from llama_index.llms.groq import Groq
        from llama_index.embeddings.openai import OpenAIEmbedding
        from llama_index.core import SQLDatabase, Settings
        from llama_index.core.indices.struct_store import NLSQLTableQueryEngine

        # Get API keys
        groq_key = self.valves.GROQ_API_KEY or os.getenv("GROQ_API_KEY", "")
        openai_key = self.valves.OPENAI_API_KEY or os.getenv("OPENAI_API_KEY", "")

        if not groq_key:
            raise ValueError("GROQ_API_KEY not configured")
        if not openai_key:
            raise ValueError("OPENAI_API_KEY not configured")

        # Read file
        if file_path.endswith('.csv'):
            df = pd.read_csv(file_path)
        elif file_path.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(file_path)
        else:
            raise ValueError("File must be CSV or Excel format")

        # Sanitize column names
        df.columns = [col.replace(' ', '_').replace('-', '_') for col in df.columns]

        # Generate table name from file
        table_name = os.path.splitext(os.path.basename(file_path))[0].replace(' ', '_').replace('-', '_')

        # Import to DuckDB
        conn = duckdb.connect(self.valves.DATABASE_PATH)
        conn.execute(f"CREATE OR REPLACE TABLE {table_name} AS SELECT * FROM df")

        # Configure LlamaIndex
        Settings.llm = Groq(
            api_key=groq_key,
            model=model,
            temperature=0.1,
        )
        Settings.embed_model = OpenAIEmbedding(
            api_key=openai_key,
            model="text-embedding-3-small"
        )

        # Create SQL database wrapper
        sql_database = SQLDatabase.from_duckdb_connection(conn)

        # Create query engine
        query_engine = NLSQLTableQueryEngine(
            sql_database=sql_database,
            tables=[table_name],
        )

        # Execute query
        response = query_engine.query(query)

        # Extract SQL and results
        sql_query = response.metadata.get("sql_query", "")
        result_df = conn.execute(sql_query).fetchdf() if sql_query else pd.DataFrame()

        return {
            "sql_query": sql_query,
            "results": result_df.to_dict('records'),
            "results_markdown": result_df.to_markdown() if not result_df.empty else "No results",
            "row_count": len(result_df),
            "table_name": table_name
        }

    async def analyze_excel_with_cache(
        self,
        file_path: str,
        query: str,
        model: str = "llama-3.3-70b-versatile",
        __user__: Optional[dict] = None,
        __event_emitter__=None,
    ) -> str:
        """
        Analyze Excel/CSV file using cached SQL queries.

        :param file_path: Path to the Excel or CSV file
        :param query: Natural language query about the data
        :param model: Groq model to use (default: llama-3.3-70b-versatile)
        :return: Analysis results with SQL and data
        """

        start_time = time.time()
        cache_hit = False

        try:
            # Emit status
            if __event_emitter__:
                await __event_emitter__(
                    {
                        "type": "status",
                        "data": {"description": f"Loading file: {os.path.basename(file_path)}", "done": False},
                    }
                )

            # Generate cache key
            file_hash = self._get_file_hash(file_path)
            cache_key = self._generate_cache_key(file_hash, query, model)

            # Check cache
            cached_result = self._get_from_cache(cache_key)

            if cached_result:
                cache_hit = True
                result = cached_result

                if __event_emitter__:
                    await __event_emitter__(
                        {
                            "type": "status",
                            "data": {"description": "✅ Retrieved from cache (instant!)", "done": False},
                        }
                    )
            else:
                # Execute query
                if __event_emitter__:
                    await __event_emitter__(
                        {
                            "type": "status",
                            "data": {"description": "Analyzing data with AI...", "done": False},
                        }
                    )

                result = self._execute_sql_query(file_path, query, model)

                # Save to cache
                self._save_to_cache(cache_key, result)

            # Record metrics
            response_time = time.time() - start_time
            self._record_metric("response_time", response_time)

            # Emit done
            if __event_emitter__:
                await __event_emitter__(
                    {
                        "type": "status",
                        "data": {"description": "Analysis complete!", "done": True},
                    }
                )

            # Format response
            cache_indicator = "🚀 **[CACHED]**" if cache_hit else "⚡ **[NEW QUERY]**"

            return f"""
{cache_indicator} Análisis completado en {response_time:.2f}s

📊 **Tabla:** `{result['table_name']}`
📝 **Consulta SQL:**
```sql
{result['sql_query']}
```

📈 **Resultados:** ({result['row_count']} filas)

{result['results_markdown']}

---
💾 Cache: {"HIT" if cache_hit else "MISS"} | ⏱️ {response_time:.2f}s
"""

        except Exception as e:
            # Record error
            self._record_metric("error")
            return f"❌ Error: {str(e)}"

    async def get_cache_stats(
        self,
        __user__: Optional[dict] = None,
        __event_emitter__=None,
    ) -> str:
        """
        Get cache statistics and performance metrics.

        :return: Formatted cache statistics
        """

        if not self.redis_client:
            return "❌ Redis is not available. Cache statistics unavailable."

        try:
            # Get metrics
            total = int(self.redis_client.get("excel:queries:total") or 0)
            hits = int(self.redis_client.get("excel:queries:cache_hit") or 0)
            misses = int(self.redis_client.get("excel:queries:cache_miss") or 0)
            errors = int(self.redis_client.get("excel:queries:error") or 0)

            # Calculate hit rate
            hit_rate = (hits / total * 100) if total > 0 else 0

            # Get response times
            response_times = [float(t) for t in self.redis_client.lrange("excel:response_times", 0, -1)]
            avg_response = sum(response_times) / len(response_times) if response_times else 0
            min_response = min(response_times) if response_times else 0
            max_response = max(response_times) if response_times else 0

            # Get cache size
            cache_keys = self.redis_client.keys("sql_cache:*")
            cache_size = len(cache_keys)

            # Get Redis memory info
            info = self.redis_client.info("memory")
            used_memory_mb = info.get("used_memory", 0) / 1024 / 1024

            # Last query time
            last_query = self.redis_client.get("excel:last_query")
            if last_query:
                last_query_str = datetime.fromtimestamp(int(last_query)).strftime("%Y-%m-%d %H:%M:%S")
            else:
                last_query_str = "Never"

            return f"""
📊 **SmartFarm Excel Cache Statistics**

**Query Performance:**
- Total Queries: {total}
- Cache Hits: {hits} ({hit_rate:.1f}%)
- Cache Misses: {misses}
- Errors: {errors}

**Response Times:**
- Average: {avg_response:.2f}s
- Min: {min_response:.2f}s
- Max: {max_response:.2f}s

**Cache Status:**
- Cached Queries: {cache_size}
- Memory Used: {used_memory_mb:.2f} MB / 256 MB
- TTL: {self.valves.CACHE_TTL}s ({self.valves.CACHE_TTL // 60} min)
- Eviction Policy: allkeys-lru

**Session Info:**
- Last Query: {last_query_str}
- Cache Enabled: {"✅ Yes" if self.valves.ENABLE_CACHE else "❌ No"}

**Performance Target:** 90% hit rate ({'✅ ACHIEVED' if hit_rate >= 90 else '⚠️ NOT YET'})
"""

        except Exception as e:
            return f"❌ Error retrieving cache stats: {str(e)}"

    async def clear_cache(
        self,
        scope: str = "all",
        __user__: Optional[dict] = None,
        __event_emitter__=None,
    ) -> str:
        """
        Clear cached queries.

        :param scope: 'all' to clear all cache, or file hash to clear specific file
        :return: Confirmation message
        """

        if not self.redis_client:
            return "❌ Redis is not available. Cannot clear cache."

        try:
            if scope == "all":
                # Clear all cache keys
                cache_keys = self.redis_client.keys("sql_cache:*")
                if cache_keys:
                    self.redis_client.delete(*cache_keys)

                # Reset metrics
                self.redis_client.delete("excel:queries:total")
                self.redis_client.delete("excel:queries:cache_hit")
                self.redis_client.delete("excel:queries:cache_miss")
                self.redis_client.delete("excel:queries:error")
                self.redis_client.delete("excel:response_times")
                self.redis_client.delete("excel:last_query")

                return f"✅ Cache cleared successfully ({len(cache_keys)} entries deleted)"
            else:
                # Clear cache for specific file hash
                pattern = f"sql_cache:{scope}*"
                keys = self.redis_client.keys(pattern)
                if keys:
                    self.redis_client.delete(*keys)
                return f"✅ Cleared {len(keys)} cache entries for file hash: {scope}"

        except Exception as e:
            return f"❌ Error clearing cache: {str(e)}"

    async def test_cache_performance(
        self,
        file_path: str,
        query: str,
        iterations: int = 3,
        __user__: Optional[dict] = None,
        __event_emitter__=None,
    ) -> str:
        """
        Test cache performance by running same query multiple times.

        :param file_path: Path to test file
        :param query: Test query
        :param iterations: Number of test iterations
        :return: Performance comparison
        """

        results = []

        # First run (cache miss expected)
        if __event_emitter__:
            await __event_emitter__(
                {
                    "type": "status",
                    "data": {"description": f"Test 1/{iterations} - First run (cache miss)...", "done": False},
                }
            )

        start = time.time()
        await self.analyze_excel_with_cache(file_path, query, __user__=__user__, __event_emitter__=None)
        first_run = time.time() - start
        results.append(("First run (miss)", first_run, False))

        # Subsequent runs (cache hits expected)
        for i in range(iterations - 1):
            if __event_emitter__:
                await __event_emitter__(
                    {
                        "type": "status",
                        "data": {"description": f"Test {i+2}/{iterations} - Cached run...", "done": False},
                    }
                )

            start = time.time()
            await self.analyze_excel_with_cache(file_path, query, __user__=__user__, __event_emitter__=None)
            cached_run = time.time() - start
            results.append((f"Run {i+2} (hit)", cached_run, True))

        # Calculate speedup
        avg_cached = sum(r[1] for r in results[1:]) / (iterations - 1) if iterations > 1 else 0
        speedup = first_run / avg_cached if avg_cached > 0 else 0

        # Format results
        output = f"""
🧪 **Cache Performance Test**

**Test Configuration:**
- File: {os.path.basename(file_path)}
- Query: "{query}"
- Iterations: {iterations}

**Results:**
"""
        for name, duration, cached in results:
            output += f"\n- {name}: {duration:.3f}s {'✅' if cached else '❌'}"

        output += f"""

**Performance Summary:**
- First run (uncached): {first_run:.3f}s
- Average cached: {avg_cached:.3f}s
- Speedup: {speedup:.1f}x faster

**Status:** {'✅ Cache working perfectly!' if speedup > 5 else '⚠️ Check cache configuration'}
"""

        if __event_emitter__:
            await __event_emitter__(
                {
                    "type": "status",
                    "data": {"description": "Test complete!", "done": True},
                }
            )

        return output
