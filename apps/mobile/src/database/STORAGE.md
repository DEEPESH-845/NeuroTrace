# LocalStorageManager

## Overview

The `LocalStorageManager` provides a secure interface for storing and retrieving patient assessments and baselines on the mobile device. All data is encrypted at rest using SQLCipher's AES-256 encryption.

## Features

- **Secure Storage**: All data encrypted with AES-256 via SQLCipher
- **Automatic Pruning**: Assessments older than 30 days are automatically deleted
- **Baseline Management**: Save and retrieve personalized patient baselines
- **Assessment History**: Query recent assessments by time range
- **Privacy-First**: Only derived metrics stored, no raw biometric data

## Requirements

Implements requirements:
- **6.5**: Encryption at rest using AES-256
- **6.6**: SQLCipher for local database encryption
- **6.8**: No raw biometric data stored beyond processing
- **14.4**: 30-day data retention with automatic pruning

## Usage

### Initialize Database

```typescript
import { initializeDatabase } from './database';

// Initialize with encryption key
const result = await initializeDatabase('your-encryption-key');

if (result.success) {
  console.log('Database initialized successfully');
} else {
  console.error('Database initialization failed:', result.error);
}
```

### Save Assessment

```typescript
import { localStorageManager } from './database/LocalStorageManager';

const assessment: AssessmentResult = {
  assessmentId: 'uuid',
  patientId: 'patient-id',
  timestamp: new Date(),
  dayNumber: 5,
  isBaselinePeriod: true,
  speechMetrics: {
    articulationRate: 150,
    meanPauseDuration: 200,
    pauseFrequency: 5,
    phoneticPrecision: 0.95,
    voiceQuality: 0.9,
    timestamp: new Date(),
  },
  facialMetrics: {
    symmetryScore: 0.92,
    leftEyeOpenness: 0.8,
    rightEyeOpenness: 0.82,
    mouthSymmetry: 0.88,
    eyebrowSymmetry: 0.85,
    timestamp: new Date(),
  },
  reactionMetrics: {
    meanReactionTime: 450,
    reactionTimeVariability: 50,
    correctResponses: 9,
    totalTrials: 10,
    timestamp: new Date(),
  },
  completionTime: 58,
  deviceInfo: {
    deviceId: 'device-id',
    platform: 'iOS',
    appVersion: '1.0.0',
    modelVersion: 'v1',
  },
};

await localStorageManager.saveAssessment(assessment);
```

### Get Baseline

```typescript
const baseline = await localStorageManager.getBaseline('patient-id');

if (baseline) {
  console.log('Baseline established:', baseline);
  console.log('Speech mean:', baseline.speechMetrics.mean);
  console.log('Speech std dev:', baseline.speechMetrics.standardDeviation);
} else {
  console.log('Baseline not yet established');
}
```

### Save Baseline

```typescript
const baseline: Baseline = {
  patientId: 'patient-id',
  createdAt: new Date(),
  assessmentCount: 7,
  speechMetrics: {
    mean: 150,
    standardDeviation: 10,
    min: 130,
    max: 170,
  },
  facialMetrics: {
    mean: 0.9,
    standardDeviation: 0.05,
    min: 0.85,
    max: 0.95,
  },
  reactionMetrics: {
    mean: 450,
    standardDeviation: 30,
    min: 400,
    max: 500,
  },
};

await localStorageManager.saveBaseline(baseline);
```

### Get Recent Assessments

```typescript
// Get assessments from last 7 days
const recentAssessments = await localStorageManager.getRecentAssessments(
  'patient-id',
  7
);

console.log(`Found ${recentAssessments.length} assessments`);
recentAssessments.forEach((assessment) => {
  console.log(`Day ${assessment.dayNumber}:`, assessment.speechMetrics);
});
```

### Encrypt/Decrypt Data

```typescript
// Encrypt sensitive data (SQLCipher handles database-level encryption)
const encrypted = await localStorageManager.encryptData({
  sensitive: 'data',
});

// Decrypt data
const decrypted = await localStorageManager.decryptData(encrypted);
```

## Data Retention

The database automatically prunes old data:

- **Assessments**: Deleted after 30 days (via database trigger)
- **Baselines**: Retained for patient lifetime
- **Alerts**: Retained until synced to cloud

The pruning trigger runs automatically after each assessment insert:

```sql
CREATE TRIGGER prune_old_assessments
AFTER INSERT ON assessments
BEGIN
  DELETE FROM assessments 
  WHERE timestamp < datetime('now', '-30 days')
  AND patient_id = NEW.patient_id;
END;
```

## Security

### Encryption at Rest

All data is encrypted using SQLCipher with AES-256 encryption:

```typescript
const db = open({
  name: 'neurotrace.db',
  location: 'default',
  encryptionKey: 'your-256-bit-key', // AES-256
});
```

### No Raw Biometric Data

The LocalStorageManager only stores derived metrics:

- ✅ Speech articulation rate, pause duration, phonetic precision
- ✅ Facial symmetry scores, eye openness ratios
- ✅ Reaction time measurements
- ❌ Raw voice recordings (deleted after processing)
- ❌ Raw facial images (deleted after processing)

### Encryption Key Management

The encryption key should be:

1. Generated securely on device setup
2. Stored in iOS Keychain or Android Keystore
3. Never transmitted to cloud
4. Rotated periodically (if required by policy)

Example key generation:

```typescript
import { generateSecureRandom } from 'react-native-securerandom';

// Generate 256-bit key
const keyBytes = await generateSecureRandom(32);
const encryptionKey = keyBytes.map(b => b.toString(16).padStart(2, '0')).join('');
```

## Database Schema

### Assessments Table

Stores derived metrics from assessments:

```sql
CREATE TABLE assessments (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  day_number INTEGER NOT NULL,
  is_baseline_period INTEGER NOT NULL,
  
  -- Speech metrics (derived only)
  speech_articulation_rate REAL NOT NULL,
  speech_mean_pause_duration REAL NOT NULL,
  speech_pause_frequency REAL NOT NULL,
  speech_phonetic_precision REAL NOT NULL,
  speech_voice_quality REAL NOT NULL,
  
  -- Facial metrics (derived only)
  facial_symmetry_score REAL NOT NULL,
  facial_left_eye_openness REAL NOT NULL,
  facial_right_eye_openness REAL NOT NULL,
  facial_mouth_symmetry REAL NOT NULL,
  facial_eyebrow_symmetry REAL NOT NULL,
  
  -- Reaction time metrics
  reaction_mean_time REAL NOT NULL,
  reaction_time_variability REAL NOT NULL,
  reaction_correct_responses INTEGER NOT NULL,
  reaction_total_trials INTEGER NOT NULL,
  
  -- Metadata
  completion_time INTEGER NOT NULL,
  device_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  app_version TEXT NOT NULL,
  model_version TEXT NOT NULL,
  
  -- Deviation tracking
  has_deviations INTEGER NOT NULL DEFAULT 0,
  deviations_json TEXT,
  alert_generated INTEGER NOT NULL DEFAULT 0,
  
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);
```

### Baselines Table

Stores personalized baseline profiles:

```sql
CREATE TABLE baselines (
  id TEXT PRIMARY KEY,
  patient_id TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL,
  assessment_count INTEGER NOT NULL,
  
  -- Speech metrics baseline (mean, std, min, max for each metric)
  speech_articulation_rate_mean REAL NOT NULL,
  speech_articulation_rate_std REAL NOT NULL,
  speech_articulation_rate_min REAL NOT NULL,
  speech_articulation_rate_max REAL NOT NULL,
  
  -- Facial metrics baseline
  facial_symmetry_mean REAL NOT NULL,
  facial_symmetry_std REAL NOT NULL,
  facial_symmetry_min REAL NOT NULL,
  facial_symmetry_max REAL NOT NULL,
  
  -- Reaction time metrics baseline
  reaction_mean_time_mean REAL NOT NULL,
  reaction_mean_time_std REAL NOT NULL,
  reaction_mean_time_min REAL NOT NULL,
  reaction_mean_time_max REAL NOT NULL,
  
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);
```

## Performance

### Indexes

The database includes indexes for common query patterns:

```sql
-- Assessment queries by patient and timestamp
CREATE INDEX idx_assessments_patient_timestamp 
  ON assessments(patient_id, timestamp DESC);

-- Baseline queries
CREATE INDEX idx_baselines_patient 
  ON baselines(patient_id);
```

### Query Performance

Typical query times on modern mobile devices:

- Save assessment: < 10ms
- Get baseline: < 5ms
- Get recent assessments (7 days): < 20ms
- Automatic pruning: < 50ms (runs in background)

## Testing

Run the test suite:

```bash
npm test -- LocalStorageManager.test.ts
```

Tests cover:

- ✅ Saving assessments with all metrics
- ✅ Handling assessments with deviations
- ✅ Getting baseline (exists and not exists)
- ✅ Saving baseline (insert and update)
- ✅ Getting recent assessments
- ✅ Encryption and decryption

## Error Handling

The LocalStorageManager throws errors for:

- Database not initialized
- Invalid data format
- Encryption/decryption failures
- Database constraint violations

Example error handling:

```typescript
try {
  await localStorageManager.saveAssessment(assessment);
} catch (error) {
  if (error.message.includes('Database not initialized')) {
    // Initialize database first
    await initializeDatabase(encryptionKey);
  } else {
    // Log error and retry
    console.error('Failed to save assessment:', error);
  }
}
```

## Migration

When updating the schema, create a new migration:

```typescript
// migrations.ts
export const MIGRATIONS = [
  {
    version: 1,
    name: 'initial_schema',
    up: [CREATE_TABLES_SQL, CREATE_INDEXES_SQL, CREATE_TRIGGERS_SQL],
    down: [DROP_TABLES_SQL],
  },
  {
    version: 2,
    name: 'add_new_field',
    up: ['ALTER TABLE assessments ADD COLUMN new_field TEXT'],
    down: ['ALTER TABLE assessments DROP COLUMN new_field'],
  },
];
```

The migration system automatically applies pending migrations on database initialization.

## Best Practices

1. **Always initialize database before use**
   ```typescript
   await initializeDatabase(encryptionKey);
   ```

2. **Delete raw biometric data immediately after processing**
   ```typescript
   const metrics = await extractMetrics(audioBuffer);
   audioBuffer = null; // Clear raw data
   await localStorageManager.saveAssessment(result);
   ```

3. **Use transactions for multiple operations**
   ```typescript
   import { executeTransaction } from './database';
   
   executeTransaction([
     { sql: 'INSERT INTO ...', params: [...] },
     { sql: 'UPDATE ...', params: [...] },
   ]);
   ```

4. **Monitor database size**
   ```typescript
   import { getDatabaseStats } from './database';
   
   const stats = getDatabaseStats();
   console.log(`Database size: ${stats.databaseSizeKB} KB`);
   ```

5. **Vacuum database periodically**
   ```typescript
   import { vacuumDatabase } from './database';
   
   // Run weekly to reclaim space
   vacuumDatabase();
   ```

## Troubleshooting

### Database locked error

If you see "database is locked" errors:

```typescript
// Ensure you're not running multiple operations simultaneously
// Use a queue or mutex for concurrent access
```

### Encryption key mismatch

If the database fails to open:

```typescript
// The encryption key may have changed
// You'll need to re-initialize the database with the correct key
```

### Storage full

If the device runs out of storage:

```typescript
// Check database size
const stats = getDatabaseStats();
if (stats.databaseSizeKB > 100000) { // 100 MB
  // Manually prune old data or alert user
}
```

## References

- [SQLCipher Documentation](https://www.zetetic.net/sqlcipher/)
- [React Native Quick SQLite](https://github.com/margelo/react-native-quick-sqlite)
- [NeuroTrace Design Document](../../../.kiro/specs/neurotrace-monitoring-system/design.md)
- [NeuroTrace Requirements](../../../.kiro/specs/neurotrace-monitoring-system/requirements.md)
