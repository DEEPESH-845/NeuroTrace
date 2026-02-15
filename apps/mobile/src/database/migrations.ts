/**
 * Database Migration System for NeuroTrace Mobile App
 * 
 * Handles database schema versioning and migrations
 * Requirements: 6.5, 6.6, 14.4
 */

import {
  CREATE_TABLES_SQL,
  CREATE_INDEXES_SQL,
  CREATE_TRIGGERS_SQL,
  DATABASE_VERSION,
} from './schema';

export interface Migration {
  version: number;
  name: string;
  up: string[];
  down: string[];
}

/**
 * Migration history
 * Each migration includes:
 * - version: Target database version
 * - name: Descriptive name
 * - up: SQL statements to apply migration
 * - down: SQL statements to rollback migration
 */
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: [
      CREATE_TABLES_SQL,
      CREATE_INDEXES_SQL,
      CREATE_TRIGGERS_SQL,
    ],
    down: [
      'DROP TRIGGER IF EXISTS cleanup_synced_queue',
      'DROP TRIGGER IF EXISTS prune_old_assessments',
      'DROP TRIGGER IF EXISTS update_caregivers_timestamp',
      'DROP TRIGGER IF EXISTS update_patients_timestamp',
      'DROP INDEX IF EXISTS idx_fl_gradients_device',
      'DROP INDEX IF EXISTS idx_fl_gradients_unsynced',
      'DROP INDEX IF EXISTS idx_caregivers_patient',
      'DROP INDEX IF EXISTS idx_sync_queue_type',
      'DROP INDEX IF EXISTS idx_sync_queue_retry',
      'DROP INDEX IF EXISTS idx_sync_queue_priority',
      'DROP INDEX IF EXISTS idx_alerts_unsynced',
      'DROP INDEX IF EXISTS idx_alerts_created',
      'DROP INDEX IF EXISTS idx_alerts_severity',
      'DROP INDEX IF EXISTS idx_alerts_patient_status',
      'DROP INDEX IF EXISTS idx_baselines_patient',
      'DROP INDEX IF EXISTS idx_assessments_timestamp',
      'DROP INDEX IF EXISTS idx_assessments_baseline_period',
      'DROP INDEX IF EXISTS idx_assessments_patient_day',
      'DROP INDEX IF EXISTS idx_assessments_patient_timestamp',
      'DROP INDEX IF EXISTS idx_patients_enrollment',
      'DROP TABLE IF EXISTS fl_gradients',
      'DROP TABLE IF EXISTS caregivers',
      'DROP TABLE IF EXISTS sync_queue',
      'DROP TABLE IF EXISTS alerts',
      'DROP TABLE IF EXISTS baselines',
      'DROP TABLE IF EXISTS assessments',
      'DROP TABLE IF EXISTS patients',
    ],
  },
];

/**
 * Get migrations needed to upgrade from current version to target version
 */
export function getMigrationsToApply(
  currentVersion: number,
  targetVersion: number = DATABASE_VERSION
): Migration[] {
  return MIGRATIONS.filter(
    (migration) =>
      migration.version > currentVersion && migration.version <= targetVersion
  );
}

/**
 * Get migrations needed to downgrade from current version to target version
 */
export function getMigrationsToRollback(
  currentVersion: number,
  targetVersion: number
): Migration[] {
  return MIGRATIONS.filter(
    (migration) =>
      migration.version <= currentVersion && migration.version > targetVersion
  ).reverse();
}

/**
 * Validate migration chain integrity
 * Ensures no gaps in version numbers
 */
export function validateMigrations(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check for duplicate versions
  const versions = MIGRATIONS.map((m) => m.version);
  const uniqueVersions = new Set(versions);
  if (versions.length !== uniqueVersions.size) {
    errors.push('Duplicate migration versions detected');
  }
  
  // Check for sequential versions starting from 1
  const sortedVersions = [...versions].sort((a, b) => a - b);
  for (let i = 0; i < sortedVersions.length; i++) {
    if (sortedVersions[i] !== i + 1) {
      errors.push(`Migration version gap detected: expected ${i + 1}, found ${sortedVersions[i]}`);
    }
  }
  
  // Check that each migration has both up and down
  MIGRATIONS.forEach((migration) => {
    if (!migration.up || migration.up.length === 0) {
      errors.push(`Migration ${migration.version} (${migration.name}) missing 'up' statements`);
    }
    if (!migration.down || migration.down.length === 0) {
      errors.push(`Migration ${migration.version} (${migration.name}) missing 'down' statements`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get current database version from metadata table
 */
export const GET_CURRENT_VERSION_SQL = `
SELECT version FROM schema_version ORDER BY applied_at DESC LIMIT 1;
`;

/**
 * Create schema version tracking table
 */
export const CREATE_VERSION_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS schema_version (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version INTEGER NOT NULL,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

/**
 * Record migration application
 */
export const RECORD_MIGRATION_SQL = `
INSERT INTO schema_version (version, name) VALUES (?, ?);
`;

/**
 * Remove migration record (for rollback)
 */
export const REMOVE_MIGRATION_SQL = `
DELETE FROM schema_version WHERE version = ?;
`;
