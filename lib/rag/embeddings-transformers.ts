/**
 * Embedding Generation with Transformers.js
 * Uses multilingual-e5-base for Spanish support (768 dimensions)
 */

import { pipeline, env } from '@xenova/transformers';

// Disable local model loading for serverless environments
env.allowLocalModels = false;

// Cache the pipeline
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let embedder: any = null;

/**
 * Initialize the embedding model
 * Uses multilingual-e5-base for Spanish text support
 */
async function getEmbedder() {
  if (!embedder) {
    console.log('Loading multilingual-e5-base model...');
    embedder = await pipeline(
      'feature-extraction',
      'Xenova/multilingual-e5-base',
      { quantized: true } // Use quantized version for faster inference
    );
    console.log('Model loaded successfully');
  }
  return embedder;
}

/**
 * Generate embedding for a single text
 *
 * @param text - Text to generate embedding for
 * @returns Vector embedding (768 dimensions)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty');
  }

  try {
    const model = await getEmbedder();

    // Add "query: " prefix for better retrieval (recommended by E5 model)
    const prefixedText = `query: ${text}`;

    // Generate embedding
    const output = await model(prefixedText, {
      pooling: 'mean',
      normalize: true,
    });

    // Convert to plain array
    const embedding = Array.from(output.data) as number[];

    // Validate dimensions
    if (embedding.length !== 768) {
      throw new Error(
        `Expected 768 dimensions, got ${embedding.length}`
      );
    }

    return embedding;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Embedding generation failed: ${errorMessage}`);
  }
}

/**
 * Generate embeddings for document chunks
 * Uses "passage: " prefix as recommended by E5 model
 *
 * @param texts - Array of text chunks
 * @returns Array of embeddings
 */
export async function generateDocumentEmbeddings(
  texts: string[]
): Promise<number[][]> {
  if (!Array.isArray(texts) || texts.length === 0) {
    throw new Error('Texts array cannot be empty');
  }

  try {
    const model = await getEmbedder();
    const embeddings: number[][] = [];

    // Process in batches to avoid memory issues
    const batchSize = 32;

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      // Add "passage: " prefix for documents
      const prefixedBatch = batch.map(text => `passage: ${text}`);

      // Process batch
      const batchEmbeddings = await Promise.all(
        prefixedBatch.map(async (text) => {
          const output = await model(text, {
            pooling: 'mean',
            normalize: true,
          });
          return Array.from(output.data) as number[];
        })
      );

      embeddings.push(...batchEmbeddings);

      // Log progress
      if (texts.length > batchSize) {
        const processed = Math.min(i + batchSize, texts.length);
        console.log(`Processed ${processed}/${texts.length} embeddings`);
      }
    }

    return embeddings;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Batch embedding generation failed: ${errorMessage}`);
  }
}

/**
 * Calculate cosine similarity between two embeddings
 *
 * @param embedding1 - First embedding vector
 * @param embedding2 - Second embedding vector
 * @returns Similarity score between -1 and 1
 */
export function cosineSimilarity(
  embedding1: number[],
  embedding2: number[]
): number {
  if (embedding1.length !== embedding2.length) {
    throw new Error('Embeddings must have same dimensions');
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
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

/**
 * Validate embedding vector
 *
 * @param embedding - Embedding to validate
 * @returns True if valid, throws error otherwise
 */
export function validateEmbedding(embedding: number[]): boolean {
  if (!Array.isArray(embedding)) {
    throw new Error('Embedding must be an array');
  }

  if (embedding.length !== 768) {
    throw new Error(
      `Invalid embedding dimensions: expected 768, got ${embedding.length}`
    );
  }

  if (!embedding.every((val) => typeof val === 'number' && !isNaN(val))) {
    throw new Error('Embedding contains invalid values');
  }

  return true;
}

/**
 * Get embedding model information
 */
export function getModelInfo() {
  return {
    name: 'multilingual-e5-base',
    dimensions: 768,
    languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'pl', 'ru', 'ja', 'ko', 'zh', 'ar', 'tr'],
    provider: '@xenova/transformers',
    description: 'Multilingual embedding model optimized for semantic search',
  };
}
