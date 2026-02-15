# NeuroTrace Mobile Database

This directory contains the SQLCipher encrypted database implementation for the NeuroTrace mobile app.

## Overview

The database uses **SQLCipher** for AES-256 encryption at rest, ensuring all patient data stored locally is protected. The schema is designed to support:

- **Offline functionality**: Full assessment and deviation detection without internet connectivity
- **Privacy-first**: Only derived metrics stored, no raw biometric data (voice recordings, facial images)
- **Efficient sync**: Queue-based synchronization when connectivity is restored
- **30-day retention**: Automatic pruning of old assessments to manage storage

## Requirements

- **6.5**: Local data encrypted using AES-256 via SQLCipher
- **6.6**: SQLCipher for local database encryption
- **14.4**: Store up to 30 days of assessment data locally

## Database Schema

### Tables

#### `patients`
Stores patient profile and program information.

**Key Fields:**
- `id`: Unique patient identifier (UUID)
- `baseline_established`: Boolean flag (0/1)
- `assessment_time`: Preferred daily assessment time (HH:MM)
- `timezone`: Patient timezone for scheduling

#### `assessments`
Stores derived metrics from assessments. **NO raw biometric data** is stored.

**Key Fields:**
- `patient_id`: Foreign key to patients
- `timestamp`: Assessment completion time
- `day_number`: Days since enrollment
- `is_baseline_period`: Boolean flag for first 7 days
- `speech_*`: Derived speech metrics (articulation rate, pause duration, etc.)
- `facial_*`: Derived facial metrics (symmetry scores, eye openness, etc.)
- `reaction_*`: Reaction time metrics
- `deviations_json`: JSON array of detected deviations
- `alert_generated`: Boolean flag if alert was created

**Privacy Note:** Raw voice recordings and facial images are processed on-device and deleted immediately after metric extraction. Only derived metrics are stored.

#### `baselines`
Stores personalized baseline profiles computed from first 7 days of assessments.

**Key Fields:**
- `patient_id`: Foreign key to patients (unique)
- `assessment_count`: Number of assessments used (minimum 5)
- `*_mean`, `*_std`, `*_min`, `*_max`: Statistical measures for each metric

#### `alerts`
Stores alerts generated from sustained trends (3+ consecutive days of deviations).

**Key Fields:**
- `patient_id`: Foreign key to patients
- `severity`: LOW, MEDIUM, or HIGH
- `triggering_assessments`: JSON array of assessment IDs
- `sustained_deviations`: JSON array of deviation objects
- `consecutive_days`: Number of consecutive days with deviations
- `status`: ACTIVE, ACKNOWLEDGED, RESOLVED, or FALSE_POSITIVE
- `synced`: Boolean flag for cloud sync status

#### `sync_queue`
Stores data that needs to be synced to cloud when connectivity is restored.

**Key Fields:**
- `data_type`: ASSESSMENT, ALERT, BASELINE, PATIENT_UPDATE, or GRADIENT
- `payload`: JSON payload to sync
- `priority`: Higher priority items synced first
- `retry_count`: Number of sync attempts
- `next_retry_at`: Timestamp for next retry (exponential backoff)

#### `caregivers`
Stores linked caregiver information and notification preferences.

#### `fl_gradients`
Stores federated learning gradients for model improvement. Only gradients are transmitted, never raw patient data.

### Indexes

Performance indexes are created for common query patterns:

- `idx_assessments_patient_timestamp`: Most common query (assessments by patient, ordered by time)
- `idx_assessments_patient_day`: Baseline period queries
- `idx_alerts_patient_status`: Active alerts by patient
- `idx_sync_queue_priority`: Sync queue processing order

### Triggers

Automatic data management triggers:

- `update_patients_timestamp`: Auto-update `updated_at` on patient changes
- `prune_old_assessments`: Delete assessments older than 30 days (Requirement 14.4)
- `cleanup_synced_queue`: Remove successfully synced items older than 7 days

## Usage

### Initialization

```typescript
import { initializeDatabase } from './database';

// Initialize with encryption key (should be securely generated and stored)
const result = await initializeDatabase(encryptionKey);

if (result.success) {
  console.log(`Database initialized at version ${result.currentVersion}`);
  console.log(`Applied ${result.migrationsApplied} migrations`);
} else {
  console.error(`Database initialization failed: ${result.error}`);
}
```

### Querying

```typescript
import { executeQuery, executeQuerySingle } from './database';

// Get all assessments for a patient
const assessments = executeQuery(
  'SELECT * FROM assessments WHERE patient_id = ? ORDER BY timestamp DESC',
  [patientId]
);

// Get patient baseline
const baseline = executeQuerySingle(
  'SELECT * FROM baselines WHERE patient_id = ?',
  [patientId]
);
```

### Transactions

```typescript
import { executeTransaction } from './database';

// Save assessment and update baseline in transaction
executeTransaction([
  {
    sql: 'INSERT INTO assessments (...) VALUES (...)',
    params: [/* assessment data */],
  },
  {
    sql: 'UPDATE baselines SET ... WHERE patient_id = ?',
    params: [/* baseline data */],
  },
]);
```

### Database Stats

```typescript
import { getDatabaseStats } from './database';

const stats = getDatabaseStats();
console.log(`Database size: ${stats.databaseSizeKB} KB`);
console.log(`Assessments: ${stats.assessmentCount}`);
console.log(`Sync queue: ${stats.syncQueueCount} items`);
```

## Migrations

The migration system supports versioned schema changes:

1. **Version Tracking**: `schema_version` table tracks applied migrations
2. **Sequential Versions**: Migrations must be numbered sequentially (1, 2, 3, ...)
3. **Up/Down**: Each migration has `up` (apply) and `down` (rollback) statements
4. **Validation**: Migration chain is validated before application

### Adding a New Migration

```typescript
// In migrations.ts
export const MIGRATIONS: Migration[] = [
  // ... existing migrations
  {
    version: 2,
    name: 'add_new_feature',
    up: [
      'ALTER TABLE patients ADD COLUMN new_field TEXT',
      'CREATE INDEX idx_patients_new_field ON patients(new_field)',
    ],
    down: [
      'DROP INDEX idx_patients_new_field',
      'ALTER TABLE patients DROP COLUMN new_field',
    ],
  },
];
```

## Security

### Encryption

- **Algorithm**: AES-256 via SQLCipher
- **Key Management**: Encryption key should be:
  - Generated using cryptographically secure random number generator
  - Stored in device keychain/keystore (iOS Keychain, Android Keystore)
  - Never hardcoded or stored in plain text
  - Rotated periodically (recommended: every 90 days)

### Data Retention

- **Assessments**: Automatically deleted after 30 days (trigger-based)
- **Raw Biometric Data**: Never stored (deleted immediately after processing)
- **Sync Queue**: Cleaned up 7 days after successful sync

### Access Control

- Database file is stored in app's private directory (not accessible to other apps)
- SQLCipher encryption prevents access even if device is compromised
- All queries use parameterized statements to prevent SQL injection

## Performance

### Query Optimization

- Indexes on all foreign keys and common query patterns
- Composite indexes for multi-column queries
- Covering indexes where beneficial

### Storage Management

- Automatic pruning of old data (30-day retention)
- `VACUUM` command to reclaim space (call periodically)
- Typical storage: ~1-2 KB per assessment, ~50-100 KB per patient

### Expected Storage Usage

| Patients | Assessments (30 days) | Estimated Size |
|----------|----------------------|----------------|
| 1        | 30                   | ~100 KB        |
| 1        | 90 (3 months)        | ~200 KB        |
| 5        | 150 (30 days)        | ~500 KB        |

## Testing

Database tests should cover:

1. **Schema Creation**: All tables, indexes, and triggers created correctly
2. **Migrations**: Migrations apply and rollback correctly
3. **Data Integrity**: Foreign key constraints enforced
4. **Triggers**: Automatic pruning and timestamp updates work
5. **Encryption**: Data is encrypted at rest
6. **Performance**: Queries complete within acceptable time

## Troubleshooting

### Database Locked

If you encounter "database is locked" errors:
- Ensure all transactions are properly committed or rolled back
- Close database connections when not in use
- Use `PRAGMA busy_timeout` to increase wait time

### Migration Failures

If a migration fails:
- Check migration validation errors
- Ensure migrations are sequential
- Verify SQL syntax
- Check for data conflicts (e.g., adding NOT NULL column to existing data)

### Storage Issues

If storage is growing too large:
- Run `vacuumDatabase()` to reclaim space
- Verify automatic pruning trigger is working
- Check for orphaned data in sync queue

## References

- [SQLCipher Documentation](https://www.zetetic.net/sqlcipher/)
- [react-native-quick-sqlite](https://github.com/margelo/react-native-quick-sqlite)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
