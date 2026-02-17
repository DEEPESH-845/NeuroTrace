/**
 * SQLCipher Database Schema for NeuroTrace Mobile App
 * 
 * This schema defines the local encrypted database structure for storing:
 * - Patient profiles
 * - Assessment results (derived metrics only, no raw biometric data)
 * - Baselines
 * - Alerts
 * - Sync queue for offline functionality
 * 
 * All data is encrypted at rest using AES-256 via SQLCipher
 * Requirements: 6.5, 6.6, 14.4
 */

export const CREATE_TABLES_SQL = `
-- Patient Profile Table
-- Stores patient demographics and program information
CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY NOT NULL,
  date_of_birth TEXT NOT NULL,
  gender TEXT NOT NULL,
  stroke_date TEXT NOT NULL,
  stroke_type TEXT NOT NULL,
  discharge_date TEXT NOT NULL,
  assigned_clinician TEXT NOT NULL,
  assigned_hospital TEXT NOT NULL,
  enrollment_date TEXT NOT NULL,
  program_end_date TEXT NOT NULL,
  baseline_established INTEGER NOT NULL DEFAULT 0,
  baseline_completion_date TEXT,
  assessment_time TEXT NOT NULL,
  timezone TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Assessment Results Table
-- Stores derived metrics from assessments (NO raw biometric data)
-- Raw voice recordings and facial images are deleted after processing
CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY NOT NULL,
  patient_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  day_number INTEGER NOT NULL,
  is_baseline_period INTEGER NOT NULL DEFAULT 0,
  
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
  processing_time INTEGER NOT NULL,
  
  -- Deviation tracking
  has_deviations INTEGER NOT NULL DEFAULT 0,
  deviations_json TEXT,
  alert_generated INTEGER NOT NULL DEFAULT 0,
  
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Baseline Table
-- Stores personalized baseline profiles computed from first 7 days
CREATE TABLE IF NOT EXISTS baselines (
  id TEXT PRIMARY KEY NOT NULL,
  patient_id TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL,
  assessment_count INTEGER NOT NULL,
  
  -- Speech metrics baseline
  speech_articulation_rate_mean REAL NOT NULL,
  speech_articulation_rate_std REAL NOT NULL,
  speech_articulation_rate_min REAL NOT NULL,
  speech_articulation_rate_max REAL NOT NULL,
  
  speech_pause_duration_mean REAL NOT NULL,
  speech_pause_duration_std REAL NOT NULL,
  speech_pause_duration_min REAL NOT NULL,
  speech_pause_duration_max REAL NOT NULL,
  
  speech_pause_frequency_mean REAL NOT NULL,
  speech_pause_frequency_std REAL NOT NULL,
  speech_pause_frequency_min REAL NOT NULL,
  speech_pause_frequency_max REAL NOT NULL,
  
  speech_phonetic_precision_mean REAL NOT NULL,
  speech_phonetic_precision_std REAL NOT NULL,
  speech_phonetic_precision_min REAL NOT NULL,
  speech_phonetic_precision_max REAL NOT NULL,
  
  speech_voice_quality_mean REAL NOT NULL,
  speech_voice_quality_std REAL NOT NULL,
  speech_voice_quality_min REAL NOT NULL,
  speech_voice_quality_max REAL NOT NULL,
  
  -- Facial metrics baseline
  facial_symmetry_mean REAL NOT NULL,
  facial_symmetry_std REAL NOT NULL,
  facial_symmetry_min REAL NOT NULL,
  facial_symmetry_max REAL NOT NULL,
  
  facial_eye_openness_ratio_mean REAL NOT NULL,
  facial_eye_openness_ratio_std REAL NOT NULL,
  facial_eye_openness_ratio_min REAL NOT NULL,
  facial_eye_openness_ratio_max REAL NOT NULL,
  
  facial_mouth_symmetry_mean REAL NOT NULL,
  facial_mouth_symmetry_std REAL NOT NULL,
  facial_mouth_symmetry_min REAL NOT NULL,
  facial_mouth_symmetry_max REAL NOT NULL,
  
  -- Reaction time metrics baseline
  reaction_mean_time_mean REAL NOT NULL,
  reaction_mean_time_std REAL NOT NULL,
  reaction_mean_time_min REAL NOT NULL,
  reaction_mean_time_max REAL NOT NULL,
  
  reaction_variability_mean REAL NOT NULL,
  reaction_variability_std REAL NOT NULL,
  reaction_variability_min REAL NOT NULL,
  reaction_variability_max REAL NOT NULL,
  
  reaction_accuracy_mean REAL NOT NULL,
  reaction_accuracy_std REAL NOT NULL,
  reaction_accuracy_min REAL NOT NULL,
  reaction_accuracy_max REAL NOT NULL,
  
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Alerts Table
-- Stores alerts generated from sustained trends
CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY NOT NULL,
  patient_id TEXT NOT NULL,
  severity TEXT NOT NULL CHECK(severity IN ('LOW', 'MEDIUM', 'HIGH')),
  
  -- Trend information
  triggering_assessments TEXT NOT NULL, -- JSON array of assessment IDs
  sustained_deviations TEXT NOT NULL,   -- JSON array of deviations
  affected_modalities TEXT NOT NULL,    -- JSON array of modality names
  consecutive_days INTEGER NOT NULL,
  
  -- Alert content
  message TEXT NOT NULL,
  recommended_actions TEXT NOT NULL,    -- JSON array of action strings
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'FALSE_POSITIVE')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  acknowledged_at TEXT,
  acknowledged_by TEXT,
  clinician_notes TEXT,
  
  -- Sync status
  synced INTEGER NOT NULL DEFAULT 0,
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  last_sync_attempt TEXT,
  
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Sync Queue Table
-- Stores data that needs to be synced to cloud when connectivity is restored
-- Supports offline functionality (Requirement 14.3)
CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY NOT NULL,
  data_type TEXT NOT NULL CHECK(data_type IN ('ASSESSMENT', 'ALERT', 'BASELINE', 'PATIENT_UPDATE', 'GRADIENT')),
  data_id TEXT NOT NULL,
  payload TEXT NOT NULL,           -- JSON payload to sync
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_retry_at TEXT,
  error_message TEXT,
  
  -- Exponential backoff tracking
  next_retry_at TEXT
);

-- Caregiver Information Table
-- Stores linked caregiver details
CREATE TABLE IF NOT EXISTS caregivers (
  id TEXT PRIMARY KEY NOT NULL,
  patient_id TEXT NOT NULL,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT NOT NULL,
  
  -- Notification preferences
  push_enabled INTEGER NOT NULL DEFAULT 1,
  sms_enabled INTEGER NOT NULL DEFAULT 1,
  email_enabled INTEGER NOT NULL DEFAULT 1,
  
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Federated Learning Gradients Table
-- Stores computed gradients for federated learning
-- Only gradients are transmitted, never raw patient data (Requirement 7.2)
CREATE TABLE IF NOT EXISTS fl_gradients (
  id TEXT PRIMARY KEY NOT NULL,
  device_id TEXT NOT NULL,
  model_version TEXT NOT NULL,
  gradients_blob BLOB NOT NULL,
  sample_count INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  synced INTEGER NOT NULL DEFAULT 0,
  sync_attempts INTEGER NOT NULL DEFAULT 0
);
`;

export const CREATE_INDEXES_SQL = `
-- Performance indexes for common queries

-- Patient queries
CREATE INDEX IF NOT EXISTS idx_patients_enrollment ON patients(enrollment_date);

-- Assessment queries by patient and timestamp (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_assessments_patient_timestamp ON assessments(patient_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_assessments_patient_day ON assessments(patient_id, day_number);
CREATE INDEX IF NOT EXISTS idx_assessments_baseline_period ON assessments(patient_id, is_baseline_period);
CREATE INDEX IF NOT EXISTS idx_assessments_timestamp ON assessments(timestamp);

-- Baseline queries
CREATE INDEX IF NOT EXISTS idx_baselines_patient ON baselines(patient_id);

-- Alert queries
CREATE INDEX IF NOT EXISTS idx_alerts_patient_status ON alerts(patient_id, status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_unsynced ON alerts(synced) WHERE synced = 0;

-- Sync queue queries (for offline sync)
CREATE INDEX IF NOT EXISTS idx_sync_queue_priority ON sync_queue(priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_sync_queue_retry ON sync_queue(next_retry_at) WHERE retry_count > 0;
CREATE INDEX IF NOT EXISTS idx_sync_queue_type ON sync_queue(data_type);

-- Caregiver queries
CREATE INDEX IF NOT EXISTS idx_caregivers_patient ON caregivers(patient_id);

-- Federated learning queries
CREATE INDEX IF NOT EXISTS idx_fl_gradients_unsynced ON fl_gradients(synced) WHERE synced = 0;
CREATE INDEX IF NOT EXISTS idx_fl_gradients_device ON fl_gradients(device_id, created_at DESC);
`;

export const CREATE_TRIGGERS_SQL = `
-- Triggers for automatic data management

-- Update patient updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_patients_timestamp 
AFTER UPDATE ON patients
BEGIN
  UPDATE patients SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Update caregiver updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_caregivers_timestamp 
AFTER UPDATE ON caregivers
BEGIN
  UPDATE caregivers SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Automatic data pruning: Delete assessments older than 30 days (Requirement 14.4)
-- This trigger runs after each new assessment insert
CREATE TRIGGER IF NOT EXISTS prune_old_assessments
AFTER INSERT ON assessments
BEGIN
  DELETE FROM assessments 
  WHERE timestamp < datetime('now', '-30 days')
  AND patient_id = NEW.patient_id;
END;

-- Automatic sync queue cleanup: Remove successfully synced items older than 7 days
CREATE TRIGGER IF NOT EXISTS cleanup_synced_queue
AFTER UPDATE ON sync_queue
WHEN NEW.retry_count = 0 AND OLD.retry_count > 0
BEGIN
  DELETE FROM sync_queue 
  WHERE created_at < datetime('now', '-7 days')
  AND retry_count = 0;
END;
`;

// ... existing code ...
export const CREATE_FEDERATED_MODELS_TABLE_SQL = `
-- Federated Learning Models Table
-- Stores downloaded global models
CREATE TABLE IF NOT EXISTS federated_models (
  id TEXT PRIMARY KEY NOT NULL,
  version TEXT NOT NULL UNIQUE,
  weights_blob BLOB NOT NULL,
  config_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  is_active INTEGER NOT NULL DEFAULT 0
);

-- Assessment Schedule Table
-- Tracks upcoming assessments and rescheduling status
CREATE TABLE IF NOT EXISTS assessment_schedule (
  id TEXT PRIMARY KEY NOT NULL,
  patient_id TEXT NOT NULL,
  due_date TEXT NOT NULL,
  window_start TEXT NOT NULL,
  window_end TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',  -- PENDING, COMPLETED, MISSED, CANCELLED
  reschedule_count INTEGER NOT NULL DEFAULT 0,
  original_due_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

/**
 * Database version for migration tracking
 */
export const DATABASE_VERSION = 3;

/**
 * Database configuration
 */
export const DATABASE_CONFIG = {
  name: 'neurotrace.db',
  version: DATABASE_VERSION,
  // SQLCipher encryption enabled
  encryption: true,
  // Location for iOS and Android
  location: 'default',
};

/**
 * SQL statements for dropping all tables (for testing/reset)
 */
export const DROP_TABLES_SQL = `
DROP TABLE IF EXISTS assessment_schedule;
DROP TABLE IF EXISTS fl_gradients;
DROP TABLE IF EXISTS caregivers;
DROP TABLE IF EXISTS sync_queue;
DROP TABLE IF EXISTS alerts;
DROP TABLE IF EXISTS baselines;
DROP TABLE IF EXISTS assessments;
DROP TABLE IF EXISTS patients;
`;
