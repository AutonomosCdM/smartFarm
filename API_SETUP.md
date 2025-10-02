# smartFARM v3 API Setup Guide

## Quick Start

### 1. Environment Variables

Create a `.env.local` file in the project root:

```bash
# Required for chat (Groq LLM)
GROQ_API_KEY=gsk_...

# Required for RAG and uploads (PostgreSQL with pgvector)
DATABASE_URL=postgresql://user:password@host:port/database

# Required for embeddings
OPENAI_API_KEY=sk-...
```

### 2. Database Setup

#### Option A: Local PostgreSQL with pgvector

```bash
# Install PostgreSQL and pgvector extension
# macOS:
brew install postgresql pgvector

# Start PostgreSQL
brew services start postgresql

# Create database
createdb smartfarm

# Run initialization script
psql smartfarm -f lib/db/init.sql
```

#### Option B: Railway (Recommended for MVP)

1. Go to [railway.app](https://railway.app)
2. Create new project → Add PostgreSQL
3. Click on PostgreSQL → Variables → Copy `DATABASE_URL`
4. Click on PostgreSQL → Connect → Open PostgreSQL shell
5. Run: `CREATE EXTENSION vector;`
6. Copy/paste contents of `lib/db/init.sql` into shell

#### Option C: Supabase

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Go to SQL Editor → New query
4. Copy/paste contents of `lib/db/init.sql`
5. Get connection string from Settings → Database

### 3. Verify Setup

```bash
# Start development server
npm run dev

# Test chat endpoint
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello!"}]
  }'

# Test RAG health check
curl http://localhost:3000/api/rag

# Expected response: {"status":"ok","documentCount":0}
```

### 4. Upload a Test Document

```bash
# Create a test document
echo "Drip irrigation is one of the most water-efficient irrigation methods. It delivers water directly to plant roots, minimizing evaporation and runoff." > test-irrigation.txt

# Upload it
curl -X POST http://localhost:3000/api/upload \
  -F "file=@test-irrigation.txt"

# Verify RAG health check shows 1 document
curl http://localhost:3000/api/rag
# Expected: {"status":"ok","documentCount":1}
```

### 5. Test RAG Retrieval

```bash
# Query for relevant information
curl -X POST http://localhost:3000/api/rag \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is drip irrigation?"
  }'
```

### 6. Test Chat with RAG

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Tell me about drip irrigation"}],
    "useRAG": true,
    "agent": "irrigation"
  }'
```

## Troubleshooting

### "GROQ_API_KEY not configured"

Get a free API key from [console.groq.com](https://console.groq.com)

### "DATABASE_URL not configured"

Ensure `.env.local` exists and contains `DATABASE_URL=postgresql://...`

### "OPENAI_API_KEY not configured"

Get an API key from [platform.openai.com](https://platform.openai.com/api-keys)

### "relation 'documents' does not exist"

Run the database initialization script:

```bash
psql $DATABASE_URL -f lib/db/init.sql
```

### "column 'embedding' is of type vector but expression is of type text"

Your database doesn't have the pgvector extension. Run:

```sql
CREATE EXTENSION vector;
```

### RAG retrieval slow (> 500ms)

Create the vector index:

```sql
CREATE INDEX documents_embedding_idx
ON documents
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

## Production Deployment (Vercel)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard:
   - `GROQ_API_KEY`
   - `DATABASE_URL`
   - `OPENAI_API_KEY`
4. Deploy

**Note:** Use Railway or Supabase for PostgreSQL in production (Vercel has no built-in database).

## API Endpoints Summary

- `POST /api/chat` - Streaming chat with Groq + RAG
- `POST /api/upload` - Upload documents (TXT, MD)
- `GET /api/upload` - List uploaded documents
- `POST /api/rag` - Query vector database
- `GET /api/rag` - Health check

See [app/api/README.md](/Users/autonomos_dev/Projects/smartfarm-v4/app/api/README.md) for detailed API documentation.
