/**
 * Vector Retriever Module
 * Re-exports retrieval functionality for easier imports
 * This file provides a consistent API for the RAG retrieval system
 */

export {
  RetrievalEngine,
  createRetrievalEngine,
  analyzeRetrievedContexts,
  type RetrievalConfig,
  type RetrievedContext,
} from './retrieval';

export type { SearchResult } from './vector-store';
