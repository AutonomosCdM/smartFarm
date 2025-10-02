import {
  Document,
  TextNode,
  Settings,
} from "llamaindex";
import { generateDocumentEmbeddings } from "./embeddings-transformers";
import { readFile } from "fs/promises";
import path from "path";

/**
 * Document processing configuration
 */
export interface DocumentProcessorConfig {
  chunkSize?: number;
  chunkOverlap?: number;
  maxFileSize?: number; // in bytes
}

/**
 * Processed document metadata
 */
export interface ProcessedDocument {
  id: string;
  filename: string;
  content: string;
  chunks: TextNode[];
  metadata: {
    fileType: string;
    fileSize: number;
    processedAt: Date;
    chunkCount: number;
  };
}

/**
 * Supported file types
 */
const SUPPORTED_EXTENSIONS = ['.pdf', '.txt', '.md'] as const;
type SupportedExtension = typeof SUPPORTED_EXTENSIONS[number];

/**
 * Default configuration for document processing
 */
const DEFAULT_CONFIG: Required<DocumentProcessorConfig> = {
  chunkSize: 512, // Optimal for context window and retrieval
  chunkOverlap: 50, // Overlap to maintain context between chunks
  maxFileSize: 10 * 1024 * 1024, // 10MB max file size
};

/**
 * Validates if a file type is supported
 */
function isSupportedFileType(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return SUPPORTED_EXTENSIONS.includes(ext as SupportedExtension);
}

/**
 * Generate a unique document ID
 */
function generateDocumentId(filename: string): string {
  const timestamp = Date.now();
  const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `doc_${timestamp}_${sanitized}`;
}

/**
 * Process a single uploaded file into chunks with embeddings
 *
 * @param filePath - Path to the uploaded file
 * @param config - Optional processing configuration
 * @returns Processed document with chunks and metadata
 * @throws Error if file type is unsupported or processing fails
 */
export async function processDocument(
  filePath: string,
  config: DocumentProcessorConfig = {}
): Promise<ProcessedDocument> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const filename = path.basename(filePath);

  // Validate file type
  if (!isSupportedFileType(filename)) {
    throw new Error(
      `Unsupported file type. Supported formats: ${SUPPORTED_EXTENSIONS.join(', ')}`
    );
  }

  try {
    // Check file size
    const fileBuffer = await readFile(filePath);
    const fileSize = fileBuffer.length;

    if (fileSize > mergedConfig.maxFileSize) {
      throw new Error(
        `File size (${fileSize} bytes) exceeds maximum allowed size (${mergedConfig.maxFileSize} bytes)`
      );
    }

    // Read file content as text
    const content = fileBuffer.toString('utf-8');

    // Create a LlamaIndex Document
    const document = new Document({
      text: content,
      metadata: {
        file_name: filename,
        file_path: filePath,
        file_type: path.extname(filename).toLowerCase(),
      },
    });

    // Configure chunking settings
    Settings.chunkSize = mergedConfig.chunkSize;
    Settings.chunkOverlap = mergedConfig.chunkOverlap;

    // Split document into chunks using the configured node parser
    const nodeParser = Settings.nodeParser;
    const nodes = await nodeParser.getNodesFromDocuments([document]);

    // Generate document metadata
    const processedDoc: ProcessedDocument = {
      id: generateDocumentId(filename),
      filename,
      content: document.getText(),
      chunks: nodes as TextNode[],
      metadata: {
        fileType: path.extname(filename).toLowerCase(),
        fileSize,
        processedAt: new Date(),
        chunkCount: nodes.length,
      },
    };

    return processedDoc;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Document processing failed: ${error.message}`);
    }
    throw new Error('Document processing failed: Unknown error');
  }
}

/**
 * Process multiple documents in batch
 *
 * @param filePaths - Array of file paths to process
 * @param config - Optional processing configuration
 * @returns Array of processed documents
 */
export async function processDocuments(
  filePaths: string[],
  config: DocumentProcessorConfig = {}
): Promise<ProcessedDocument[]> {
  const results: ProcessedDocument[] = [];
  const errors: Array<{ path: string; error: string }> = [];

  // Process documents sequentially to avoid memory issues
  for (const filePath of filePaths) {
    try {
      const processed = await processDocument(filePath, config);
      results.push(processed);
    } catch (error) {
      errors.push({
        path: filePath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Log errors but don't throw - return successful results
  if (errors.length > 0) {
    console.warn('Some documents failed to process:', errors);
  }

  return results;
}

/**
 * Generate embeddings for a document using multilingual-e5-base
 *
 * @param document - Processed document to generate embeddings for
 * @returns Vector embeddings for each chunk (768 dimensions)
 */
export async function generateEmbeddings(
  document: ProcessedDocument
): Promise<number[][]> {
  try {
    // Extract text from all chunks
    const texts = document.chunks.map(chunk => chunk.getText());

    // Generate embeddings using transformers.js (multilingual-e5-base)
    const embeddings = await generateDocumentEmbeddings(texts);

    return embeddings;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Embedding generation failed: ${error.message}`);
    }
    throw new Error('Embedding generation failed: Unknown error');
  }
}

/**
 * Extract text content from a document chunk
 *
 * @param chunk - Text node from document
 * @returns Plain text content
 */
export function extractChunkText(chunk: TextNode): string {
  return chunk.getText();
}

/**
 * Get document statistics
 *
 * @param document - Processed document
 * @returns Statistics about the document
 */
export function getDocumentStats(document: ProcessedDocument) {
  const avgChunkSize = document.chunks.reduce(
    (sum, chunk) => sum + chunk.getText().length,
    0
  ) / document.chunks.length;

  return {
    documentId: document.id,
    filename: document.filename,
    fileSize: document.metadata.fileSize,
    totalChunks: document.metadata.chunkCount,
    averageChunkSize: Math.round(avgChunkSize),
    processedAt: document.metadata.processedAt,
  };
}
