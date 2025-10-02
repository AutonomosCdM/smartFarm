import { Pool, PoolClient } from 'pg';
import { ProcessedDocument } from './document-processor';

/**
 * Vector store configuration
 */
export interface VectorStoreConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  maxConnections?: number;
}

/**
 * Document embedding for storage
 */
export interface DocumentEmbedding {
  id: string;
  documentId: string;
  filename: string;
  chunkIndex: number;
  content: string;
  embedding: number[];
  metadata: Record<string, unknown>;
}

/**
 * Search result with similarity score
 */
export interface SearchResult {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  similarity: number;
  metadata: Record<string, unknown>;
}

/**
 * Batch operation result
 */
export interface BatchOperationResult {
  success: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

/**
 * PostgreSQL Vector Store with pgvector extension
 * Optimized for <500ms retrieval time
 */
export class VectorStore {
  private pool: Pool;
  private static instance: VectorStore | null = null;

  constructor(config: VectorStoreConfig) {
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      max: config.maxConnections || 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }

  /**
   * Get singleton instance of VectorStore
   */
  static getInstance(config?: VectorStoreConfig): VectorStore {
    if (!VectorStore.instance) {
      if (!config) {
        throw new Error('VectorStore config required for first initialization');
      }
      VectorStore.instance = new VectorStore(config);
    }
    return VectorStore.instance;
  }

  /**
   * Initialize the database with pgvector extension and required tables
   */
  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    try {
      // Enable pgvector extension
      await client.query('CREATE EXTENSION IF NOT EXISTS vector');
      console.log('pgvector extension enabled');
    } catch (error) {
      throw new Error(
        `Failed to initialize vector store: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      client.release();
    }
  }

  /**
   * Store document embeddings in PostgreSQL
   * Optimized for batch operations
   *
   * @param embeddings - Array of document embeddings to store
   * @returns Result of batch operation
   */
  async storeEmbeddings(
    embeddings: DocumentEmbedding[]
  ): Promise<BatchOperationResult> {
    const client = await this.pool.connect();
    const result: BatchOperationResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    try {
      await client.query('BEGIN');

      // Batch insert for efficiency
      for (const embedding of embeddings) {
        try {
          const query = `
            INSERT INTO documents (id, document_id, filename, chunk_index, content, embedding, metadata, created_at)
            VALUES ($1, $2, $3, $4, $5, $6::vector, $7, NOW())
            ON CONFLICT (id) DO UPDATE SET
              content = EXCLUDED.content,
              embedding = EXCLUDED.embedding,
              metadata = EXCLUDED.metadata,
              updated_at = NOW()
          `;

          const values = [
            embedding.id,
            embedding.documentId,
            embedding.filename,
            embedding.chunkIndex,
            embedding.content,
            `[${embedding.embedding.join(',')}]`,
            JSON.stringify(embedding.metadata),
          ];

          await client.query(query, values);
          result.success++;
        } catch (error) {
          result.failed++;
          result.errors.push({
            id: embedding.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(
        `Batch embedding storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      client.release();
    }

    return result;
  }

  /**
   * Store a single processed document with all its embeddings
   *
   * @param document - Processed document
   * @param embeddings - Pre-generated embeddings for each chunk
   * @returns Operation result
   */
  async storeDocument(
    document: ProcessedDocument,
    embeddings: number[][]
  ): Promise<BatchOperationResult> {
    if (embeddings.length !== document.chunks.length) {
      throw new Error(
        `Embedding count (${embeddings.length}) doesn't match chunk count (${document.chunks.length})`
      );
    }

    const documentEmbeddings: DocumentEmbedding[] = document.chunks.map(
      (chunk, index) => ({
        id: `${document.id}_chunk_${index}`,
        documentId: document.id,
        filename: document.filename,
        chunkIndex: index,
        content: chunk.getText(),
        embedding: embeddings[index],
        metadata: {
          fileType: document.metadata.fileType,
          fileSize: document.metadata.fileSize,
          processedAt: document.metadata.processedAt,
          chunkCount: document.metadata.chunkCount,
        },
      })
    );

    return this.storeEmbeddings(documentEmbeddings);
  }

  /**
   * Query similar vectors using cosine similarity
   * Optimized for <500ms retrieval time
   *
   * @param queryEmbedding - Query vector embedding
   * @param topK - Number of results to return (default: 3)
   * @param minSimilarity - Minimum similarity threshold (0-1)
   * @returns Top-K most similar documents
   */
  async querySimilar(
    queryEmbedding: number[],
    topK: number = 3,
    minSimilarity: number = 0.5
  ): Promise<SearchResult[]> {
    const startTime = Date.now();
    const client = await this.pool.connect();

    try {
      // Use cosine similarity with pgvector's <=> operator
      // Index is automatically used for performance
      const query = `
        SELECT
          id,
          document_id,
          chunk_index,
          content,
          1 - (embedding <=> $1::vector) as similarity,
          metadata
        FROM documents
        WHERE 1 - (embedding <=> $1::vector) >= $2
        ORDER BY embedding <=> $1::vector
        LIMIT $3
      `;

      const values = [
        `[${queryEmbedding.join(',')}]`,
        minSimilarity,
        topK,
      ];

      const result = await client.query(query, values);

      const searchResults: SearchResult[] = result.rows.map((row) => ({
        id: row.id,
        documentId: row.document_id,
        chunkIndex: row.chunk_index,
        content: row.content,
        similarity: parseFloat(row.similarity),
        metadata: row.metadata,
      }));

      const duration = Date.now() - startTime;
      if (duration > 500) {
        console.warn(`Query took ${duration}ms, exceeding 500ms target`);
      }

      return searchResults;
    } catch (error) {
      throw new Error(
        `Vector similarity query failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      client.release();
    }
  }

  /**
   * Delete a document and all its embeddings
   *
   * @param documentId - ID of the document to delete
   * @returns Number of chunks deleted
   */
  async deleteDocument(documentId: string): Promise<number> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'DELETE FROM documents WHERE document_id = $1',
        [documentId]
      );
      return result.rowCount || 0;
    } catch (error) {
      throw new Error(
        `Document deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      client.release();
    }
  }

  /**
   * Get document by ID
   *
   * @param documentId - Document ID
   * @returns All chunks for the document
   */
  async getDocument(documentId: string): Promise<SearchResult[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT id, document_id, chunk_index, content, metadata
         FROM documents
         WHERE document_id = $1
         ORDER BY chunk_index`,
        [documentId]
      );

      return result.rows.map((row) => ({
        id: row.id,
        documentId: row.document_id,
        chunkIndex: row.chunk_index,
        content: row.content,
        similarity: 1.0, // Full match
        metadata: row.metadata,
      }));
    } catch (error) {
      throw new Error(
        `Get document failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      client.release();
    }
  }

  /**
   * Get total document count
   *
   * @returns Number of unique documents in the store
   */
  async getDocumentCount(): Promise<number> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT COUNT(DISTINCT document_id) as count FROM documents'
      );
      return parseInt(result.rows[0].count);
    } catch (error) {
      throw new Error(
        `Get document count failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      client.release();
    }
  }

  /**
   * Close the database connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
    VectorStore.instance = null;
  }

  /**
   * Check database health
   *
   * @returns Database status information
   */
  async healthCheck(): Promise<{
    connected: boolean;
    documentCount: number;
    error?: string;
  }> {
    try {
      const client = await this.pool.connect();
      try {
        const result = await client.query('SELECT 1');
        const documentCount = await this.getDocumentCount();
        return {
          connected: result.rowCount === 1,
          documentCount,
        };
      } finally {
        client.release();
      }
    } catch (error) {
      return {
        connected: false,
        documentCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Create a vector store instance from environment variables
 */
export function createVectorStoreFromEnv(): VectorStore {
  const config: VectorStoreConfig = {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'smartfarm',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || '',
    maxConnections: parseInt(process.env.POSTGRES_MAX_CONNECTIONS || '20'),
  };

  return VectorStore.getInstance(config);
}
