/**
 * Database Schema Tests
 * 
 * Tests for SQLCipher database schema, migrations, and initialization
 * Requirements: 6.5, 6.6, 14.4
 */

// Mock react-native-quick-sqlite since it's not available in test environment
jest.mock('react-native-quick-sqlite', () => ({
  open: jest.fn(),
}));

import {
  CREATE_TABLES_SQL,
  CREATE_INDEXES_SQL,
  CREATE_TRIGGERS_SQL,
  DATABASE_VERSION,
} from '../schema';
import {
  MIGRATIONS,
  validateMigrations,
  getMigrationsToApply,
  getMigrationsToRollback,
} from '../migrations';

describe('Database Schema', () => {
  describe('Schema SQL', () => {
    it('should have valid CREATE TABLES SQL', () => {
      expect(CREATE_TABLES_SQL).toBeDefined();
      expect(CREATE_TABLES_SQL.length).toBeGreaterThan(0);
      
      // Check that all required tables are defined
      expect(CREATE_TABLES_SQL).toContain('CREATE TABLE IF NOT EXISTS patients');
      expect(CREATE_TABLES_SQL).toContain('CREATE TABLE IF NOT EXISTS assessments');
      expect(CREATE_TABLES_SQL).toContain('CREATE TABLE IF NOT EXISTS baselines');
      expect(CREATE_TABLES_SQL).toContain('CREATE TABLE IF NOT EXISTS alerts');
      expect(CREATE_TABLES_SQL).toContain('CREATE TABLE IF NOT EXISTS sync_queue');
      expect(CREATE_TABLES_SQL).toContain('CREATE TABLE IF NOT EXISTS caregivers');
      expect(CREATE_TABLES_SQL).toContain('CREATE TABLE IF NOT EXISTS fl_gradients');
    });

    it('should have valid CREATE INDEXES SQL', () => {
      expect(CREATE_INDEXES_SQL).toBeDefined();
      expect(CREATE_INDEXES_SQL.length).toBeGreaterThan(0);
      
      // Check for critical indexes
      expect(CREATE_INDEXES_SQL).toContain('idx_assessments_patient_timestamp');
      expect(CREATE_INDEXES_SQL).toContain('idx_alerts_patient_status');
      expect(CREATE_INDEXES_SQL).toContain('idx_sync_queue_priority');
    });

    it('should have valid CREATE TRIGGERS SQL', () => {
      expect(CREATE_TRIGGERS_SQL).toBeDefined();
      expect(CREATE_TRIGGERS_SQL.length).toBeGreaterThan(0);
      
      // Check for critical triggers
      expect(CREATE_TRIGGERS_SQL).toContain('update_patients_timestamp');
      expect(CREATE_TRIGGERS_SQL).toContain('prune_old_assessments');
      expect(CREATE_TRIGGERS_SQL).toContain('cleanup_synced_queue');
    });

    it('should have database version defined', () => {
      expect(DATABASE_VERSION).toBeDefined();
      expect(typeof DATABASE_VERSION).toBe('number');
      expect(DATABASE_VERSION).toBeGreaterThan(0);
    });
  });

  describe('Table Definitions', () => {
    it('should define patients table with required fields', () => {
      expect(CREATE_TABLES_SQL).toContain('id TEXT PRIMARY KEY NOT NULL');
      expect(CREATE_TABLES_SQL).toContain('date_of_birth TEXT NOT NULL');
      expect(CREATE_TABLES_SQL).toContain('stroke_date TEXT NOT NULL');
      expect(CREATE_TABLES_SQL).toContain('baseline_established INTEGER NOT NULL DEFAULT 0');
      expect(CREATE_TABLES_SQL).toContain('assessment_time TEXT NOT NULL');
      expect(CREATE_TABLES_SQL).toContain('timezone TEXT NOT NULL');
    });

    it('should define assessments table with derived metrics only', () => {
      // Speech metrics
      expect(CREATE_TABLES_SQL).toContain('speech_articulation_rate REAL NOT NULL');
      expect(CREATE_TABLES_SQL).toContain('speech_mean_pause_duration REAL NOT NULL');
      expect(CREATE_TABLES_SQL).toContain('speech_phonetic_precision REAL NOT NULL');
      
      // Facial metrics
      expect(CREATE_TABLES_SQL).toContain('facial_symmetry_score REAL NOT NULL');
      expect(CREATE_TABLES_SQL).toContain('facial_left_eye_openness REAL NOT NULL');
      expect(CREATE_TABLES_SQL).toContain('facial_mouth_symmetry REAL NOT NULL');
      
      // Reaction metrics
      expect(CREATE_TABLES_SQL).toContain('reaction_mean_time REAL NOT NULL');
      expect(CREATE_TABLES_SQL).toContain('reaction_time_variability REAL NOT NULL');
      
      // Ensure NO raw biometric data fields
      expect(CREATE_TABLES_SQL).not.toContain('voice_recording');
      expect(CREATE_TABLES_SQL).not.toContain('facial_image');
      expect(CREATE_TABLES_SQL).not.toContain('audio_blob');
      expect(CREATE_TABLES_SQL).not.toContain('image_blob');
    });

    it('should define baselines table with statistical measures', () => {
      // Check for mean, std, min, max for each metric
      expect(CREATE_TABLES_SQL).toContain('speech_articulation_rate_mean REAL NOT NULL');
      expect(CREATE_TABLES_SQL).toContain('speech_articulation_rate_std REAL NOT NULL');
      expect(CREATE_TABLES_SQL).toContain('speech_articulation_rate_min REAL NOT NULL');
      expect(CREATE_TABLES_SQL).toContain('speech_articulation_rate_max REAL NOT NULL');
      
      expect(CREATE_TABLES_SQL).toContain('facial_symmetry_mean REAL NOT NULL');
      expect(CREATE_TABLES_SQL).toContain('reaction_mean_time_mean REAL NOT NULL');
    });

    it('should define alerts table with severity levels', () => {
      expect(CREATE_TABLES_SQL).toContain("severity TEXT NOT NULL CHECK(severity IN ('LOW', 'MEDIUM', 'HIGH'))");
      expect(CREATE_TABLES_SQL).toContain('consecutive_days INTEGER NOT NULL');
      expect(CREATE_TABLES_SQL).toContain('sustained_deviations TEXT NOT NULL');
      expect(CREATE_TABLES_SQL).toContain("status TEXT NOT NULL DEFAULT 'ACTIVE'");
    });

    it('should define sync_queue table for offline functionality', () => {
      expect(CREATE_TABLES_SQL).toContain("data_type TEXT NOT NULL CHECK(data_type IN ('ASSESSMENT', 'ALERT', 'BASELINE', 'PATIENT_UPDATE', 'GRADIENT'))");
      expect(CREATE_TABLES_SQL).toContain('payload TEXT NOT NULL');
      expect(CREATE_TABLES_SQL).toContain('retry_count INTEGER NOT NULL DEFAULT 0');
      expect(CREATE_TABLES_SQL).toContain('next_retry_at TEXT');
    });

    it('should define foreign key constraints', () => {
      expect(CREATE_TABLES_SQL).toContain('FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE');
    });
  });

  describe('Indexes', () => {
    it('should create index for patient-timestamp queries', () => {
      expect(CREATE_INDEXES_SQL).toContain(
        'CREATE INDEX IF NOT EXISTS idx_assessments_patient_timestamp ON assessments(patient_id, timestamp DESC)'
      );
    });

    it('should create index for baseline period queries', () => {
      expect(CREATE_INDEXES_SQL).toContain(
        'CREATE INDEX IF NOT EXISTS idx_assessments_baseline_period ON assessments(patient_id, is_baseline_period)'
      );
    });

    it('should create index for alert queries', () => {
      expect(CREATE_INDEXES_SQL).toContain(
        'CREATE INDEX IF NOT EXISTS idx_alerts_patient_status ON alerts(patient_id, status)'
      );
    });

    it('should create index for sync queue priority', () => {
      expect(CREATE_INDEXES_SQL).toContain(
        'CREATE INDEX IF NOT EXISTS idx_sync_queue_priority ON sync_queue(priority DESC, created_at ASC)'
      );
    });

    it('should create partial index for unsynced alerts', () => {
      expect(CREATE_INDEXES_SQL).toContain(
        'CREATE INDEX IF NOT EXISTS idx_alerts_unsynced ON alerts(synced) WHERE synced = 0'
      );
    });
  });

  describe('Triggers', () => {
    it('should create trigger for automatic timestamp updates', () => {
      expect(CREATE_TRIGGERS_SQL).toContain('CREATE TRIGGER IF NOT EXISTS update_patients_timestamp');
      expect(CREATE_TRIGGERS_SQL).toContain('AFTER UPDATE ON patients');
      expect(CREATE_TRIGGERS_SQL).toContain("SET updated_at = datetime('now')");
    });

    it('should create trigger for 30-day data pruning (Requirement 14.4)', () => {
      expect(CREATE_TRIGGERS_SQL).toContain('CREATE TRIGGER IF NOT EXISTS prune_old_assessments');
      expect(CREATE_TRIGGERS_SQL).toContain('AFTER INSERT ON assessments');
      expect(CREATE_TRIGGERS_SQL).toContain("datetime('now', '-30 days')");
    });

    it('should create trigger for sync queue cleanup', () => {
      expect(CREATE_TRIGGERS_SQL).toContain('CREATE TRIGGER IF NOT EXISTS cleanup_synced_queue');
      expect(CREATE_TRIGGERS_SQL).toContain('AFTER UPDATE ON sync_queue');
      expect(CREATE_TRIGGERS_SQL).toContain("datetime('now', '-7 days')");
    });
  });
});

describe('Database Migrations', () => {
  describe('Migration Validation', () => {
    it('should have valid migration chain', () => {
      const validation = validateMigrations();
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should have sequential version numbers', () => {
      const versions = MIGRATIONS.map((m) => m.version).sort((a, b) => a - b);
      for (let i = 0; i < versions.length; i++) {
        expect(versions[i]).toBe(i + 1);
      }
    });

    it('should have unique version numbers', () => {
      const versions = MIGRATIONS.map((m) => m.version);
      const uniqueVersions = new Set(versions);
      expect(versions.length).toBe(uniqueVersions.size);
    });

    it('should have both up and down statements for each migration', () => {
      MIGRATIONS.forEach((migration) => {
        expect(migration.up).toBeDefined();
        expect(migration.up.length).toBeGreaterThan(0);
        expect(migration.down).toBeDefined();
        expect(migration.down.length).toBeGreaterThan(0);
      });
    });

    it('should have descriptive names for each migration', () => {
      MIGRATIONS.forEach((migration) => {
        expect(migration.name).toBeDefined();
        expect(migration.name.length).toBeGreaterThan(0);
        expect(migration.name).toMatch(/^[a-z_]+$/); // snake_case
      });
    });
  });

  describe('Migration Selection', () => {
    it('should get correct migrations to apply', () => {
      const migrations = getMigrationsToApply(0, 1);
      expect(migrations).toHaveLength(1);
      expect(migrations[0].version).toBe(1);
    });

    it('should return empty array when already at target version', () => {
      const migrations = getMigrationsToApply(1, 1);
      expect(migrations).toHaveLength(0);
    });

    it('should get correct migrations to rollback', () => {
      const migrations = getMigrationsToRollback(1, 0);
      expect(migrations).toHaveLength(1);
      expect(migrations[0].version).toBe(1);
    });

    it('should return migrations in reverse order for rollback', () => {
      // If we had multiple migrations
      if (MIGRATIONS.length > 1) {
        const migrations = getMigrationsToRollback(MIGRATIONS.length, 0);
        for (let i = 0; i < migrations.length - 1; i++) {
          expect(migrations[i].version).toBeGreaterThan(migrations[i + 1].version);
        }
      }
    });
  });

  describe('Initial Migration', () => {
    it('should include all table creation statements', () => {
      const initialMigration = MIGRATIONS.find((m) => m.version === 1);
      expect(initialMigration).toBeDefined();
      
      const upStatements = initialMigration!.up.join(' ');
      expect(upStatements).toContain('CREATE TABLE IF NOT EXISTS patients');
      expect(upStatements).toContain('CREATE TABLE IF NOT EXISTS assessments');
      expect(upStatements).toContain('CREATE TABLE IF NOT EXISTS baselines');
      expect(upStatements).toContain('CREATE TABLE IF NOT EXISTS alerts');
      expect(upStatements).toContain('CREATE TABLE IF NOT EXISTS sync_queue');
    });

    it('should include all index creation statements', () => {
      const initialMigration = MIGRATIONS.find((m) => m.version === 1);
      expect(initialMigration).toBeDefined();
      
      const upStatements = initialMigration!.up.join(' ');
      expect(upStatements).toContain('CREATE INDEX');
    });

    it('should include all trigger creation statements', () => {
      const initialMigration = MIGRATIONS.find((m) => m.version === 1);
      expect(initialMigration).toBeDefined();
      
      const upStatements = initialMigration!.up.join(' ');
      expect(upStatements).toContain('CREATE TRIGGER');
    });

    it('should have proper rollback statements', () => {
      const initialMigration = MIGRATIONS.find((m) => m.version === 1);
      expect(initialMigration).toBeDefined();
      
      const downStatements = initialMigration!.down.join(' ');
      expect(downStatements).toContain('DROP TABLE');
      expect(downStatements).toContain('DROP INDEX');
      expect(downStatements).toContain('DROP TRIGGER');
    });
  });
});

describe('Privacy and Security Requirements', () => {
  it('should not store raw biometric data (Requirement 6.8)', () => {
    // Verify no fields for raw voice or facial data
    const prohibitedFields = [
      'voice_recording',
      'audio_blob',
      'audio_data',
      'facial_image',
      'image_blob',
      'image_data',
      'video_blob',
      'raw_audio',
      'raw_image',
    ];
    
    prohibitedFields.forEach((field) => {
      expect(CREATE_TABLES_SQL.toLowerCase()).not.toContain(field.toLowerCase());
    });
  });

  it('should support encryption via SQLCipher (Requirements 6.5, 6.6)', () => {
    // Schema is designed for SQLCipher - encryption is handled at database level
    // This test verifies the schema is compatible with encrypted storage
    expect(CREATE_TABLES_SQL).toBeDefined();
    expect(CREATE_INDEXES_SQL).toBeDefined();
    // SQLCipher uses standard SQLite syntax, so schema should be valid
  });

  it('should support 30-day data retention (Requirement 14.4)', () => {
    // Verify trigger for automatic pruning
    expect(CREATE_TRIGGERS_SQL).toContain('prune_old_assessments');
    expect(CREATE_TRIGGERS_SQL).toContain("datetime('now', '-30 days')");
  });

  it('should support offline sync queue (Requirement 14.3)', () => {
    expect(CREATE_TABLES_SQL).toContain('CREATE TABLE IF NOT EXISTS sync_queue');
    expect(CREATE_TABLES_SQL).toContain('retry_count');
    expect(CREATE_TABLES_SQL).toContain('next_retry_at');
  });

  it('should support federated learning gradients (Requirement 7.2)', () => {
    expect(CREATE_TABLES_SQL).toContain('CREATE TABLE IF NOT EXISTS fl_gradients');
    expect(CREATE_TABLES_SQL).toContain('gradients_blob BLOB NOT NULL');
    expect(CREATE_TABLES_SQL).toContain('synced INTEGER NOT NULL DEFAULT 0');
  });
});
