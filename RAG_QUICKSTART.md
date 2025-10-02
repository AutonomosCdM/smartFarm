# RAG System Quick Start Guide

Get the smartFARM v3 RAG engine running in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 14+ with pgvector extension
- OpenAI API key (for embeddings)
- Groq API key (for chat)

---

## Step 1: Install PostgreSQL with pgvector

### macOS (Homebrew)
```bash
brew install postgresql@14 pgvector
brew services start postgresql@14
```

### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
```

### Using Managed Services (Recommended for Production)
- **Supabase**: Built-in pgvector support, free tier available
- **Railway**: One-click PostgreSQL + pgvector template
- **Neon**: Serverless PostgreSQL with pgvector

---

## Step 2: Create Database

```bash
# Connect to PostgreSQL
psql postgres

# Create database
CREATE DATABASE smartfarm;

# Connect to the new database
\c smartfarm

# Enable pgvector extension
CREATE EXTENSION vector;

# Verify installation
SELECT * FROM pg_extension WHERE extname = 'vector';

# Exit
\q
```

---

## Step 3: Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
# Copy the template
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
# PostgreSQL (local)
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/smartfarm

# PostgreSQL (managed service)
# DATABASE_URL=postgresql://user:pass@hostname:5432/database

# OpenAI (required for embeddings)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Groq (for chat completions)
GROQ_API_KEY=gsk-your-groq-api-key-here
```

**Get API Keys**:
- OpenAI: https://platform.openai.com/api-keys
- Groq: https://console.groq.com/keys

---

## Step 4: Install Dependencies

```bash
npm install
```

This installs all required packages:
- `pg`, `pgvector` - PostgreSQL client
- `llamaindex` - Document processing and embeddings
- `@ai-sdk/groq`, `ai` - AI SDK for chat
- `next`, `react` - Framework
- And more...

---

## Step 5: Initialize Database

Run the initialization script:

```bash
npm run db:init
```

**Expected Output**:
```
🚀 Initializing smartFARM database...

📊 Database URL: postgresql://postgres:****@localhost:5432/smartfarm

🔌 Testing database connection...
✅ Database connection successful

🔧 Creating tables and extensions...
✅ Database initialized successfully

🔍 Verifying setup...
✅ pgvector extension enabled
✅ documents table created with columns:
   - id: text
   - document_id: text
   - filename: text
   - chunk_index: integer
   - content: text
   - embedding: USER-DEFINED
   - metadata: jsonb
   - created_at: timestamp without time zone
   - updated_at: timestamp without time zone

📋 Indexes created:
   - documents_pkey
   - idx_documents_document_id
   - idx_documents_filename
   - idx_documents_embedding
   - idx_documents_metadata

✨ Database setup complete!
```

---

## Step 6: Start Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

---

## Step 7: Test Document Upload

### Method 1: Using the UI Component

1. Import the DocumentUpload component in your page:

```tsx
// app/page.tsx
import { DocumentUpload } from '@/components/rag/document-upload';

export default function Home() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">smartFARM v3</h1>
      <DocumentUpload />
    </div>
  );
}
```

2. Create a test file (`test.txt`):
```
Tomatoes require consistent watering.
Water deeply 2-3 times per week.
Avoid getting leaves wet to prevent disease.
Best time to water is early morning.
```

3. Drag and drop the file or click to browse
4. Wait for "Ready" status (should take 2-5 seconds)

### Method 2: Using cURL

```bash
curl -X POST http://localhost:3000/api/upload \
  -F "file=@test.txt"
```

**Expected Response**:
```json
{
  "success": true,
  "documentId": "doc_1234567890_test.txt",
  "filename": "test.txt",
  "chunkCount": 1,
  "fileSize": 150,
  "fileType": ".txt",
  "processedAt": "2025-10-01T12:00:00.000Z",
  "storageResult": {
    "success": 1,
    "failed": 0,
    "errors": []
  }
}
```

---

## Step 8: Test Retrieval

### Using the API

```bash
# First, upload a document (see Step 7)

# Then query the RAG system
curl http://localhost:3000/api/upload
```

### Using in Code

```typescript
import {
  createRetrievalEngine,
  createVectorStoreFromEnv
} from '@/lib/rag';

// Initialize retrieval engine
const vectorStore = createVectorStoreFromEnv();
const retriever = createRetrievalEngine(vectorStore);

// Retrieve context for a query
const result = await retriever.retrieveContext(
  "How often should I water tomatoes?"
);

console.log(result.formattedContext);
// Output:
// ### Relevant Context:
// **Source 1:** test.txt (Relevance: 89.2%)
// Tomatoes require consistent watering.
// Water deeply 2-3 times per week.
// ...
```

---

## Step 9: Integrate with Chat

Add RAG to your chat API route:

```typescript
// app/api/chat/route.ts
import { streamText } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import {
  createRetrievalEngine,
  createVectorStoreFromEnv
} from '@/lib/rag';

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  const { messages } = await req.json();
  const lastMessage = messages[messages.length - 1].content;

  // Initialize RAG
  const vectorStore = createVectorStoreFromEnv();
  const retriever = createRetrievalEngine(vectorStore);

  // Get relevant context
  const { augmentedPrompt, metadata } = await retriever.augmentPrompt(
    lastMessage,
    "You are a helpful agricultural assistant."
  );

  console.log(`Retrieved ${metadata.resultCount} chunks in ${metadata.retrievalTime}ms`);

  // Stream response with context
  const result = await streamText({
    model: groq('llama-3.1-70b-versatile'),
    system: augmentedPrompt,
    messages,
  });

  return result.toDataStreamResponse();
}
```

---

## Troubleshooting

### Issue: "pgvector extension not found"

**Solution**:
```bash
# macOS
brew install pgvector

# Ubuntu/Debian
sudo apt-get install postgresql-14-pgvector

# Or use managed service (Supabase, Railway)
```

### Issue: "DATABASE_URL not configured"

**Solution**: Create `.env.local` file with your database URL:
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/smartfarm
```

### Issue: "Embedding generation failed"

**Solution**: Check your OpenAI API key:
```env
OPENAI_API_KEY=sk-your-key-here
```

Verify it works:
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Issue: "Query took >500ms"

**Solution**: Rebuild the vector index:
```sql
DROP INDEX idx_documents_embedding;
CREATE INDEX idx_documents_embedding
  ON documents
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

For large datasets (>10k documents), increase `lists`:
```sql
WITH (lists = 200);  -- For 40k+ documents
```

### Issue: "File upload fails"

**Possible causes**:
1. File too large (max 10MB)
2. Unsupported format (only PDF, TXT, MD)
3. Empty file

**Check the error message** in the upload response for details.

---

## Verify Everything Works

Run this checklist:

- [ ] PostgreSQL running: `psql -c "SELECT version();"`
- [ ] pgvector installed: `psql smartfarm -c "SELECT * FROM pg_extension WHERE extname = 'vector';"`
- [ ] Environment variables set: Check `.env.local`
- [ ] Database initialized: `npm run db:init` (should show success)
- [ ] Server starts: `npm run dev` (no errors)
- [ ] Upload works: Try uploading a TXT file via UI
- [ ] Document shows "Ready" status
- [ ] Retrieval works: Query should return relevant context

---

## Performance Expectations

| Operation | Expected Time |
|-----------|---------------|
| Document upload (1 page) | 1-2 seconds |
| Document upload (10 pages) | 5-10 seconds |
| RAG retrieval (first time) | 200-500ms |
| RAG retrieval (cached) | <50ms |
| Embedding generation | ~100ms per chunk |

---

## What's Next?

1. **Upload Real Documents**: Add your agricultural PDFs, guides, manuals
2. **Test Chat Integration**: Ask questions about uploaded documents
3. **Monitor Performance**: Check retrieval times in console
4. **Customize Parameters**: Adjust chunk size, top-k in `.env.local`
5. **Deploy**: Set up production database and deploy to Vercel

---

## Common Commands

```bash
# Start development server
npm run dev

# Initialize/reset database
npm run db:init

# Build for production
npm run build

# Start production server
npm start

# Check database status
psql smartfarm -c "SELECT COUNT(*) FROM documents;"

# List uploaded documents
curl http://localhost:3000/api/upload

# Delete a document
curl -X DELETE "http://localhost:3000/api/upload?documentId=doc_123"
```

---

## Getting Help

- **Documentation**: See `/lib/rag/README.md`
- **Implementation Details**: See `RAG_IMPLEMENTATION_SUMMARY.md`
- **Database Schema**: See `/lib/db/schema.sql`
- **Environment Setup**: See `.env.example`

---

## Quick Reference

**File Upload Limits**:
- Max size: 10MB
- Formats: PDF, TXT, MD

**Chunking**:
- Chunk size: 512 tokens
- Overlap: 50 tokens

**Retrieval**:
- Top-K: 3 results
- Min similarity: 0.5 (50%)
- Cache TTL: 5 minutes

**Embeddings**:
- Model: OpenAI text-embedding-ada-002
- Dimensions: 1536
- Similarity: Cosine

---

**You're all set! 🚀**

Upload your first document and start asking questions with AI-powered context.
