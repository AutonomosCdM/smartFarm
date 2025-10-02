# smartFARM v3 API Routes

## Overview
Three production-ready API endpoints for AI chat, RAG retrieval, and document upload.

## Environment Variables Required

```bash
GROQ_API_KEY=gsk_...              # Groq API key for LLM
DATABASE_URL=postgresql://...     # PostgreSQL connection string
OPENAI_API_KEY=sk-...            # OpenAI API key for embeddings
```

## Database Setup

Before using the API, initialize your PostgreSQL database with pgvector:

```bash
# Connect to your PostgreSQL database
psql $DATABASE_URL

# Run the initialization script
\i lib/db/init.sql
```

## API Endpoints

### 1. POST `/api/chat` - Streaming Chat

Handles streaming chat with Groq LLM, agent system prompts, and RAG context injection.

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "What are best practices for irrigation?" }
  ],
  "agent": "irrigation",  // Optional: "irrigation", "pest", "weather", "crop"
  "useRAG": true          // Optional: Enable RAG context retrieval
}
```

**Response:**
Streaming text response using Vercel AI SDK's data stream format.

**Features:**
- Groq `llama-3.3-70b-versatile` model
- Agent-specific system prompts (irrigation, pest, weather, crop)
- Automatic RAG context injection when `useRAG: true`
- Error handling with fallback to base prompt

**Example with curl:**
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Tell me about drip irrigation"}],
    "agent": "irrigation",
    "useRAG": true
  }'
```

### 2. POST `/api/upload` - Document Upload

Upload agricultural documents (TXT, MD) for RAG retrieval.

**Request:**
```bash
# Form data with file upload
curl -X POST http://localhost:3000/api/upload \
  -F "file=@irrigation-guide.txt"
```

**Response:**
```json
{
  "success": true,
  "document": {
    "id": 1,
    "filename": "irrigation-guide.txt",
    "metadata": {
      "filename": "irrigation-guide.txt",
      "fileType": "text/plain",
      "fileSize": 5432,
      "uploadedAt": "2025-10-01T19:30:00.000Z"
    },
    "createdAt": "2025-10-01T19:30:00.000Z",
    "contentLength": 5432,
    "embeddingDimensions": 1536
  }
}
```

**Features:**
- Accepts TXT and MD files (PDF requires additional setup)
- 10MB file size limit
- Automatic text extraction
- OpenAI text-embedding-3-small embeddings (1536 dimensions)
- Stores in PostgreSQL with pgvector

**Supported File Types:**
- `text/plain` (.txt)
- `text/markdown` (.md)
- `application/pdf` (.pdf) - Not implemented in MVP

### 3. POST `/api/rag` - RAG Retrieval

Retrieve relevant document chunks for a query using vector similarity search.

**Request:**
```json
{
  "query": "What are the best irrigation practices?",
  "topK": 3  // Optional, default: 3
}
```

**Response:**
```json
{
  "chunks": [
    {
      "id": 1,
      "filename": "irrigation-guide.txt",
      "content": "Drip irrigation is one of the most efficient methods...",
      "similarity": 0.87,
      "metadata": { "uploadedAt": "2025-10-01T19:30:00.000Z" }
    }
  ],
  "query": "What are the best irrigation practices?",
  "duration": 245,  // milliseconds
  "count": 3
}
```

**Features:**
- Vector similarity search using pgvector (cosine distance)
- < 500ms retrieval time (performance target)
- Top-K configurable (default: 3)
- Returns similarity scores
- Graceful error handling (returns empty chunks on failure)

**GET `/api/rag`** - Health check:
```json
{
  "status": "ok",
  "documentCount": 15
}
```

### 4. GET `/api/upload` - List Documents

Retrieve all uploaded documents.

**Response:**
```json
{
  "documents": [
    {
      "id": 1,
      "filename": "irrigation-guide.txt",
      "metadata": { ... },
      "created_at": "2025-10-01T19:30:00.000Z",
      "content_length": 5432
    }
  ],
  "count": 1
}
```

## Error Handling

All endpoints return structured error responses:

```json
{
  "error": "Descriptive error message"
}
```

Common HTTP status codes:
- `400` - Bad request (invalid input)
- `500` - Server error (configuration, database, API failures)

## Performance Targets

- Chat response: < 2s first token
- RAG retrieval: < 500ms
- Document upload: < 5s for typical files

## Agent System Prompts

The `/api/chat` endpoint supports four specialized agents:

1. **irrigation** - Water management, soil moisture, irrigation schedules
2. **pest** - Pest control, IPM, identification, prevention
3. **weather** - Weather patterns, forecasts, climate impacts
4. **crop** - Crop selection, planting, soil health, harvest

## Integration Example

```typescript
// Frontend chat integration
import { useChat } from 'ai/react';

const { messages, input, handleInputChange, handleSubmit } = useChat({
  api: '/api/chat',
  body: {
    agent: 'irrigation',
    useRAG: true,
  },
});
```

## Troubleshooting

### "GROQ_API_KEY not configured"
Set environment variable: `GROQ_API_KEY=gsk_...`

### "DATABASE_URL not configured"
Set environment variable: `DATABASE_URL=postgresql://...`

### "relation 'documents' does not exist"
Run the database initialization script: `psql $DATABASE_URL < lib/db/init.sql`

### "RAG retrieval took > 500ms"
- Check database index: `CREATE INDEX ... USING ivfflat`
- Reduce `topK` parameter
- Optimize PostgreSQL configuration

### "PDF support requires additional setup"
For MVP, use TXT or MD files. PDF parsing requires additional dependencies.
