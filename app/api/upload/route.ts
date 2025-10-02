/**
 * Document Upload API Route
 * Handles file uploads, processing, chunking, and storage with embeddings
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { processDocument, generateEmbeddings } from '@/lib/rag/document-processor';
import { VectorStore, createVectorStoreFromEnv } from '@/lib/rag/vector-store';
import { getPool } from '@/lib/db/postgres';

/**
 * Supported file types
 */
const SUPPORTED_TYPES = ['text/plain', 'text/markdown', 'application/pdf'];
const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Validate file before processing
 */
function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!SUPPORTED_TYPES.includes(file.type) && !file.name.match(/\.(txt|md|pdf)$/i)) {
    return {
      valid: false,
      error: `Unsupported file type. Supported: ${SUPPORTED_EXTENSIONS.join(', ')}`,
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  // Check if file is empty
  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty',
    };
  }

  return { valid: true };
}

/**
 * Save uploaded file to temporary directory
 */
async function saveUploadedFile(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Create temp directory if it doesn't exist
  const uploadDir = join(tmpdir(), 'smartfarm-uploads');
  await mkdir(uploadDir, { recursive: true });

  // Generate unique filename
  const timestamp = Date.now();
  const filename = `${timestamp}_${file.name}`;
  const filepath = join(uploadDir, filename);

  // Write file to disk
  await writeFile(filepath, buffer);

  return filepath;
}

/**
 * POST - Upload and process a document
 */
export async function POST(req: NextRequest) {
  let tempFilePath: string | null = null;

  try {
    // Validate environment variables
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'DATABASE_URL not configured' },
        { status: 500 }
      );
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Save file to temporary location
    tempFilePath = await saveUploadedFile(file);

    // Process document with chunking
    const processedDoc = await processDocument(tempFilePath, {
      chunkSize: 512,
      chunkOverlap: 50,
      maxFileSize: MAX_FILE_SIZE,
    });

    // Generate embeddings for all chunks
    const embeddings = await generateEmbeddings(processedDoc);

    // Initialize vector store
    const vectorStore = createVectorStoreFromEnv();

    // Store document with embeddings in PostgreSQL
    const result = await vectorStore.storeDocument(processedDoc, embeddings);

    // Clean up temporary file
    if (tempFilePath) {
      await unlink(tempFilePath).catch((err) => {
        console.warn('Failed to delete temporary file:', err);
      });
      tempFilePath = null;
    }

    // Return success response
    return NextResponse.json({
      success: true,
      documentId: processedDoc.id,
      filename: processedDoc.filename,
      chunkCount: processedDoc.metadata.chunkCount,
      fileSize: processedDoc.metadata.fileSize,
      fileType: processedDoc.metadata.fileType,
      processedAt: processedDoc.metadata.processedAt,
      storageResult: {
        success: result.success,
        failed: result.failed,
        errors: result.errors,
      },
    });
  } catch (error) {
    console.error('Upload API error:', error);

    // Clean up temporary file on error
    if (tempFilePath) {
      await unlink(tempFilePath).catch((err) => {
        console.warn('Failed to delete temporary file after error:', err);
      });
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        success: false,
        error: `Upload failed: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}

/**
 * GET - List all uploaded documents
 */
export async function GET(req: NextRequest) {
  try {
    const pool = getPool();

    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Query documents (grouped by document_id)
    const result = await pool.query(
      `
      SELECT
        document_id,
        filename,
        COUNT(*) as chunk_count,
        MIN(created_at) as uploaded_at,
        MAX(updated_at) as last_updated,
        metadata->>'fileType' as file_type,
        (metadata->>'fileSize')::INTEGER as file_size
      FROM documents
      GROUP BY document_id, filename, metadata->>'fileType', metadata->>'fileSize'
      ORDER BY MIN(created_at) DESC
      LIMIT $1 OFFSET $2
      `,
      [limit, offset]
    );

    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(DISTINCT document_id) as total FROM documents'
    );
    const totalCount = parseInt(countResult.rows[0]?.total || '0');

    return NextResponse.json({
      success: true,
      documents: result.rows,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + result.rows.length < totalCount,
      },
    });
  } catch (error) {
    console.error('Document list error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        success: false,
        error: `Failed to fetch documents: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove a document and all its chunks
 */
export async function DELETE(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId parameter required' },
        { status: 400 }
      );
    }

    const vectorStore = createVectorStoreFromEnv();
    const deletedCount = await vectorStore.deleteDocument(documentId);

    return NextResponse.json({
      success: true,
      documentId,
      deletedChunks: deletedCount,
    });
  } catch (error) {
    console.error('Document delete error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        success: false,
        error: `Failed to delete document: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}
