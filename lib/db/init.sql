-- smartFARM v3 Database Initialization Script
-- Run this script on your PostgreSQL database to set up the schema

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents table for RAG system
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),  -- OpenAI text-embedding-3-small produces 1536-dimensional vectors
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for vector similarity search using cosine distance
-- Using ivfflat index for faster approximate nearest neighbor search
CREATE INDEX IF NOT EXISTS documents_embedding_idx
ON documents
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Index on created_at for sorting
CREATE INDEX IF NOT EXISTS documents_created_at_idx
ON documents (created_at DESC);

-- Index on filename for quick lookups
CREATE INDEX IF NOT EXISTS documents_filename_idx
ON documents (filename);

-- Comment on table
COMMENT ON TABLE documents IS 'Stores agricultural documents with embeddings for RAG retrieval';
COMMENT ON COLUMN documents.embedding IS 'Vector embedding (1536-dim) from OpenAI text-embedding-3-small';
COMMENT ON COLUMN documents.metadata IS 'Additional metadata (filename, fileType, fileSize, uploadedAt)';
