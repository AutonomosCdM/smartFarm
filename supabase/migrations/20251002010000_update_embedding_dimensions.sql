-- Update embedding dimensions from 1536 (OpenAI) to 768 (multilingual-e5-base)
-- Migration: Change vector dimensions for multilingual embedding support

-- Drop existing index (can't alter vector dimensions with index in place)
DROP INDEX IF EXISTS idx_documents_embedding;

-- Alter the embedding column to use 768 dimensions
ALTER TABLE documents
  ALTER COLUMN embedding TYPE vector(768);

-- Recreate the IVFFlat index with new dimensions
CREATE INDEX idx_documents_embedding
  ON documents
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Update comments to reflect new embedding model
COMMENT ON COLUMN documents.embedding IS 'Vector embedding (768 dimensions) using multilingual-e5-base for Spanish support';
