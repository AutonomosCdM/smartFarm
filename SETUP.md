# smartFARM v3 Setup Guide

Complete setup and deployment guide for the smartFARM v3 AI agricultural assistant.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Initialization](#database-initialization)
4. [Installation](#installation)
5. [Development](#development)
6. [Testing Features](#testing-features)
7. [Production Deployment](#production-deployment)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Node.js**: v20.0.0 or higher
- **npm**: v9.0.0 or higher
- **PostgreSQL**: v14 or higher with pgvector extension
- **Git**: For version control

### Required API Keys

1. **Groq API Key** - For AI chat completions
   - Sign up at [https://console.groq.com](https://console.groq.com)
   - Navigate to API Keys section
   - Create a new API key

2. **OpenAI API Key** - For embeddings generation (optional)
   - Sign up at [https://platform.openai.com](https://platform.openai.com)
   - Create API key in API Keys section
   - Note: LlamaIndex uses OpenAI embeddings by default

---

## Environment Setup

### 1. Clone the Repository

```bash
cd /path/to/your/projects
git clone <repository-url>
cd smartfarm-v4
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Next.js 15 (App Router)
- Vercel AI SDK
- Groq SDK
- LlamaIndex
- PostgreSQL clients (pg, pgvector)
- Shadcn/ui components
- And more...

### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual values:

```env
# ==========================================
# PostgreSQL Database Configuration
# ==========================================
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/smartfarm

POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=smartfarm
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password_here
POSTGRES_MAX_CONNECTIONS=20

# ==========================================
# AI API Keys
# ==========================================
GROQ_API_KEY=gsk_your_actual_groq_api_key_here
OPENAI_API_KEY=sk-your_actual_openai_api_key_here

# ==========================================
# Application Configuration
# ==========================================
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ==========================================
# RAG Configuration (Optional)
# ==========================================
MAX_UPLOAD_SIZE=10485760
CHUNK_SIZE=512
CHUNK_OVERLAP=50
RAG_TOP_K=3
RAG_MIN_SIMILARITY=0.5
```

---

## Database Initialization

### Option 1: Local PostgreSQL with Docker

#### Start PostgreSQL with pgvector

```bash
docker run -d \
  --name smartfarm-postgres \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=smartfarm \
  -p 5432:5432 \
  ankane/pgvector:latest
```

#### Initialize Database Schema

```bash
npm run db:init
```

This script will:
- Enable the pgvector extension
- Create the `documents` table
- Set up vector similarity indexes
- Verify the setup

### Option 2: Railway/Supabase PostgreSQL

#### Railway Setup

1. Go to [Railway](https://railway.app)
2. Create new project
3. Add PostgreSQL database
4. Copy connection string from Variables tab
5. Update `DATABASE_URL` in `.env.local`

#### Enable pgvector Extension

Connect to your Railway database and run:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Then run the init script:

```bash
npm run db:init
```

#### Supabase Setup

1. Go to [Supabase](https://supabase.com)
2. Create new project
3. Go to SQL Editor
4. Run the initialization SQL:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create documents table
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  document_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for fast retrieval
CREATE INDEX idx_documents_document_id ON documents(document_id);
CREATE INDEX idx_documents_embedding ON documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_documents_metadata ON documents USING gin(metadata);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

5. Copy connection string from Settings > Database
6. Update `DATABASE_URL` in `.env.local`

### Verify Database Connection

Test your database connection:

```bash
node -e "const { Pool } = require('pg'); const pool = new Pool({ connectionString: process.env.DATABASE_URL }); pool.query('SELECT NOW()').then(r => console.log('✓ Database connected:', r.rows[0].now)).catch(e => console.error('✗ Connection failed:', e.message));"
```

---

## Installation

### Verify TypeScript Compilation

```bash
npx tsc --noEmit
```

You should see no errors (warnings are acceptable).

### Build the Project

```bash
npm run build
```

Expected output:
```
✓ Compiled successfully
```

---

## Development

### Start Development Server

```bash
npm run dev
```

The application will be available at:
- **URL**: http://localhost:3000
- **Hot reload**: Enabled
- **Turbopack**: Enabled for faster builds

### Development Workflow

1. **Make code changes** - Files are auto-reloaded
2. **Check console** - Watch for errors in terminal
3. **View in browser** - Changes appear immediately
4. **Test features** - Use the testing guide below

---

## Testing Features

### 1. Basic Chat (No RAG)

1. Open http://localhost:3000
2. Select an agent from the dropdown (e.g., "Irrigation Specialist")
3. Type a question: "What's the best irrigation schedule for tomatoes?"
4. Verify:
   - Message appears in chat
   - AI responds with streaming text
   - Agent-specific knowledge is reflected in response

### 2. Document Upload & RAG

#### Upload a Document

1. Navigate to the document upload section
2. Drag and drop a file or click "Select Files"
3. Supported formats: PDF, TXT, MD (max 10MB)
4. Wait for processing:
   - Status: "Uploading" → "Processing" → "Ready"
   - Chunk count displayed when ready

#### Test RAG Retrieval

1. Enable RAG in the chat interface (if toggle available)
2. Ask a question about your uploaded document
3. Verify:
   - Relevant chunks are retrieved (check network tab)
   - AI response includes information from your document
   - Context is properly formatted in system prompt

#### Verify Document Storage

Check PostgreSQL:

```sql
-- List all documents
SELECT document_id, filename, COUNT(*) as chunks
FROM documents
GROUP BY document_id, filename;

-- View a specific document's chunks
SELECT chunk_index, LEFT(content, 100) as content_preview
FROM documents
WHERE document_id = 'your_document_id'
ORDER BY chunk_index;
```

### 3. Artifacts Rendering

Test artifact types by asking the AI to generate:

#### React Component

```
Create a simple React component that displays a card with a title and description
```

Expected: Rendered React component appears inline

#### Code Block

```
Show me a Python function to calculate fibonacci numbers
```

Expected: Syntax-highlighted code block with copy button

#### Markdown Document

```
Create a markdown guide about crop rotation
```

Expected: Formatted markdown with proper styling

### 4. Agent Switching

1. Start a conversation with "Pest Control Specialist"
2. Ask about pest management
3. Switch to "Weather Analysis"
4. Continue conversation - context should persist
5. Verify agent-specific responses change appropriately

### 5. Streaming Responses

1. Ask a complex question
2. Watch the response stream in real-time
3. Verify:
   - No flashing/flickering
   - Smooth text appearance
   - Auto-scroll to bottom
   - Loading indicator appears

---

## Production Deployment

### Deploy to Vercel

#### 1. Prepare Repository

```bash
git add .
git commit -m "Ready for production deployment"
git push origin main
```

#### 2. Connect to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your Git repository
4. Configure project:
   - **Framework**: Next.js
   - **Root Directory**: ./
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

#### 3. Configure Environment Variables

In Vercel dashboard, add all variables from `.env.local`:

```
DATABASE_URL=postgresql://user:pass@host:port/database
GROQ_API_KEY=gsk_...
OPENAI_API_KEY=sk-...
POSTGRES_HOST=...
POSTGRES_PORT=...
POSTGRES_DB=...
POSTGRES_USER=...
POSTGRES_PASSWORD=...
NEXT_PUBLIC_APP_URL=https://smartfarm.autonomos.dev
```

#### 4. Deploy

1. Click "Deploy"
2. Wait for build to complete (2-3 minutes)
3. Visit your deployment URL

#### 5. Custom Domain (Optional)

1. Go to Settings > Domains
2. Add custom domain: `smartfarm.autonomos.dev`
3. Update DNS records as instructed
4. Wait for SSL certificate (automatic)

### Post-Deployment Verification

1. **Test chat functionality**
2. **Upload a test document**
3. **Verify RAG retrieval**
4. **Test all agent types**
5. **Check error logs** in Vercel dashboard

---

## Troubleshooting

### Common Issues

#### Database Connection Fails

**Error**: `Connection terminated unexpectedly`

**Solutions**:
1. Verify DATABASE_URL is correct
2. Check if PostgreSQL is running
3. Ensure network allows connections
4. Test connection manually:
   ```bash
   psql postgresql://user:pass@host:port/database
   ```

#### pgvector Extension Not Found

**Error**: `extension "vector" does not exist`

**Solution**:
```sql
CREATE EXTENSION vector;
```

If that fails, your PostgreSQL version doesn't support pgvector. Use:
- Docker: `ankane/pgvector:latest`
- Supabase (built-in support)
- Railway (enable in dashboard)

#### GROQ_API_KEY Missing

**Error**: `GROQ_API_KEY environment variable is not set`

**Solution**:
1. Check `.env.local` exists in project root
2. Verify key starts with `gsk_`
3. Restart development server
4. For production, add to Vercel environment variables

#### Upload Fails

**Error**: `Upload failed: File processing error`

**Possible causes**:
1. **File too large** - Max 10MB
2. **Unsupported format** - Only PDF, TXT, MD
3. **OpenAI API key missing** - Required for embeddings
4. **Database full** - Check storage limits

**Debug**:
```bash
# Check server logs
npm run dev
# Upload file and watch console output
```

#### Build Fails

**Error**: `Type error: Property 'X' does not exist`

**Solution**:
```bash
# Clean build cache
rm -rf .next
rm -rf node_modules
npm install
npm run build
```

#### Artifacts Not Rendering

**Issue**: Code blocks appear as plain text

**Solution**:
1. Verify `ArtifactRenderer` is imported in `Message.tsx`
2. Check browser console for errors
3. Ensure artifact parser is working:
   ```typescript
   import { hasArtifacts, parseArtifacts } from '@/lib/ai/artifact-parser';
   console.log(hasArtifacts('```jsx\ncode\n```')); // Should be true
   ```

### Performance Issues

#### Slow RAG Retrieval (>500ms)

**Optimization**:
1. Reduce `RAG_TOP_K` in `.env.local` (try 3 instead of 5)
2. Create proper indexes:
   ```sql
   CREATE INDEX IF NOT EXISTS idx_documents_embedding
   ON documents USING ivfflat (embedding vector_cosine_ops)
   WITH (lists = 100);
   ```
3. Enable caching in `RetrievalEngine`

#### Memory Issues

**Error**: `JavaScript heap out of memory`

**Solution**:
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

### Getting Help

1. **Check logs**: Browser console + server terminal
2. **Review documentation**: See [CLAUDE.md](./CLAUDE.md)
3. **Database health**: Run health check queries
4. **API status**: Verify Groq/OpenAI API status pages

---

## Next Steps

After successful setup:

1. **Customize agents** - Edit agent prompts in `lib/ai/agents/`
2. **Add features** - Implement voice input, analytics, etc.
3. **Optimize performance** - Add Redis caching, CDN, etc.
4. **Security** - Add authentication, rate limiting
5. **Monitoring** - Set up error tracking (Sentry, etc.)

---

## Quick Reference

### Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Production build
npm run start            # Start production server
npm run lint             # Run ESLint

# Database
npm run db:init          # Initialize database
psql $DATABASE_URL       # Connect to database

# Deployment
vercel                   # Deploy to Vercel (preview)
vercel --prod            # Deploy to production
```

### Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `GROQ_API_KEY` | Yes | Groq API key for chat |
| `OPENAI_API_KEY` | Yes | OpenAI key for embeddings |
| `POSTGRES_HOST` | Yes | Database host |
| `POSTGRES_DB` | Yes | Database name |
| `POSTGRES_USER` | Yes | Database user |
| `POSTGRES_PASSWORD` | Yes | Database password |
| `NEXT_PUBLIC_APP_URL` | No | Public app URL |
| `RAG_TOP_K` | No | Number of chunks to retrieve (default: 3) |
| `CHUNK_SIZE` | No | Document chunk size (default: 512) |

### Health Check Endpoints

```bash
# Test database connection
curl http://localhost:3000/api/health/db

# Test RAG system
curl http://localhost:3000/api/health/rag

# List documents
curl http://localhost:3000/api/upload
```

---

**Ready to build!** Start with `npm run dev` and visit http://localhost:3000
