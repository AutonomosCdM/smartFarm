/**
 * Embedding Generation Module
 * Handles text preprocessing and embedding generation using LlamaIndex
 */

import { Settings } from 'llamaindex';

/**
 * Embedding configuration
 */
export interface EmbeddingConfig {
  modelName?: string;
  dimensions?: number;
  batchSize?: number;
}

/**
 * Default embedding configuration
 * Uses LlamaIndex default embedder (OpenAI text-embedding-ada-002)
 */
const DEFAULT_CONFIG: Required<EmbeddingConfig> = {
  modelName: 'text-embedding-ada-002',
  dimensions: 1536,
  batchSize: 100, // Process embeddings in batches to avoid rate limits
};

/**
 * Preprocess text before embedding generation
 * Cleans and normalizes text for better embedding quality
 *
 * @param text - Raw text to preprocess
 * @returns Cleaned and normalized text
 */
export function preprocessText(text: string): string {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid text input for preprocessing');
  }

  // Remove excessive whitespace
  let cleaned = text.replace(/\s+/g, ' ');

  // Trim leading/trailing whitespace
  cleaned = cleaned.trim();

  // Remove control characters but keep newlines
  cleaned = cleaned.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  // Normalize unicode characters
  cleaned = cleaned.normalize('NFKC');

  // Ensure text is not empty after cleaning
  if (cleaned.length === 0) {
    throw new Error('Text is empty after preprocessing');
  }

  return cleaned;
}

/**
 * Generate embedding for a single text string
 *
 * @param text - Text to generate embedding for
 * @param config - Optional embedding configuration
 * @returns Vector embedding as number array
 * @throws Error if embedding generation fails
 */
export async function generateEmbedding(
  text: string,
  config: EmbeddingConfig = {}
): Promise<number[]> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  try {
    // Preprocess text
    const cleanedText = preprocessText(text);

    // Generate embedding using Settings.embedModel
    const embedding = await Settings.embedModel.getTextEmbedding(cleanedText);

    // Validate embedding dimensions
    if (embedding.length !== mergedConfig.dimensions) {
      throw new Error(
        `Expected embedding dimension ${mergedConfig.dimensions}, got ${embedding.length}`
      );
    }

    return embedding;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Embedding generation failed: ${errorMessage}`);
  }
}

/**
 * Generate embeddings for multiple text strings in batches
 * Optimized to avoid rate limits and manage memory
 *
 * @param texts - Array of texts to generate embeddings for
 * @param config - Optional embedding configuration
 * @returns Array of vector embeddings
 * @throws Error if batch embedding generation fails
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  config: EmbeddingConfig = {}
): Promise<number[][]> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  if (!Array.isArray(texts) || texts.length === 0) {
    throw new Error('Invalid or empty texts array');
  }

  const embeddings: number[][] = [];
  const batchSize = mergedConfig.batchSize;

  // Process in batches to avoid rate limits
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    try {
      // Process batch in parallel
      const batchEmbeddings = await Promise.all(
        batch.map((text) => generateEmbedding(text, config))
      );

      embeddings.push(...batchEmbeddings);

      // Log progress for large batches
      if (texts.length > batchSize) {
        const processed = Math.min(i + batchSize, texts.length);
        console.log(`Processed ${processed}/${texts.length} embeddings`);
      }

      // Add small delay between batches to respect rate limits
      if (i + batchSize < texts.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(
        `Batch embedding generation failed at batch ${i / batchSize + 1}: ${errorMessage}`
      );
    }
  }

  return embeddings;
}

/**
 * Generate embedding for a query string
 * Applies query-specific preprocessing
 *
 * @param query - User query string
 * @param config - Optional embedding configuration
 * @returns Query embedding vector
 */
export async function generateQueryEmbedding(
  query: string,
  config: EmbeddingConfig = {}
): Promise<number[]> {
  if (!query || query.trim().length === 0) {
    throw new Error('Query string cannot be empty');
  }

  // Preprocess query with lowercase for better matching
  const processedQuery = preprocessText(query);

  return generateEmbedding(processedQuery, config);
}

/**
 * Calculate cosine similarity between two embeddings
 * Used for validation and testing
 *
 * @param embedding1 - First embedding vector
 * @param embedding2 - Second embedding vector
 * @returns Similarity score between 0 and 1
 */
export function calculateCosineSimilarity(
  embedding1: number[],
  embedding2: number[]
): number {
  if (embedding1.length !== embedding2.length) {
    throw new Error('Embeddings must have the same dimensions');
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }

  const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);

  if (magnitude === 0) {
    return 0;
  }

  return dotProduct / magnitude;
}

/**
 * Normalize an embedding vector to unit length
 * Useful for certain distance metrics
 *
 * @param embedding - Embedding vector to normalize
 * @returns Normalized embedding vector
 */
export function normalizeEmbedding(embedding: number[]): number[] {
  const magnitude = Math.sqrt(
    embedding.reduce((sum, val) => sum + val * val, 0)
  );

  if (magnitude === 0) {
    throw new Error('Cannot normalize zero vector');
  }

  return embedding.map((val) => val / magnitude);
}

/**
 * Validate embedding vector
 * Checks dimensions and ensures all values are valid numbers
 *
 * @param embedding - Embedding to validate
 * @param expectedDimensions - Expected number of dimensions
 * @returns True if valid, throws error otherwise
 */
export function validateEmbedding(
  embedding: number[],
  expectedDimensions: number = DEFAULT_CONFIG.dimensions
): boolean {
  if (!Array.isArray(embedding)) {
    throw new Error('Embedding must be an array');
  }

  if (embedding.length !== expectedDimensions) {
    throw new Error(
      `Invalid embedding dimensions: expected ${expectedDimensions}, got ${embedding.length}`
    );
  }

  if (!embedding.every((val) => typeof val === 'number' && !isNaN(val))) {
    throw new Error('Embedding contains invalid values');
  }

  return true;
}

/**
 * Get embedding statistics
 * Useful for debugging and monitoring
 *
 * @param embedding - Embedding vector
 * @returns Statistics about the embedding
 */
export function getEmbeddingStats(embedding: number[]) {
  const sum = embedding.reduce((acc, val) => acc + val, 0);
  const mean = sum / embedding.length;
  const squaredDiffs = embedding.map((val) => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / embedding.length;
  const stdDev = Math.sqrt(variance);

  return {
    dimensions: embedding.length,
    mean: parseFloat(mean.toFixed(6)),
    stdDev: parseFloat(stdDev.toFixed(6)),
    min: Math.min(...embedding),
    max: Math.max(...embedding),
    magnitude: Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0)),
  };
}
