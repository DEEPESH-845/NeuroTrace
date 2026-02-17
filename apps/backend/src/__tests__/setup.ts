/**
 * Test Setup
 * 
 * Global setup for Jest tests including database configuration
 * 
 * NOTE: Database tests require PostgreSQL. Unit tests (auth, validation,
 * FHIR, etc.) will run without a database. Only tests that directly
 * use Prisma will fail without a running PostgreSQL instance.
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

// Run migrations before tests (gracefully skip if DB unavailable)
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
    console.warn('\n⚠️  Database not available — skipping DB setup.');
    console.warn('Tests requiring database will fail, but pure unit tests will still run.');
    console.warn('\nTo enable DB tests, start PostgreSQL:');
    console.warn('  docker run --name neurotrace-test-db \\');
    console.warn('    -e POSTGRES_PASSWORD=postgres \\');
    console.warn('    -e POSTGRES_DB=neurotrace_test \\');
    console.warn('    -p 5432:5432 \\');
    console.warn('    -d postgres:15\n');
  }
}, 30000); // 30 second timeout for setup
