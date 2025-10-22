"""
title: DeepSeek V3 SQL/Excel Analyzer for SmartFarm
author: SmartFarm Team
description: High-performance Excel/CSV analyzer with DeepSeek V3 and Redis caching
required_open_webui_version: 0.5.0
requirements: redis, duckdb, pandas, openpyxl, llama-index-llms-openai, llama-index-embeddings-openai, llama-index-core
version: 3.0.0
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
        DEEPSEEK_API_KEY: str = Field(
            default="",
            description="DeepSeek API Key for SQL generation (primary)"
        )
        GROQ_API_KEY: str = Field(
            default="",
            description="Groq API Key for SQL generation (fallback)"
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
        USE_DEEPSEEK: bool = Field(
            default=True,
            description="Use DeepSeek V3 (better SQL) vs Groq (fallback)"
        )
        DEEPSEEK_MODEL: str = Field(
            default="deepseek-chat",
            description="DeepSeek model name"
        )
        GROQ_MODEL: str = Field(
            default="llama-3.3-70b-versatile",
            description="Groq model name (fallback)"
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

    def _execute_sql_query(self, file_path: str, query: str, model: str = "deepseek-chat") -> Dict[str, Any]:
        """Execute SQL query using LlamaIndex + DeepSeek/Groq"""
        from llama_index.llms.openai import OpenAI  # DeepSeek compatible!
        from llama_index.llms.groq import Groq
        from llama_index.embeddings.openai import OpenAIEmbedding
        from llama_index.core import SQLDatabase, Settings
        from llama_index.core.indices.struct_store import NLSQLTableQueryEngine

        # Get API keys
        deepseek_key = self.valves.DEEPSEEK_API_KEY or os.getenv("DEEPSEEK_API_KEY", "")
        groq_key = self.valves.GROQ_API_KEY or os.getenv("GROQ_API_KEY", "")
        openai_key = self.valves.OPENAI_API_KEY or os.getenv("OPENAI_API_KEY", "")

        if not openai_key:
            raise ValueError("OPENAI_API_KEY not configured (required for embeddings)")

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

        # Configure LLM (DeepSeek or Groq)
        if self.valves.USE_DEEPSEEK and deepseek_key:
            # Use DeepSeek V3 (better SQL generation)
            Settings.llm = OpenAI(
                api_key=deepseek_key,
                api_base="https://api.deepseek.com",
                model=self.valves.DEEPSEEK_MODEL,
                temperature=0.1,
            )
            print(f"✅ Using DeepSeek V3 ({self.valves.DEEPSEEK_MODEL}) for SQL generation")
        elif groq_key:
            # Fallback to Groq
            Settings.llm = Groq(
                api_key=groq_key,
                model=self.valves.GROQ_MODEL,
                temperature=0.1,
            )
            print(f"⚠️ Using Groq ({self.valves.GROQ_MODEL}) as fallback")
        else:
            raise ValueError("No LLM API key configured (need DEEPSEEK_API_KEY or GROQ_API_KEY)")

        # Configure embeddings (always OpenAI)
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
            "table_name": table_name,
            "model_used": self.valves.DEEPSEEK_MODEL if self.valves.USE_DEEPSEEK else self.valves.GROQ_MODEL
        }

    async def analyze_excel_deepseek(
        self,
        file_path: str,
        query: str,
        model: str = "deepseek-chat",
        __user__: Optional[dict] = None,
        __event_emitter__=None,
    ) -> str:
        """
        Analyze Excel/CSV file using DeepSeek V3 with cached SQL queries.

        :param file_path: Path to the Excel or CSV file
        :param query: Natural language query about the data
        :param model: Model to use (default: deepseek-chat)
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
                            "data": {"description": "Analyzing data with DeepSeek V3...", "done": False},
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
            model_indicator = f"🤖 **Model:** {result.get('model_used', model)}"

            return f"""
{cache_indicator} {model_indicator} | Análisis completado en {response_time:.2f}s

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
📊 **SmartFarm Excel Cache Statistics (DeepSeek V3)**

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

**Configuration:**
- LLM Provider: {"DeepSeek V3" if self.valves.USE_DEEPSEEK else "Groq (fallback)"}
- Last Query: {last_query_str}
- Cache Enabled: {"✅ Yes" if self.valves.ENABLE_CACHE else "❌ No"}

**Performance Target:** 90% hit rate ({'✅ ACHIEVED' if hit_rate >= 90 else '⚠️ NOT YET'})
"""

        except Exception as e:
            return f"❌ Error retrieving cache stats: {str(e)}"
