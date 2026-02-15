/**
 * Database Initialization and Management
 * 
 * Handles SQLCipher database initialization, migrations, and connection management
 * Requirements: 6.5, 6.6, 14.4
 */

import { open, QuickSQLiteConnection } from 'react-native-quick-sqlite';
import {
  MIGRATIONS,
  getMigrationsToApply,
  validateMigrations,
  CREATE_VERSION_TABLE_SQL,
  GET_CURRENT_VERSION_SQL,
  RECORD_MIGRATION_SQL,
} from './migrations';
import { DATABASE_CONFIG, DATABASE_VERSION } from './schema';

/**
 * Database connection singleton
 */
let dbConnection: QuickSQLiteConnection | null = null;

/**
 * Database initialization result
 */
export interface DatabaseInitResult {
  success: boolean;
  currentVersion: number;
  migrationsApplied: number;
  error?: string;
}

/**
 * Initialize database with encryption and run migrations
 * 
 * @param encryptionKey - AES-256 encryption key for SQLCipher
 * @returns Initialization result
 */
export async function initializeDatabase(
  encryptionKey: string
): Promise<DatabaseInitResult> {
  try {
    // Validate migrations before applying
    const validation = validateMigrations();
    if (!validation.valid) {
      return {
        success: false,
        currentVersion: 0,
        migrationsApplied: 0,
        error: `Migration validation failed: ${validation.errors.join(', ')}`,
      };
    }

    // Open encrypted database connection
    dbConnection = open({
      name: DATABASE_CONFIG.name,
      location: DATABASE_CONFIG.location,
      encryptionKey, // SQLCipher AES-256 encryption
    });

    // Create schema version tracking table if it doesn't exist
    dbConnection.execute(CREATE_VERSION_TABLE_SQL);

    // Get current database version
    const currentVersion = await getCurrentDatabaseVersion(dbConnection);

    // Get migrations to apply
    const migrationsToApply = getMigrationsToApply(
      currentVersion,
      DATABASE_VERSION
    );

    if (migrationsToApply.length === 0) {
      return {
        success: true,
        currentVersion,
        migrationsApplied: 0,
      };
    }

    // Apply migrations in transaction
    let migrationsApplied = 0;
    for (const migration of migrationsToApply) {
      try {
        await applyMigration(dbConnection, migration);
        migrationsApplied++;
      } catch (error) {
        return {
          success: false,
          currentVersion,
          migrationsApplied,
          error: `Failed to apply migration ${migration.version} (${migration.name}): ${error}`,
        };
      }
    }

    return {
      success: true,
      currentVersion: DATABASE_VERSION,
      migrationsApplied,
    };
  } catch (error) {
    return {
      success: false,
      currentVersion: 0,
      migrationsApplied: 0,
      error: `Database initialization failed: ${error}`,
    };
  }
}

/**
 * Get current database version from schema_version table
 */
async function getCurrentDatabaseVersion(
  db: QuickSQLiteConnection
): Promise<number> {
  try {
    const result = db.execute(GET_CURRENT_VERSION_SQL);
    if (result.rows && result.rows.length > 0) {
      return result.rows._array[0].version;
    }
    return 0;
  } catch (error) {
    // Table doesn't exist yet, return version 0
    return 0;
  }
}

/**
 * Apply a single migration
 */
async function applyMigration(
  db: QuickSQLiteConnection,
  migration: typeof MIGRATIONS[0]
): Promise<void> {
  // Start transaction
  db.execute('BEGIN TRANSACTION');

  try {
    // Execute all up statements
    for (const statement of migration.up) {
      db.execute(statement);
    }

    // Record migration in schema_version table
    db.execute(RECORD_MIGRATION_SQL, [migration.version, migration.name]);

    // Commit transaction
    db.execute('COMMIT');
  } catch (error) {
    // Rollback on error
    db.execute('ROLLBACK');
    throw error;
  }
}

/**
 * Get database connection
 * Must call initializeDatabase first
 */
export function getDatabase(): QuickSQLiteConnection {
  if (!dbConnection) {
    throw new Error(
      'Database not initialized. Call initializeDatabase first.'
    );
  }
  return dbConnection;
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (dbConnection) {
    dbConnection.close();
    dbConnection = null;
  }
}

/**
 * Execute a query with parameters
 */
export function executeQuery<T = any>(
  sql: string,
  params: any[] = []
): { rows: T[]; rowsAffected: number } {
  const db = getDatabase();
  const result = db.execute(sql, params);
  
  return {
    rows: result.rows?._array || [],
    rowsAffected: result.rowsAffected || 0,
  };
}

/**
 * Execute a query and return first row
 */
export function executeQuerySingle<T = any>(
  sql: string,
  params: any[] = []
): T | null {
  const result = executeQuery<T>(sql, params);
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Execute multiple statements in a transaction
 */
export function executeTransaction(statements: Array<{ sql: string; params?: any[] }>): void {
  const db = getDatabase();
  
  db.execute('BEGIN TRANSACTION');
  
  try {
    for (const statement of statements) {
      db.execute(statement.sql, statement.params || []);
    }
    db.execute('COMMIT');
  } catch (error) {
    db.execute('ROLLBACK');
    throw error;
  }
}

/**
 * Check if database is initialized
 */
export function isDatabaseInitialized(): boolean {
  return dbConnection !== null;
}

/**
 * Get database statistics
 */
export interface DatabaseStats {
  patientCount: number;
  assessmentCount: number;
  baselineCount: number;
  alertCount: number;
  syncQueueCount: number;
  databaseSizeKB: number;
}

export function getDatabaseStats(): DatabaseStats {
  const db = getDatabase();
  
  const patientCount = executeQuerySingle<{ count: number }>(
    'SELECT COUNT(*) as count FROM patients'
  )?.count || 0;
  
  const assessmentCount = executeQuerySingle<{ count: number }>(
    'SELECT COUNT(*) as count FROM assessments'
  )?.count || 0;
  
  const baselineCount = executeQuerySingle<{ count: number }>(
    'SELECT COUNT(*) as count FROM baselines'
  )?.count || 0;
  
  const alertCount = executeQuerySingle<{ count: number }>(
    'SELECT COUNT(*) as count FROM alerts'
  )?.count || 0;
  
  const syncQueueCount = executeQuerySingle<{ count: number }>(
    'SELECT COUNT(*) as count FROM sync_queue'
  )?.count || 0;
  
  // Get database file size (page_count * page_size)
  const pageCount = executeQuerySingle<{ page_count: number }>(
    'PRAGMA page_count'
  )?.page_count || 0;
  
  const pageSize = executeQuerySingle<{ page_size: number }>(
    'PRAGMA page_size'
  )?.page_size || 0;
  
  const databaseSizeKB = Math.round((pageCount * pageSize) / 1024);
  
  return {
    patientCount,
    assessmentCount,
    baselineCount,
    alertCount,
    syncQueueCount,
    databaseSizeKB,
  };
}

/**
 * Vacuum database to reclaim space
 * Should be called periodically to optimize storage
 */
export function vacuumDatabase(): void {
  const db = getDatabase();
  db.execute('VACUUM');
}

/**
 * Export database utilities and managers
 */
export * from './LocalStorageManager';
export * from './SyncManager';

export function exportSchema(): string[] {
  const db = getDatabase();
  const result = executeQuery<{ sql: string }>(
    "SELECT sql FROM sqlite_master WHERE type='table' OR type='index' OR type='trigger' ORDER BY type, name"
  );
  
  return result.rows.map((row) => row.sql).filter((sql) => sql !== null);
}
