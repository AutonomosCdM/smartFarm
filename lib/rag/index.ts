/**
 * RAG System - Main Export File
 * Central export point for all RAG functionality
 */

// Document Processing
export {
  processDocument,
  processDocuments,
  generateEmbeddings,
  extractChunkText,
  getDocumentStats,
  type DocumentProcessorConfig,
  type ProcessedDocument,
} from './document-processor';

// Embeddings
export {
  generateEmbedding,
  generateEmbeddingsBatch,
  generateQueryEmbedding,
  preprocessText,
  calculateCosineSimilarity,
  normalizeEmbedding,
  validateEmbedding,
  getEmbeddingStats,
  type EmbeddingConfig,
} from './embeddings';

// Vector Store
export {
  VectorStore,
  createVectorStoreFromEnv,
  type VectorStoreConfig,
  type DocumentEmbedding,
  type SearchResult,
  type BatchOperationResult,
} from './vector-store';

// Retrieval Engine
export {
  RetrievalEngine,
  createRetrievalEngine,
  analyzeRetrievedContexts,
  type RetrievalConfig,
  type RetrievedContext,
} from './retrieval';

// Re-export from retriever for convenience
export type { SearchResult as RetrievalSearchResult } from './retriever';
