# SmartFarm Performance Tuning Guide

## Overview

This guide covers performance optimization techniques for SmartFarm, including database tuning, memory optimization, and caching strategies.

## Performance Baseline

### Current Performance Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Page Load Time | <2s | <1s | 🔧 Optimizing |
| API Response Time | 200ms | <100ms | 🔧 Optimizing |
| Database Query Time | 1.9ms avg | <1ms | ✅ Optimized |
| Memory Usage | 900MB | <800MB | ⚠️ Monitoring |
| CPU Usage (idle) | <5% | <5% | ✅ Good |
| Concurrent Users | 10-20 | 50+ | 📋 Planned |

## Database Optimization

### Optimization Results (Implemented 2025-10-17)

**Performance Improvements Achieved:**

| Query Type | Before | After | Improvement |
|------------|--------|-------|-------------|
| Chat history (Q1) | 294.28ms | 14.76ms | **20x faster** |
| File queries (Q6) | 20.86ms | 0.09ms | **222x faster** |
| Tag queries (Q5) | 1.24ms | 0.08ms | **15x faster** |
| Memory queries (Q7) | 0.52ms | 0.21ms | **2.5x faster** |

### Indexes Created

```sql
-- Chat performance
CREATE INDEX idx_chat_user_created ON chat(user_id, created_at DESC);
CREATE INDEX idx_chat_history_full ON chat_history(chat_id, created_at DESC);
CREATE INDEX idx_chat_archived ON chat(archived, updated_at DESC);

-- File performance
CREATE INDEX idx_file_user_created ON file(user_id, created_at DESC);
CREATE INDEX idx_file_hash ON file(hash);

-- Memory performance
CREATE INDEX idx_memory_user ON memory(user_id);

-- Tag performance
CREATE INDEX idx_tag_chat_name ON tag(chat_id, name);
CREATE INDEX idx_tag_user ON tag(user_id, name);
```

### Database Configuration

```sql
-- Enable Write-Ahead Logging for better concurrency
PRAGMA journal_mode = WAL;

-- Set cache size (64MB)
PRAGMA cache_size = -64000;

-- Optimize for read-heavy workload
PRAGMA temp_store = MEMORY;
PRAGMA synchronous = NORMAL;

-- Enable query statistics
PRAGMA stats = ON;
```

### Maintenance Schedule

```bash
# Weekly VACUUM (Sundays at 3 AM)
0 3 * * 0 docker exec open-webui sqlite3 /app/backend/data/webui.db "VACUUM; ANALYZE;"
```

## Memory Optimization

### Current Memory Usage Breakdown

```
Total: 900MB
├── Python Runtime: 150MB
├── ML Libraries: 400MB
│   ├── PyTorch: 200MB
│   ├── Transformers: 150MB
│   └── Other: 50MB
├── Application: 250MB
│   ├── Open WebUI: 150MB
│   ├── FastAPI: 50MB
│   └── WebSockets: 50MB
└── Database Cache: 100MB
```

### Memory Reduction Strategies

#### 1. Disable Unused Features

```python
# In Open WebUI settings
FEATURES = {
    'image_generation': False,  # Save ~100MB
    'voice_synthesis': False,   # Save ~50MB
    'local_models': False,      # Save ~200MB
}
```

#### 2. Optimize Docker Image

```dockerfile
# Use slim base image
FROM python:3.11-slim

# Multi-stage build to reduce size
FROM python:3.11-slim as builder
# Build dependencies
FROM python:3.11-slim as runtime
# Copy only necessary files
```

#### 3. Implement Lazy Loading

```python
# Load models only when needed
def get_embedding_model():
    if not hasattr(g, 'embedding_model'):
        g.embedding_model = load_model()
    return g.embedding_model
```

## Caching Strategy

### Redis Cache Implementation (Planned)

```yaml
# docker-compose.yml addition
redis:
  image: redis:7-alpine
  container_name: smartfarm-redis
  restart: unless-stopped
  ports:
    - "6379:6379"
  volumes:
    - redis-data:/data
  command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
```

### Cache Layers

```
┌─────────────────────────────────────┐
│         Cache Hierarchy             │
├─────────────────────────────────────┤
│ L1: Browser Cache (Static Assets)   │
│     TTL: 7 days                     │
├─────────────────────────────────────┤
│ L2: CloudFlare CDN (Future)         │
│     TTL: 1 hour                     │
├─────────────────────────────────────┤
│ L3: Application Cache (Redis)       │
│     TTL: 5 minutes                  │
├─────────────────────────────────────┤
│ L4: Database Cache (SQLite)         │
│     Size: 64MB                      │
└─────────────────────────────────────┘
```

### What to Cache

| Data Type | Cache Duration | Storage |
|-----------|---------------|---------|
| User sessions | 1 hour | Redis |
| API responses | 5 minutes | Redis |
| Knowledge base | 30 minutes | Redis |
| Static assets | 7 days | Browser |
| Database queries | 1 minute | Application |

## Network Optimization

### Nginx Configuration

```nginx
# Enable compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml+rss;

# Enable caching for static assets
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 7d;
    add_header Cache-Control "public, immutable";
}

# Enable HTTP/2
listen 443 ssl http2;

# Optimize buffer sizes
client_body_buffer_size 128k;
client_max_body_size 50m;
client_header_buffer_size 1k;
large_client_header_buffers 4 8k;
```

### WebSocket Optimization

```nginx
# WebSocket specific optimizations
location /ws {
    proxy_pass http://localhost:8080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400;
    proxy_send_timeout 86400;
    proxy_buffer_size 64k;
    proxy_buffers 16 32k;
    proxy_busy_buffers_size 64k;
}
```

## Application Optimization

### API Response Optimization

```python
# Implement pagination
@app.get("/api/chats")
async def get_chats(
    limit: int = 20,
    offset: int = 0,
    user_id: str = Depends(get_current_user)
):
    return await get_paginated_chats(user_id, limit, offset)

# Use async operations
async def get_chat_history(chat_id: str):
    # Async database query
    history = await db.fetch_all(
        "SELECT * FROM chat_history WHERE chat_id = ? ORDER BY created_at DESC LIMIT 100",
        chat_id
    )
    return history
```

### Groq API Optimization

```python
# Optimize token usage
DEFAULT_MAX_TOKENS = 1000  # Reduce from 2000
DEFAULT_TEMPERATURE = 0.7  # Reduce randomness for caching

# Implement request batching
async def batch_groq_requests(prompts: List[str]):
    tasks = [groq_api_call(prompt) for prompt in prompts]
    return await asyncio.gather(*tasks)

# Cache common responses
@cache.memoize(timeout=300)
def get_groq_response(prompt_hash: str):
    return groq_api_call(prompt)
```

## Monitoring Performance

### Performance Monitoring Commands

```bash
# Real-time performance stats
docker stats --no-stream

# Database query performance
docker exec open-webui sqlite3 /app/backend/data/webui.db \
  "SELECT sql, COUNT(*) as count, AVG(time) as avg_time
   FROM stats GROUP BY sql ORDER BY avg_time DESC LIMIT 10"

# API response times
docker logs open-webui 2>&1 | grep "Request completed" | \
  awk '{print $NF}' | sort -n | \
  awk '{sum+=$1; count++} END {print "Average:", sum/count, "ms"}'

# Memory profiling
docker exec open-webui python -m memory_profiler app.py
```

### Performance Testing

```bash
# Load testing with Apache Bench
ab -n 1000 -c 10 https://smartfarm.autonomos.dev/

# API endpoint testing
for i in {1..100}; do
  time curl -s https://smartfarm.autonomos.dev/api/health > /dev/null
done | awk '{sum+=$1; count++} END {print "Average:", sum/count}'

# Database stress test
docker exec open-webui sqlite3 /app/backend/data/webui.db \
  ".timer on" \
  "SELECT * FROM chat ORDER BY created_at DESC LIMIT 1000;" \
  ".timer off"
```

## Scaling Strategy

### Vertical Scaling (Current)

| Instance | RAM | CPU | Storage | Cost | Users |
|----------|-----|-----|---------|------|-------|
| small_2_0 | 2GB | 1 vCPU | 60GB | $10 | 10-20 |
| medium_3_0 | 4GB | 2 vCPU | 80GB | $20 | 30-50 |
| large_2_0 | 8GB | 2 vCPU | 160GB | $40 | 50-100 |

### Horizontal Scaling (Future)

```
                    Load Balancer
                         │
            ┌────────────┼────────────┐
            │            │            │
        Instance 1   Instance 2   Instance 3
            │            │            │
            └────────────┼────────────┘
                         │
                    PostgreSQL
                    (RDS Instance)
```

## Performance Checklist

### Daily Performance Checks
- [ ] Monitor response times
- [ ] Check memory usage trends
- [ ] Review slow query log
- [ ] Verify cache hit rates

### Weekly Optimization Tasks
- [ ] Run VACUUM on database
- [ ] Clear old cache entries
- [ ] Review and optimize slow queries
- [ ] Update statistics

### Monthly Performance Review
- [ ] Analyze usage patterns
- [ ] Plan capacity adjustments
- [ ] Review optimization opportunities
- [ ] Update performance documentation

## Optimization Roadmap

### Phase 1: Quick Wins (Completed)
- ✅ Database indexes
- ✅ Query optimization
- ✅ Memory monitoring
- ✅ Basic caching

### Phase 2: Caching Layer (Q1 2026)
- 📋 Deploy Redis
- 📋 Implement cache warming
- 📋 API response caching
- 📋 Session management

### Phase 3: CDN Integration (Q2 2026)
- 📋 CloudFlare setup
- 📋 Static asset optimization
- 📋 Edge caching
- 📋 Global distribution

### Phase 4: Architecture Evolution (Q3 2026)
- 📋 Microservices split
- 📋 Container orchestration
- 📋 Auto-scaling
- 📋 Load balancing

## Performance Tools

### Monitoring Tools
- **CloudWatch:** Infrastructure metrics
- **Docker Stats:** Container metrics
- **SQLite Analyze:** Query performance
- **Apache Bench:** Load testing

### Profiling Tools
```bash
# Python profiling
pip install memory_profiler line_profiler
python -m cProfile -o profile.stats app.py

# SQL profiling
sqlite3 webui.db "EXPLAIN QUERY PLAN SELECT ..."

# Network profiling
tcpdump -i any -w capture.pcap port 443
```

---

*Document version: 2.0*
*Last updated: 2025-10-17*
*Performance baseline: October 2025*