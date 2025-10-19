# SmartFarm System Architecture

## Overview

SmartFarm is an AI-powered agricultural assistant designed for Chilean farmers, built on Open WebUI with Groq API integration for high-performance AI inference.

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Internet Users                             │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │ HTTPS
                    ┌────────────▼────────────┐
                    │   AWS Lightsail VPS     │
                    │    98.87.30.163         │
                    │  ┌──────────────────┐  │
                    │  │  Nginx (Port 80) │  │
                    │  │   + Let's Encrypt│  │
                    │  └────────┬─────────┘  │
                    │           │ Port 8080  │
                    │  ┌────────▼─────────┐  │
                    │  │   Docker Engine  │  │
                    │  │ ┌──────────────┐ │  │
                    │  │ │  Open WebUI   │ │  │
                    │  │ │  Container    │ │  │
                    │  │ │              │ │  │
                    │  │ │ ┌──────────┐ │ │  │
                    │  │ │ │ SQLite   │ │ │  │
                    │  │ │ │ Database │ │ │  │
                    │  │ │ └──────────┘ │ │  │
                    │  │ │              │ │  │
                    │  │ │ ┌──────────┐ │ │  │
                    │  │ │ │   RAG    │ │ │  │
                    │  │ │ │  System  │ │ │  │
                    │  │ │ └──────────┘ │ │  │
                    │  │ │              │ │  │
                    │  │ │ ┌──────────┐ │ │  │
                    │  │ │ │  Tools   │ │ │  │
                    │  │ │ │ (Excel)  │ │ │  │
                    │  │ │ └──────────┘ │ │  │
                    │  │ └──────────────┘ │  │
                    │  └──────────────────┘  │
                    └─────────────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
            ┌───────▼──────┐ ┌──▼───────┐ ┌──▼────────┐
            │  Groq API    │ │ OpenAI   │ │  GitHub   │
            │  (LLM)       │ │  API     │ │  Actions  │
            │              │ │(Embedding)│ │  (CI/CD)  │
            └──────────────┘ └──────────┘ └───────────┘
```

## Component Details

### 1. Infrastructure Layer

**AWS Lightsail Instance**
- Type: `small_2_0` (2GB RAM, 1 vCPU)
- OS: Ubuntu 24.04 LTS
- Static IP: 98.87.30.163
- Region: us-east-1
- Storage: 60GB SSD
- Swap: 2GB configured
- Cost: $10/month

### 2. Web Server Layer

**Nginx Reverse Proxy**
- Handles HTTPS termination
- WebSocket upgrade for real-time chat
- SSL via Let's Encrypt (auto-renewal)
- Proxies to Docker container on port 8080

### 3. Application Layer

**Open WebUI (Docker Container)**
- Image: `ghcr.io/open-webui/open-webui:main`
- Port mapping: 8080 (container) → 3001 (host)
- Memory usage: ~900MB
- Features:
  - Multi-user chat interface
  - RAG (Retrieval-Augmented Generation)
  - Tool/Function execution
  - File upload and processing
  - Knowledge base management

### 4. Data Layer

**SQLite Database**
- Location: `/var/lib/docker/volumes/open-webui/_data/webui.db`
- Key tables:
  - `model`: AI model configurations
  - `chat`: Conversation history
  - `config`: System settings
  - `file`: Uploaded documents
  - `memory`: Context storage

**Docker Volumes**
- `open-webui`: Persistent data storage
- Survives container restarts
- Backup-friendly

### 5. AI Integration Layer

**Groq API**
- Purpose: Primary LLM inference
- Models: `llama-3.3-70b-versatile` (recommended)
- Performance: 500-800 tokens/second
- Cost: Free tier available

**OpenAI API**
- Purpose: Embeddings for Excel tool
- Model: `text-embedding-3-small`
- Required for: LlamaIndex SQL queries
- Cost: Pay-per-use

### 6. Tool System

**Excel Processing Tool**
- Uploads Excel → DuckDB import
- Natural language → SQL queries
- Uses Groq for query generation
- Uses OpenAI for embeddings
- Returns formatted results

## Data Flow

### Chat Interaction Flow

```
User Input → Open WebUI → Message Processing → API Selection
                                                      │
                            ┌─────────────────────────┘
                            │
                ┌───────────▼────────────┐
                │   Context Building     │
                │  • Chat history        │
                │  • RAG documents       │
                │  • System prompt       │
                └───────────┬────────────┘
                            │
                ┌───────────▼────────────┐
                │    Groq API Call       │
                │  • Model selection     │
                │  • Token streaming     │
                └───────────┬────────────┘
                            │
                ┌───────────▼────────────┐
                │  Response Processing   │
                │  • Markdown rendering  │
                │  • Code highlighting   │
                │  • Tool execution      │
                └───────────┬────────────┘
                            │
                        User Display
```

### Excel Tool Flow

```
Excel Upload → File Validation → DuckDB Import
                                        │
                    ┌───────────────────┘
                    │
        ┌───────────▼────────────┐
        │   Schema Analysis      │
        │  • Table structure     │
        │  • Column detection    │
        └───────────┬────────────┘
                    │
        ┌───────────▼────────────┐
        │  Natural Language Query│
        └───────────┬────────────┘
                    │
        ┌───────────▼────────────┐
        │   SQL Generation       │
        │  • Groq LLM           │
        │  • OpenAI embeddings  │
        └───────────┬────────────┘
                    │
        ┌───────────▼────────────┐
        │   Query Execution      │
        │  • DuckDB engine      │
        │  • Result formatting  │
        └───────────┬────────────┘
                    │
              Display Results
```

## Deployment Architecture

### CI/CD Pipeline

```
Developer → Git Push → GitHub
                         │
            ┌────────────▼────────────┐
            │   GitHub Actions        │
            │  • Trigger on push      │
            │  • SSH to production    │
            └────────────┬────────────┘
                         │
            ┌────────────▼────────────┐
            │   Production Server     │
            │  • Git pull             │
            │  • Docker compose up    │
            │  • Health check         │
            └────────────┬────────────┘
                         │
                    ✅ Deployed
```

### Monitoring Architecture

```
┌──────────────────────────────────────┐
│         Production Server            │
│                                      │
│  ┌─────────────┐  ┌──────────────┐  │
│  │ CloudWatch  │  │   Memory     │  │
│  │   Agent     │  │  Monitoring  │  │
│  └──────┬──────┘  └──────┬───────┘  │
│         │                 │          │
│  ┌──────▼─────────────────▼──────┐  │
│  │      Metrics Collection       │  │
│  │  • CPU, Memory, Disk, Swap    │  │
│  └────────────────┬──────────────┘  │
└───────────────────┼──────────────────┘
                    │
        ┌───────────▼────────────┐
        │   CloudWatch Service   │
        │  • 8 configured alarms │
        │  • SNS notifications   │
        └─────────────────────────┘
```

## Security Architecture

### Security Layers

```
┌─────────────────────────────────────┐
│        Security Perimeter           │
├─────────────────────────────────────┤
│ 1. Network Security                 │
│   • HTTPS only (SSL/TLS)           │
│   • Firewall (22, 80, 443 only)    │
│   • Static IP                       │
├─────────────────────────────────────┤
│ 2. Application Security             │
│   • User authentication             │
│   • Admin/user role separation      │
│   • Session management              │
├─────────────────────────────────────┤
│ 3. API Security                     │
│   • API keys in environment vars    │
│   • Keys never in code             │
│   • Gitignored .env file           │
├─────────────────────────────────────┤
│ 4. Data Security                    │
│   • Docker volume isolation         │
│   • Regular backups                 │
│   • Database in container           │
└─────────────────────────────────────┘
```

## High Availability Strategy

### Current Setup (Single Instance)

- **RPO** (Recovery Point Objective): 24 hours
- **RTO** (Recovery Time Objective): 30 minutes
- **Backup**: Manual snapshots
- **Recovery**: From AWS snapshot

### Future HA Options

1. **Active-Passive**
   - Secondary instance on standby
   - Database replication
   - DNS failover
   - Cost: +$10/month

2. **Load Balanced**
   - Multiple instances
   - External database (RDS)
   - Application Load Balancer
   - Cost: +$30-50/month

## Resource Specifications

### Memory Allocation

```
┌────────────────────────────────┐
│     Total Memory: 4GB          │
├────────────────────────────────┤
│ RAM: 2GB                       │
│ • Open WebUI: ~900MB (45%)     │
│ • System: ~300MB (15%)         │
│ • Buffer: ~800MB (40%)         │
├────────────────────────────────┤
│ Swap: 2GB (Emergency)          │
│ • Swappiness: 10               │
│ • Usage: Typically 0           │
└────────────────────────────────┘
```

### Network Topology

```
Internet → CloudFlare DNS → AWS Route 53
                                │
                    ┌───────────▼────────────┐
                    │   Lightsail Network    │
                    │  • Public subnet        │
                    │  • Security group       │
                    │  • Static IP attached  │
                    └─────────────────────────┘
```

## Technology Stack Summary

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Infrastructure | AWS Lightsail | - | VPS hosting |
| OS | Ubuntu | 24.04 LTS | Operating system |
| Container | Docker | Latest | Application container |
| Web Server | Nginx | 1.24+ | Reverse proxy, SSL |
| Application | Open WebUI | main | Chat interface |
| Database | SQLite | 3 | Data persistence |
| AI/LLM | Groq API | v1 | Language model |
| Embeddings | OpenAI API | v1 | Text embeddings |
| SSL | Let's Encrypt | - | HTTPS certificates |
| CI/CD | GitHub Actions | - | Deployment automation |
| Monitoring | CloudWatch | - | System monitoring |

## Performance Characteristics

- **Response Time**: <2s for typical queries
- **Concurrent Users**: ~10-20 (limited by RAM)
- **Token Generation**: 500-800 tokens/sec (Groq)
- **File Processing**: Excel files up to 50MB
- **Uptime Target**: 99.5% (43 hours/month allowed downtime)

## Cost Analysis

### Monthly Costs
- Lightsail Instance: $10
- Static IP: $0 (attached)
- CloudWatch: $0 (free tier)
- Groq API: $0 (free tier)
- OpenAI API: ~$1-5 (usage based)
- **Total**: ~$11-15/month

### Cost Optimization Options
1. Reserved capacity (1-year): 20% discount
2. Larger instance for better performance: +$2-10/month
3. CDN for static assets: CloudFlare free tier
4. Database optimization to reduce API calls

## Future Architecture Considerations

### Scalability Path
1. **Phase 1**: Current single instance
2. **Phase 2**: Add Redis cache, CDN
3. **Phase 3**: Database externalization (PostgreSQL)
4. **Phase 4**: Multi-instance with load balancer
5. **Phase 5**: Kubernetes deployment

### Potential Improvements
- Redis for session/cache storage
- PostgreSQL for better concurrency
- S3 for file storage
- CloudFront for content delivery
- ElasticSearch for better RAG performance

---

*Architecture version: 2.0*
*Last updated: 2025-10-17*