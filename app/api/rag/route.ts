import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { generateEmbedding } from '@/lib/rag/embeddings-transformers';

// PostgreSQL connection pool
let pool: Pool | null = null;

function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL not configured');
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }
  return pool;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // Validate environment variables
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'DATABASE_URL not configured' },
        { status: 500 }
      );
    }

    // Parse request body
    const { query, topK = 3 } = await req.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

    // Generate embedding for query using multilingual-e5-base
    const queryEmbedding = await generateEmbedding(query);

    // Search pgvector for similar documents
    const db = getPool();
    const result = await db.query(
      `
      SELECT
        id,
        filename,
        content,
        metadata,
        1 - (embedding <=> $1::vector) AS similarity
      FROM documents
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> $1::vector
      LIMIT $2
      `,
      [`[${queryEmbedding.join(',')}]`, topK]
    );

    // Format results
    const chunks = result.rows.map((row) => ({
      id: row.id,
      filename: row.filename,
      content: row.content.substring(0, 500), // Limit chunk size
      similarity: row.similarity,
      metadata: row.metadata,
    }));

    const duration = Date.now() - startTime;

    // Check performance requirement (< 500ms)
    if (duration > 500) {
      console.warn(`RAG retrieval took ${duration}ms (target: < 500ms)`);
    }

    return NextResponse.json({
      chunks,
      query,
      duration,
      count: chunks.length,
    });
  } catch (error) {
    console.error('RAG API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: `RAG retrieval failed: ${errorMessage}`,
        chunks: [], // Return empty chunks on error so chat can continue
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  try {
    const db = getPool();
    const result = await db.query('SELECT COUNT(*) as count FROM documents');

    return NextResponse.json({
      status: 'ok',
      documentCount: parseInt(result.rows[0].count),
    });
  } catch (error) {
    console.error('RAG health check failed:', error);
    return NextResponse.json(
      { status: 'error', error: 'Database connection failed' },
      { status: 500 }
    );
  }
}
