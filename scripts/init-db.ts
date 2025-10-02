/**
 * Database Initialization Script
 * Run this script to set up the PostgreSQL database with pgvector
 *
 * Usage: tsx scripts/init-db.ts
 */

import { initializeDatabase, healthCheck, getPool } from '../lib/db/postgres';

async function main() {
  console.log('🚀 Initializing smartFARM database...\n');

  try {
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      console.error('❌ ERROR: DATABASE_URL environment variable is not set');
      console.error('Please set DATABASE_URL in your .env file');
      console.error('Example: DATABASE_URL=postgresql://user:password@localhost:5432/smartfarm');
      process.exit(1);
    }

    console.log('📊 Database URL:', process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@'));

    // Test connection
    console.log('\n🔌 Testing database connection...');
    const isHealthy = await healthCheck();

    if (!isHealthy) {
      console.error('❌ Database connection failed');
      console.error('Please check your DATABASE_URL and ensure PostgreSQL is running');
      process.exit(1);
    }

    console.log('✅ Database connection successful');

    // Initialize database
    console.log('\n🔧 Creating tables and extensions...');
    await initializeDatabase();
    console.log('✅ Database initialized successfully');

    // Verify setup
    console.log('\n🔍 Verifying setup...');
    const pool = getPool();

    // Check pgvector extension
    const extensionResult = await pool.query(
      "SELECT * FROM pg_extension WHERE extname = 'vector'"
    );

    if (extensionResult.rows.length === 0) {
      console.error('⚠️  WARNING: pgvector extension not found');
      console.error('Make sure pgvector is installed on your PostgreSQL server');
    } else {
      console.log('✅ pgvector extension enabled');
    }

    // Check documents table
    const tableResult = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'documents'
      ORDER BY ordinal_position
    `);

    if (tableResult.rows.length === 0) {
      console.error('⚠️  WARNING: documents table not found');
    } else {
      console.log('✅ documents table created with columns:');
      tableResult.rows.forEach((row) => {
        console.log(`   - ${row.column_name}: ${row.data_type}`);
      });
    }

    // Check indexes
    const indexResult = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'documents'
    `);

    console.log('\n📋 Indexes created:');
    if (indexResult.rows.length === 0) {
      console.log('   (none)');
    } else {
      indexResult.rows.forEach((row) => {
        console.log(`   - ${row.indexname}`);
      });
    }

    console.log('\n✨ Database setup complete!\n');
    console.log('You can now:');
    console.log('1. Start the development server: npm run dev');
    console.log('2. Upload documents via the UI');
    console.log('3. Use RAG-enhanced chat\n');

  } catch (error) {
    console.error('\n❌ Error during database initialization:');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    // Close the connection pool
    const { closePool } = await import('../lib/db/postgres');
    await closePool();
    process.exit(0);
  }
}

// Run the script
main();
