# RAG System Documentation

This directory contains the complete RAG (Retrieval-Augmented Generation) engine for smartFARM v3.

## Overview

The RAG system enables the AI to answer questions using information from uploaded documents. It works by:

1. **Document Processing**: Breaking documents into chunks
2. **Embedding Generation**: Converting text chunks into vector embeddings
3. **Vector Storage**: Storing embeddings in PostgreSQL with pgvector
4. **Similarity Search**: Finding relevant chunks based on user queries
5. **Context Injection**: Augmenting AI prompts with retrieved information

## Architecture

```
┌─────────────────┐
│  User uploads   │
│    document     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Document        │
│ Processor       │ ← Chunks text, handles PDF/TXT/MD
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Embedding       │
│ Generator       │ ← LlamaIndex (OpenAI ada-002)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Vector Store    │
│ (PostgreSQL +   │ ← Stores embeddings
│  pgvector)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Retrieval       │
│ Engine          │ ← Searches & ranks results
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Chat API        │
│ (with context)  │ ← Augmented AI responses
└─────────────────┘
```

## File Structure

```
lib/rag/
├── index.ts                 # Main export file (use this for imports)
├── document-processor.ts    # Document parsing and chunking
├── embeddings.ts           # Embedding generation utilities
├── vector-store.ts         # PostgreSQL + pgvector interface
├── retrieval.ts            # Search and ranking engine
├── retriever.ts            # Convenience re-exports
└── README.md              # This file

lib/db/
├── postgres.ts            # PostgreSQL connection pool
└── schema.sql            # Database schema with pgvector

components/rag/
└── document-upload.tsx   # UI component for file uploads

app/api/upload/
└── route.ts              # API endpoint for document uploads
```

## Usage

### 1. Document Upload (Frontend)

```tsx
import { DocumentUpload } from '@/components/rag/document-upload';

export default function Page() {
  return <DocumentUpload />;
}
```

### 2. Document Processing (Backend)

```typescript
import { processDocument, generateEmbeddings } from '@/lib/rag';

// Process a document
const doc = await processDocument('/path/to/file.pdf', {
  chunkSize: 512,
  chunkOverlap: 50,
});

// Generate embeddings
const embeddings = await generateEmbeddings(doc);

console.log(`Processed ${doc.metadata.chunkCount} chunks`);
```

### 3. Storing in Vector Database

```typescript
import { createVectorStoreFromEnv } from '@/lib/rag';

const vectorStore = createVectorStoreFromEnv();

// Store document with embeddings
const result = await vectorStore.storeDocument(doc, embeddings);

console.log(`Stored ${result.success} chunks successfully`);
```

### 4. Retrieving Context for Chat

```typescript
import { createRetrievalEngine, createVectorStoreFromEnv } from '@/lib/rag';

const vectorStore = createVectorStoreFromEnv();
const retriever = createRetrievalEngine(vectorStore, {
  topK: 3,
  minSimilarity: 0.5,
});

// Retrieve relevant context
const context = await retriever.retrieveContext('How do I water tomatoes?');

console.log(context.formattedContext);
// Output:
// ### Relevant Context:
// **Source 1:** tomato-guide.pdf (Relevance: 87.3%)
// Tomatoes require consistent watering...
```

### 5. Augmenting Chat Prompts

```typescript
const { augmentedPrompt, metadata } = await retriever.augmentPrompt(
  'How do I water tomatoes?',
  'You are a helpful agricultural assistant.'
);

console.log(`Retrieved ${metadata.resultCount} results in ${metadata.retrievalTime}ms`);

// Use augmentedPrompt in your chat API call
const response = await streamText({
  model: groq('llama-3.1-70b-versatile'),
  system: augmentedPrompt,
  messages: [...],
});
```

## Configuration

### Environment Variables

Required:
- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: OpenAI API key (for embeddings)

Optional:
- `CHUNK_SIZE`: Document chunk size (default: 512)
- `CHUNK_OVERLAP`: Chunk overlap (default: 50)
- `RAG_TOP_K`: Number of results to retrieve (default: 3)
- `RAG_MIN_SIMILARITY`: Minimum similarity threshold (default: 0.5)

### Document Processor Config

```typescript
interface DocumentProcessorConfig {
  chunkSize?: number;        // Default: 512
  chunkOverlap?: number;     // Default: 50
  maxFileSize?: number;      // Default: 10MB
}
```

### Retrieval Config

```typescript
interface RetrievalConfig {
  topK?: number;            // Default: 3
  minSimilarity?: number;   // Default: 0.5
  maxContextLength?: number; // Default: 2000 chars
  cacheEnabled?: boolean;    // Default: true
  cacheTTL?: number;        // Default: 5 minutes
}
```

## Database Setup

### 1. Install PostgreSQL with pgvector

```bash
# macOS
brew install postgresql pgvector

# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib
```

### 2. Enable pgvector Extension

```sql
CREATE EXTENSION vector;
```

### 3. Run Schema Migration

```typescript
import { initializeDatabase } from '@/lib/db/postgres';

await initializeDatabase();
```

Or manually run the schema file:
```bash
psql -d smartfarm -f lib/db/schema.sql
```

## Performance

### Optimization Goals

- **RAG Retrieval**: < 500ms (cached: < 50ms)
- **Document Upload**: < 2s for typical files
- **Embedding Generation**: ~100ms per chunk

### Caching

The retrieval engine includes a built-in cache with:
- 5-minute TTL (configurable)
- Automatic cleanup
- Query normalization

```typescript
// Clear cache when documents are updated
retriever.clearCache();

// Check cache stats
const stats = retriever.getCacheStats();
console.log(`Cache size: ${stats.size} entries`);
```

### Vector Index Tuning

The pgvector index uses IVFFlat with `lists = 100`:
- Good for 10,000-100,000 vectors
- For larger datasets, increase lists (rule of thumb: sqrt(rows))

```sql
-- Rebuild index with different parameters
DROP INDEX idx_documents_embedding;
CREATE INDEX idx_documents_embedding
  ON documents
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 200);
```

## Supported File Types

- **PDF**: `.pdf` (requires LlamaIndex PDF parser)
- **Text**: `.txt`
- **Markdown**: `.md`

Max file size: 10MB (configurable)

## Error Handling

All functions throw descriptive errors:

```typescript
try {
  const doc = await processDocument(filepath);
} catch (error) {
  if (error.message.includes('Unsupported file type')) {
    // Handle unsupported file
  } else if (error.message.includes('exceeds maximum')) {
    // Handle file too large
  } else {
    // Handle other errors
  }
}
```

## Testing

### Health Checks

```typescript
// Check database connection
import { healthCheck } from '@/lib/db/postgres';
const isHealthy = await healthCheck();

// Check vector store
const vectorStore = createVectorStoreFromEnv();
const health = await vectorStore.healthCheck();
console.log(`Documents in store: ${health.documentCount}`);

// Check retrieval engine
const retriever = createRetrievalEngine(vectorStore);
const engineHealth = await retriever.healthCheck();
console.log(`Status: ${engineHealth.status}`);
```

### Manual Testing

```bash
# Upload a document
curl -X POST http://localhost:3000/api/upload \
  -F "file=@test.txt"

# List documents
curl http://localhost:3000/api/upload

# Delete a document
curl -X DELETE "http://localhost:3000/api/upload?documentId=doc_123"
```

## Troubleshooting

### Common Issues

1. **"pgvector extension not found"**
   - Install pgvector: `brew install pgvector` or use managed PostgreSQL (Supabase, Railway)

2. **"Embedding generation failed"**
   - Check OPENAI_API_KEY is set
   - Verify OpenAI account has credits

3. **"Query took >500ms"**
   - Rebuild vector index
   - Reduce topK parameter
   - Check database connection latency

4. **"Document processing failed"**
   - Verify file format is supported
   - Check file is not corrupted
   - Ensure file size is under limit

## Best Practices

1. **Chunk Size**: 512 tokens is optimal for most use cases
2. **Overlap**: 50 tokens maintains context between chunks
3. **Top-K**: 3-5 results provide good context without overwhelming the prompt
4. **Similarity Threshold**: 0.5 filters out irrelevant results
5. **Cache**: Enable for production to reduce latency and API costs

## Future Enhancements

- [ ] Add support for more file types (DOCX, XLSX)
- [ ] Implement hybrid search (keyword + vector)
- [ ] Add document versioning
- [ ] Support for document collections/namespaces
- [ ] Real-time document updates
- [ ] Advanced chunking strategies (semantic splitting)

## References

- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [LlamaIndex Documentation](https://docs.llamaindex.ai/)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
