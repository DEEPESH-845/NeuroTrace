/**
 * Test Setup
 * 
 * Global setup for Jest tests including database configuration
 * 
 * IMPORTANT: These tests require a PostgreSQL database.
 * 
 * Quick Setup with Docker:
 *   docker run --name neurotrace-test-db \
 *     -e POSTGRES_PASSWORD=postgres \
 *     -e POSTGRES_DB=neurotrace_test \
 *     -p 5432:5432 \
 *     -d postgres:15
 * 
 * Then run: npm test
 */

import { execSync } from 'child_process';

// Set test database URL if not already set
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/neurotrace_test?schema=public';
}

// Set other required environment variables for tests
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

// Run migrations before tests
beforeAll(async () => {
  try {
    // Generate Prisma Client
    execSync('npx prisma generate', {
      cwd: process.cwd(),
      stdio: 'pipe',
    });

    // Push the schema to the test database
    execSync('npx prisma db push --skip-generate --accept-data-loss', {
      cwd: process.cwd(),
      stdio: 'pipe',
    });
  } catch (error: any) {
    console.error('\n❌ Failed to setup test database');
    console.error('\nThese tests require a PostgreSQL database.');
    console.error('\nQuick setup with Docker:');
    console.error('  docker run --name neurotrace-test-db \\');
    console.error('    -e POSTGRES_PASSWORD=postgres \\');
    console.error('    -e POSTGRES_DB=neurotrace_test \\');
    console.error('    -p 5432:5432 \\');
    console.error('    -d postgres:15');
    console.error('\nThen run: npm test\n');
    throw error;
  }
}, 30000); // 30 second timeout for setup
