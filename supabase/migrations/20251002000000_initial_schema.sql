-- smartFARM v3 Database Schema
-- PostgreSQL with pgvector extension for vector similarity search

-- Enable pgvector extension for vector operations
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents table for RAG system
-- Stores document chunks with embeddings for semantic search
CREATE TABLE IF NOT EXISTS documents (
  -- Primary key
  id TEXT PRIMARY KEY,

  -- Document identification
  document_id TEXT NOT NULL,
  filename TEXT NOT NULL,

  -- Chunk information
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,

  -- Vector embedding (1536 dimensions for OpenAI ada-002)
  embedding vector(1536),

  -- Additional metadata as JSONB for flexibility
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast document_id lookups
CREATE INDEX IF NOT EXISTS idx_documents_document_id
  ON documents(document_id);

-- Index for filename searches
CREATE INDEX IF NOT EXISTS idx_documents_filename
  ON documents(filename);

-- IVFFlat index for fast vector similarity search
-- Lists parameter: sqrt(n) is a good default, 100 is reasonable for thousands of documents
-- Using cosine similarity (vector_cosine_ops) as it's normalized and works well for text
CREATE INDEX IF NOT EXISTS idx_documents_embedding
  ON documents
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- GIN index for metadata JSONB queries
CREATE INDEX IF NOT EXISTS idx_documents_metadata
  ON documents
  USING GIN (metadata);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at on row updates
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- View for document statistics
CREATE OR REPLACE VIEW document_stats AS
SELECT
  document_id,
  filename,
  COUNT(*) as chunk_count,
  MIN(created_at) as first_created,
  MAX(updated_at) as last_updated,
  metadata->>'fileType' as file_type,
  (metadata->>'fileSize')::INTEGER as file_size
FROM documents
GROUP BY document_id, filename, metadata->>'fileType', metadata->>'fileSize';

-- Comments for documentation
COMMENT ON TABLE documents IS 'Stores document chunks with vector embeddings for RAG system';
COMMENT ON COLUMN documents.id IS 'Unique identifier for each chunk (format: documentId_chunk_index)';
COMMENT ON COLUMN documents.document_id IS 'Groups chunks belonging to the same document';
COMMENT ON COLUMN documents.chunk_index IS 'Position of this chunk within the document (0-indexed)';
COMMENT ON COLUMN documents.embedding IS 'Vector embedding (1536 dimensions) for semantic search';
COMMENT ON COLUMN documents.metadata IS 'Flexible JSONB field for file metadata (type, size, etc.)';
