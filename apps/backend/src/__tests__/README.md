# Backend Tests

This directory contains unit tests for the NeuroTrace backend, including schema validation tests.

## Prerequisites

Before running tests, you need a PostgreSQL database for testing. You have two options:

### Option 1: Use Docker (Recommended)

```bash
# Start a PostgreSQL container for testing
docker run --name neurotrace-test-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=neurotrace_test \
  -p 5432:5432 \
  -d postgres:15
```

### Option 2: Use Local PostgreSQL

If you have PostgreSQL installed locally, create a test database:

```bash
createdb neurotrace_test
```

## Environment Setup

The test setup automatically uses the following database URL:
```
postgresql://postgres:postgres@localhost:5432/neurotrace_test?schema=public
```

You can override this by setting the `DATABASE_URL` environment variable before running tests.

## Running Tests

```bash
# Run all tests
npm test

# Run only unit tests (excludes property tests)
npm run test:unit

# Run only property tests
npm run test:property

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run a specific test file
npm test -- schema.test.ts
```

## Test Structure

### Schema Validation Tests (`schema.test.ts`)

Tests the Prisma schema including:
- **Model Creation**: Validates that all models can be created with valid data
- **Validation Rules**: Tests required fields, unique constraints, and default values
- **Relationship Integrity**: Verifies foreign key relationships and cascade deletes
- **JSONB Storage**: Tests that complex data structures are stored and retrieved correctly

Coverage includes:
- Patient model (Requirements 1.1)
- Caregiver model (Requirements 1.1)
- Assessment model (Requirements 2.1)
- Baseline model (Requirements 1.1)
- Alert model (Requirements 3.1, 4.1)
- Notification model (Requirements 4.1)
- AuditLog model (Requirements 8.2)
- FederatedGradient and GlobalModel models (Requirements 7.1)

## Troubleshooting

### Database Connection Errors

If you see connection errors:
1. Ensure PostgreSQL is running
2. Verify the database exists: `psql -l | grep neurotrace_test`
3. Check connection settings in your environment

### Schema Sync Issues

If tests fail due to schema mismatches:
```bash
# Reset the test database
cd apps/backend
npx prisma db push --force-reset
```

### Permission Errors

If you see permission errors:
```bash
# Grant necessary permissions
psql -d neurotrace_test -c "GRANT ALL PRIVILEGES ON DATABASE neurotrace_test TO postgres;"
```

## Cleaning Up

After running tests, you can clean up the test database:

```bash
# If using Docker
docker stop neurotrace-test-db
docker rm neurotrace-test-db

# If using local PostgreSQL
dropdb neurotrace_test
```

## CI/CD Integration

These tests are designed to run in CI/CD pipelines. The GitHub Actions workflow automatically:
1. Starts a PostgreSQL service container
2. Runs database migrations
3. Executes all tests
4. Reports coverage

See `.github/workflows/backend-tests.yml` for the complete CI configuration.
