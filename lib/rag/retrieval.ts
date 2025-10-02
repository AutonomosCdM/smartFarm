import { Settings } from 'llamaindex';
import { VectorStore, SearchResult } from './vector-store';

/**
 * Retrieval configuration
 */
export interface RetrievalConfig {
  topK?: number;
  minSimilarity?: number;
  maxContextLength?: number;
  cacheEnabled?: boolean;
  cacheTTL?: number; // in milliseconds
}

/**
 * Retrieved context for chat
 */
export interface RetrievedContext {
  query: string;
  contexts: SearchResult[];
  formattedContext: string;
  metadata: {
    retrievalTime: number;
    resultCount: number;
    fromCache: boolean;
  };
}

/**
 * Cache entry structure
 */
interface CacheEntry {
  context: RetrievedContext;
  timestamp: number;
}

/**
 * Default retrieval configuration
 */
const DEFAULT_CONFIG: Required<RetrievalConfig> = {
  topK: 3,
  minSimilarity: 0.5,
  maxContextLength: 2000, // Characters
  cacheEnabled: true,
  cacheTTL: 5 * 60 * 1000, // 5 minutes
};

/**
 * In-memory cache for frequently accessed vectors
 */
class ContextCache {
  private cache: Map<string, CacheEntry> = new Map();
  private ttl: number;

  constructor(ttl: number) {
    this.ttl = ttl;
    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Generate cache key from query
   */
  private generateKey(query: string, topK: number): string {
    return `${query.toLowerCase().trim()}_${topK}`;
  }

  /**
   * Get cached context if available and not expired
   */
  get(query: string, topK: number): RetrievedContext | null {
    const key = this.generateKey(query, topK);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.context;
  }

  /**
   * Store context in cache
   */
  set(query: string, topK: number, context: RetrievedContext): void {
    const key = this.generateKey(query, topK);
    this.cache.set(key, {
      context,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

/**
 * RAG Retrieval Engine
 * Optimized for <500ms retrieval time with caching
 */
export class RetrievalEngine {
  private vectorStore: VectorStore;
  private cache: ContextCache;
  private config: Required<RetrievalConfig>;

  constructor(vectorStore: VectorStore, config: RetrievalConfig = {}) {
    this.vectorStore = vectorStore;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cache = new ContextCache(this.config.cacheTTL);
  }

  /**
   * Generate embedding for a query string
   *
   * @param query - User query text
   * @returns Query embedding vector
   */
  private async generateQueryEmbedding(query: string): Promise<number[]> {
    try {
      const embedding = await Settings.embedModel.getTextEmbedding(query);
      return embedding;
    } catch (error) {
      throw new Error(
        `Query embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Retrieve relevant context for a user query
   *
   * @param query - User query string
   * @param config - Optional retrieval config override
   * @returns Retrieved context with metadata
   */
  async retrieveContext(
    query: string,
    config?: Partial<RetrievalConfig>
  ): Promise<RetrievedContext> {
    const startTime = Date.now();
    const mergedConfig = { ...this.config, ...config };

    // Check cache first
    if (mergedConfig.cacheEnabled) {
      const cached = this.cache.get(query, mergedConfig.topK);
      if (cached) {
        // Update metadata to reflect cache hit
        return {
          ...cached,
          metadata: {
            ...cached.metadata,
            fromCache: true,
            retrievalTime: Date.now() - startTime,
          },
        };
      }
    }

    try {
      // Generate query embedding
      const queryEmbedding = await this.generateQueryEmbedding(query);

      // Query vector store
      const contexts = await this.vectorStore.querySimilar(
        queryEmbedding,
        mergedConfig.topK,
        mergedConfig.minSimilarity
      );

      // Format context for prompt injection
      const formattedContext = this.formatContextForPrompt(
        contexts,
        mergedConfig.maxContextLength
      );

      const retrievalTime = Date.now() - startTime;

      const result: RetrievedContext = {
        query,
        contexts,
        formattedContext,
        metadata: {
          retrievalTime,
          resultCount: contexts.length,
          fromCache: false,
        },
      };

      // Cache the result
      if (mergedConfig.cacheEnabled && contexts.length > 0) {
        this.cache.set(query, mergedConfig.topK, result);
      }

      // Log warning if retrieval is slow
      if (retrievalTime > 500) {
        console.warn(
          `Retrieval took ${retrievalTime}ms, exceeding 500ms target for query: "${query}"`
        );
      }

      return result;
    } catch (error) {
      throw new Error(
        `Context retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Format retrieved contexts for injection into chat prompt
   *
   * @param contexts - Retrieved search results
   * @param maxLength - Maximum character length
   * @returns Formatted context string
   */
  private formatContextForPrompt(
    contexts: SearchResult[],
    maxLength: number
  ): string {
    if (contexts.length === 0) {
      return '';
    }

    // Sort by similarity score (descending)
    const sorted = [...contexts].sort((a, b) => b.similarity - a.similarity);

    let formatted = '### Relevant Context:\n\n';
    let currentLength = formatted.length;

    for (let i = 0; i < sorted.length; i++) {
      const context = sorted[i];
      const source = context.metadata.filename || 'Unknown source';
      const similarity = (context.similarity * 100).toFixed(1);

      const chunk = `**Source ${i + 1}:** ${source} (Relevance: ${similarity}%)\n${context.content}\n\n`;

      // Check if adding this chunk would exceed max length
      if (currentLength + chunk.length > maxLength && i > 0) {
        formatted += `\n_... (${sorted.length - i} more results truncated to fit context window)_\n`;
        break;
      }

      formatted += chunk;
      currentLength += chunk.length;
    }

    return formatted.trim();
  }

  /**
   * Retrieve context and inject into a chat prompt
   *
   * @param query - User query
   * @param systemPrompt - Base system prompt
   * @param config - Optional retrieval config
   * @returns System prompt with injected context
   */
  async augmentPrompt(
    query: string,
    systemPrompt: string,
    config?: Partial<RetrievalConfig>
  ): Promise<{
    augmentedPrompt: string;
    metadata: RetrievedContext['metadata'];
  }> {
    const retrieved = await this.retrieveContext(query, config);

    if (retrieved.contexts.length === 0) {
      return {
        augmentedPrompt: systemPrompt,
        metadata: retrieved.metadata,
      };
    }

    const augmentedPrompt = `${systemPrompt}

${retrieved.formattedContext}

---
Use the context above to answer the following question. If the context doesn't contain relevant information, say so.`;

    return {
      augmentedPrompt,
      metadata: retrieved.metadata,
    };
  }

  /**
   * Batch retrieve context for multiple queries
   *
   * @param queries - Array of query strings
   * @param config - Optional retrieval config
   * @returns Array of retrieved contexts
   */
  async batchRetrieve(
    queries: string[],
    config?: Partial<RetrievalConfig>
  ): Promise<RetrievedContext[]> {
    const results = await Promise.all(
      queries.map((query) => this.retrieveContext(query, config))
    );
    return results;
  }

  /**
   * Clear the context cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return this.cache.getStats();
  }

  /**
   * Get retrieval engine health status
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    vectorStoreConnected: boolean;
    cacheSize: number;
    error?: string;
  }> {
    try {
      const vectorStoreHealth = await this.vectorStore.healthCheck();
      const cacheStats = this.cache.getStats();

      const status = vectorStoreHealth.connected ? 'healthy' : 'unhealthy';

      return {
        status,
        vectorStoreConnected: vectorStoreHealth.connected,
        cacheSize: cacheStats.size,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        vectorStoreConnected: false,
        cacheSize: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Create a retrieval engine instance
 *
 * @param vectorStore - Vector store instance
 * @param config - Optional retrieval configuration
 * @returns Configured retrieval engine
 */
export function createRetrievalEngine(
  vectorStore: VectorStore,
  config?: RetrievalConfig
): RetrievalEngine {
  return new RetrievalEngine(vectorStore, config);
}

/**
 * Helper function to extract key information from retrieved contexts
 *
 * @param contexts - Search results
 * @returns Extracted metadata and statistics
 */
export function analyzeRetrievedContexts(contexts: SearchResult[]) {
  if (contexts.length === 0) {
    return {
      isEmpty: true,
      sources: [],
      averageSimilarity: 0,
      topSimilarity: 0,
    };
  }

  const sources = Array.from(
    new Set(
      contexts.map((ctx) => ctx.metadata.filename as string || 'Unknown')
    )
  );

  const similarities = contexts.map((ctx) => ctx.similarity);
  const averageSimilarity =
    similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length;
  const topSimilarity = Math.max(...similarities);

  return {
    isEmpty: false,
    sources,
    averageSimilarity,
    topSimilarity,
    totalChunks: contexts.length,
  };
}
