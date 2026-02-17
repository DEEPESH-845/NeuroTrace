/**
 * LocalStorageManager Implementation
 * 
 * Handles saving/retrieving assessments and baselines with encryption
 * Uses SQLCipher for AES-256 encryption at the database level
 * Implements automatic data pruning for 30-day retention
 * 
 * Requirements: 6.5, 6.6, 6.8, 14.4
 */

// Declare global functions that may be available in React Native
declare const btoa: ((str: string) => string) | undefined;
declare const atob: ((str: string) => string) | undefined;

import {
  LocalStorageManager,
  AssessmentResult,
  Baseline,
  EncryptedData,
} from '@neurotrace/types';
import { executeQuery, executeQuerySingle } from './index';

/**
 * Generate a UUID v4
 * Simple implementation for React Native
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Simple base64 encoding for React Native
 */
function base64Encode(str: string): string {
  // In React Native, we can use the global btoa if available
  // Otherwise, use a simple implementation
  if (typeof btoa !== 'undefined') {
    return btoa(str);
  }
  // Fallback: just return the string (SQLCipher handles real encryption)
  return str;
}

/**
 * Simple base64 decoding for React Native
 */
function base64Decode(str: string): string {
  // In React Native, we can use the global atob if available
  // Otherwise, use a simple implementation
  if (typeof atob !== 'undefined') {
    return atob(str);
  }
  // Fallback: just return the string (SQLCipher handles real decryption)
  return str;
}

/**
 * Database row types
 */
interface BaselineRow {
  patient_id: string;
  created_at: string;
  assessment_count: number;
  speech_articulation_rate_mean: number;
  speech_articulation_rate_std: number;
  speech_articulation_rate_min: number;
  speech_articulation_rate_max: number;
  facial_symmetry_mean: number;
  facial_symmetry_std: number;
  facial_symmetry_min: number;
  facial_symmetry_max: number;
  reaction_mean_time_mean: number;
  reaction_mean_time_std: number;
  reaction_mean_time_min: number;
  reaction_mean_time_max: number;
}

interface AssessmentRow {
  id: string;
  patient_id: string;
  timestamp: string;
  day_number: number;
  is_baseline_period: number;
  speech_articulation_rate: number;
  speech_mean_pause_duration: number;
  speech_pause_frequency: number;
  speech_phonetic_precision: number;
  speech_voice_quality: number;
  facial_symmetry_score: number;
  facial_left_eye_openness: number;
  facial_right_eye_openness: number;
  facial_mouth_symmetry: number;
  facial_eyebrow_symmetry: number;
  reaction_mean_time: number;
  reaction_time_variability: number;
  reaction_correct_responses: number;
  reaction_total_trials: number;
  completion_time: number;
  device_id: string;
  platform: string;
  app_version: string;
  model_version: string;
  deviations_json: string | null;
}

/**
 * Implementation of LocalStorageManager interface
 * Encryption is handled by SQLCipher at the database level
 */
export class LocalStorageManagerImpl implements LocalStorageManager {
  /**
   * Save assessment result to local database
   * Raw biometric data should already be deleted before calling this
   * 
   * @param result - Assessment result with derived metrics only
   */
  async saveAssessment(result: AssessmentResult): Promise<void> {
    const sql = `
      INSERT INTO assessments (
        id, patient_id, timestamp, day_number, is_baseline_period,
        speech_articulation_rate, speech_mean_pause_duration, speech_pause_frequency,
        speech_phonetic_precision, speech_voice_quality,
        facial_symmetry_score, facial_left_eye_openness, facial_right_eye_openness,
        facial_mouth_symmetry, facial_eyebrow_symmetry,
        reaction_mean_time, reaction_time_variability, reaction_correct_responses,
        reaction_total_trials, completion_time, device_id, platform,
        app_version, model_version, processing_time, has_deviations,
        deviations_json, alert_generated
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?
      )
    `;

    const params = [
      result.assessmentId,
      result.patientId,
      result.timestamp.toISOString(),
      result.dayNumber,
      result.isBaselinePeriod ? 1 : 0,
      // Speech metrics
      result.speechMetrics.articulationRate,
      result.speechMetrics.meanPauseDuration,
      result.speechMetrics.pauseFrequency,
      result.speechMetrics.phoneticPrecision,
      result.speechMetrics.voiceQuality,
      // Facial metrics
      result.facialMetrics.symmetryScore,
      result.facialMetrics.leftEyeOpenness,
      result.facialMetrics.rightEyeOpenness,
      result.facialMetrics.mouthSymmetry,
      result.facialMetrics.eyebrowSymmetry,
      // Reaction metrics
      result.reactionMetrics.meanReactionTime,
      result.reactionMetrics.reactionTimeVariability,
      result.reactionMetrics.correctResponses,
      result.reactionMetrics.totalTrials,
      // Metadata
      result.completionTime,
      result.deviceInfo.deviceId,
      result.deviceInfo.platform,
      result.deviceInfo.appVersion,
      result.deviceInfo.modelVersion,
      0, // processing_time (calculated during processing)
      // Deviations
      result.deviations && result.deviations.length > 0 ? 1 : 0,
      result.deviations ? JSON.stringify(result.deviations) : null,
      result.trendAnalysis ? 1 : 0,
    ];

    executeQuery(sql, params);

    // Automatic pruning is handled by database trigger (prune_old_assessments)
    // which deletes assessments older than 30 days after each insert
  }

  /**
   * Get baseline for a patient
   * 
   * @param patientId - Patient ID
   * @returns Baseline or null if not established
   */
  async getBaseline(patientId: string): Promise<Baseline | null> {
    const sql = `
      SELECT * FROM baselines WHERE patient_id = ?
    `;

    const row = executeQuerySingle<BaselineRow>(sql, [patientId]);

    if (!row) {
      return null;
    }

    // Convert database row to Baseline object
    return {
      patientId: row.patient_id,
      createdAt: new Date(row.created_at),
      assessmentCount: row.assessment_count,
      speechMetrics: {
        mean: row.speech_articulation_rate_mean,
        standardDeviation: row.speech_articulation_rate_std,
        min: row.speech_articulation_rate_min,
        max: row.speech_articulation_rate_max,
      },
      facialMetrics: {
        mean: row.facial_symmetry_mean,
        standardDeviation: row.facial_symmetry_std,
        min: row.facial_symmetry_min,
        max: row.facial_symmetry_max,
      },
      reactionMetrics: {
        mean: row.reaction_mean_time_mean,
        standardDeviation: row.reaction_mean_time_std,
        min: row.reaction_mean_time_min,
        max: row.reaction_mean_time_max,
      },
    };
  }

  /**
   * Save or update baseline for a patient
   * 
   * @param baseline - Baseline to save
   */
  async saveBaseline(baseline: Baseline): Promise<void> {
    // Check if baseline already exists
    const existing = await this.getBaseline(baseline.patientId);

    if (existing) {
      // Update existing baseline
      const sql = `
        UPDATE baselines SET
          assessment_count = ?,
          speech_articulation_rate_mean = ?,
          speech_articulation_rate_std = ?,
          speech_articulation_rate_min = ?,
          speech_articulation_rate_max = ?,
          facial_symmetry_mean = ?,
          facial_symmetry_std = ?,
          facial_symmetry_min = ?,
          facial_symmetry_max = ?,
          reaction_mean_time_mean = ?,
          reaction_mean_time_std = ?,
          reaction_mean_time_min = ?,
          reaction_mean_time_max = ?,
          updated_at = datetime('now')
        WHERE patient_id = ?
      `;

      const params = [
        baseline.assessmentCount,
        baseline.speechMetrics.mean,
        baseline.speechMetrics.standardDeviation,
        baseline.speechMetrics.min,
        baseline.speechMetrics.max,
        baseline.facialMetrics.mean,
        baseline.facialMetrics.standardDeviation,
        baseline.facialMetrics.min,
        baseline.facialMetrics.max,
        baseline.reactionMetrics.mean,
        baseline.reactionMetrics.standardDeviation,
        baseline.reactionMetrics.min,
        baseline.reactionMetrics.max,
        baseline.patientId,
      ];

      executeQuery(sql, params);
    } else {
      // Insert new baseline
      const sql = `
        INSERT INTO baselines (
          id, patient_id, created_at, assessment_count,
          speech_articulation_rate_mean, speech_articulation_rate_std,
          speech_articulation_rate_min, speech_articulation_rate_max,
          speech_pause_duration_mean, speech_pause_duration_std,
          speech_pause_duration_min, speech_pause_duration_max,
          speech_pause_frequency_mean, speech_pause_frequency_std,
          speech_pause_frequency_min, speech_pause_frequency_max,
          speech_phonetic_precision_mean, speech_phonetic_precision_std,
          speech_phonetic_precision_min, speech_phonetic_precision_max,
          speech_voice_quality_mean, speech_voice_quality_std,
          speech_voice_quality_min, speech_voice_quality_max,
          facial_symmetry_mean, facial_symmetry_std,
          facial_symmetry_min, facial_symmetry_max,
          facial_eye_openness_ratio_mean, facial_eye_openness_ratio_std,
          facial_eye_openness_ratio_min, facial_eye_openness_ratio_max,
          facial_mouth_symmetry_mean, facial_mouth_symmetry_std,
          facial_mouth_symmetry_min, facial_mouth_symmetry_max,
          reaction_mean_time_mean, reaction_mean_time_std,
          reaction_mean_time_min, reaction_mean_time_max,
          reaction_variability_mean, reaction_variability_std,
          reaction_variability_min, reaction_variability_max,
          reaction_accuracy_mean, reaction_accuracy_std,
          reaction_accuracy_min, reaction_accuracy_max
        ) VALUES (
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?
        )
      `;

      // For now, we're storing simplified baseline (only one metric per modality)
      // In a full implementation, we'd store all individual metric baselines
      const params = [
        generateUUID(),
        baseline.patientId,
        baseline.createdAt.toISOString(),
        baseline.assessmentCount,
        // Speech metrics (using same values for all speech sub-metrics for now)
        baseline.speechMetrics.mean,
        baseline.speechMetrics.standardDeviation,
        baseline.speechMetrics.min,
        baseline.speechMetrics.max,
        baseline.speechMetrics.mean,
        baseline.speechMetrics.standardDeviation,
        baseline.speechMetrics.min,
        baseline.speechMetrics.max,
        baseline.speechMetrics.mean,
        baseline.speechMetrics.standardDeviation,
        baseline.speechMetrics.min,
        baseline.speechMetrics.max,
        baseline.speechMetrics.mean,
        baseline.speechMetrics.standardDeviation,
        baseline.speechMetrics.min,
        baseline.speechMetrics.max,
        baseline.speechMetrics.mean,
        baseline.speechMetrics.standardDeviation,
        baseline.speechMetrics.min,
        baseline.speechMetrics.max,
        // Facial metrics
        baseline.facialMetrics.mean,
        baseline.facialMetrics.standardDeviation,
        baseline.facialMetrics.min,
        baseline.facialMetrics.max,
        baseline.facialMetrics.mean,
        baseline.facialMetrics.standardDeviation,
        baseline.facialMetrics.min,
        baseline.facialMetrics.max,
        baseline.facialMetrics.mean,
        baseline.facialMetrics.standardDeviation,
        baseline.facialMetrics.min,
        baseline.facialMetrics.max,
        // Reaction metrics
        baseline.reactionMetrics.mean,
        baseline.reactionMetrics.standardDeviation,
        baseline.reactionMetrics.min,
        baseline.reactionMetrics.max,
        baseline.reactionMetrics.mean,
        baseline.reactionMetrics.standardDeviation,
        baseline.reactionMetrics.min,
        baseline.reactionMetrics.max,
        baseline.reactionMetrics.mean,
        baseline.reactionMetrics.standardDeviation,
        baseline.reactionMetrics.min,
        baseline.reactionMetrics.max,
      ];

      executeQuery(sql, params);

      // Update patient baseline_established flag
      executeQuery(
        `UPDATE patients SET baseline_established = 1, baseline_completion_date = ? WHERE id = ?`,
        [baseline.createdAt.toISOString(), baseline.patientId]
      );
    }
  }

  /**
   * Delete baseline for a patient
   */
  async deleteBaseline(patientId: string): Promise<void> {
    const sql = 'DELETE FROM baselines WHERE patient_id = ?';
    executeQuery(sql, [patientId]);
  }

  /**
   * Get recent assessments for a patient
   * 
   * @param patientId - Patient ID
   * @param days - Number of days to look back
   * @returns Array of assessment results
   */
  async getRecentAssessments(
    patientId: string,
    days: number
  ): Promise<AssessmentResult[]> {
    const sql = `
      SELECT * FROM assessments
      WHERE patient_id = ?
      AND timestamp >= datetime('now', '-' || ? || ' days')
      ORDER BY timestamp DESC
    `;

    const rows = executeQuery<AssessmentRow>(sql, [patientId, days]);

    return rows.rows.map((row) => this.mapRowToAssessmentResult(row));
  }

  /**
   * Encrypt data using SQLCipher
   * Note: SQLCipher handles encryption at the database level (AES-256),
   * so this method is primarily for additional application-level encryption if needed.
   * For this implementation, we rely on SQLCipher's database-level encryption.
   * 
   * @param data - Data to encrypt
   * @returns Encrypted data (placeholder - SQLCipher handles actual encryption)
   */
  async encryptData(data: unknown): Promise<EncryptedData> {
    // SQLCipher handles encryption at the database level with AES-256
    // This method is a placeholder for additional application-level encryption
    // In production, you would use react-native-quick-crypto or similar

    // For now, return a placeholder that indicates data is encrypted by SQLCipher
    const dataString = JSON.stringify(data);
    // Simple base64 encoding (not real encryption, just for interface compliance)
    const encoded = base64Encode(dataString);
    return {
      encrypted: encoded,
      iv: 'sqlcipher-encrypted',
      authTag: 'sqlcipher-encrypted',
    };
  }

  /**
   * Decrypt data
   * Note: SQLCipher handles decryption at the database level
   * 
   * @param encrypted - Encrypted data
   * @returns Decrypted data
   */
  async decryptData(encrypted: EncryptedData): Promise<unknown> {
    // SQLCipher handles decryption at the database level
    // This is a placeholder implementation

    if (encrypted.iv === 'sqlcipher-encrypted') {
      const dataString = base64Decode(encrypted.encrypted);
      return JSON.parse(dataString);
    }

    throw new Error('Unsupported encryption format');
  }

  /**
   * Helper: Map database row to AssessmentResult
   */
  private mapRowToAssessmentResult(row: AssessmentRow): AssessmentResult {
    return {
      assessmentId: row.id,
      patientId: row.patient_id,
      timestamp: new Date(row.timestamp),
      dayNumber: row.day_number,
      isBaselinePeriod: row.is_baseline_period === 1,
      speechMetrics: {
        articulationRate: row.speech_articulation_rate,
        meanPauseDuration: row.speech_mean_pause_duration,
        pauseFrequency: row.speech_pause_frequency,
        phoneticPrecision: row.speech_phonetic_precision,
        voiceQuality: row.speech_voice_quality,
        timestamp: new Date(row.timestamp),
      },
      facialMetrics: {
        symmetryScore: row.facial_symmetry_score,
        leftEyeOpenness: row.facial_left_eye_openness,
        rightEyeOpenness: row.facial_right_eye_openness,
        mouthSymmetry: row.facial_mouth_symmetry,
        eyebrowSymmetry: row.facial_eyebrow_symmetry,
        timestamp: new Date(row.timestamp),
      },
      reactionMetrics: {
        meanReactionTime: row.reaction_mean_time,
        reactionTimeVariability: row.reaction_time_variability,
        correctResponses: row.reaction_correct_responses,
        totalTrials: row.reaction_total_trials,
        timestamp: new Date(row.timestamp),
      },
      deviations: row.deviations_json ? JSON.parse(row.deviations_json) : undefined,
      trendAnalysis: undefined, // Not stored in database
      completionTime: row.completion_time,
      deviceInfo: {
        deviceId: row.device_id,
        platform: row.platform,
        appVersion: row.app_version,
        modelVersion: row.model_version,
      },
    };
  }

  /**
   * Save federated model to local storage
   */
  async saveModel(model: FederatedModel): Promise<void> {
    // Convert weights (number[]) to Uint8Array (Float32Array view) for BLOB storage
    const weightsFloats = new Float32Array(model.parameters);
    const weightsBlob = new Uint8Array(weightsFloats.buffer);

    const sql = `
      INSERT OR REPLACE INTO federated_models (
        id, version, weights_blob, config_json, created_at, is_active
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    const params = [
      model.id || generateUUID(),
      model.version,
      weightsBlob,
      JSON.stringify({ roundNumber: model.roundNumber }), // Storing roundNumber in config
      new Date().toISOString(),
      1 // active
    ];

    executeQuery(sql, params);
  }

  /**
   * Get latest active federated model
   */
  async getLatestModel(): Promise<FederatedModel | null> {
    const sql = `
      SELECT * FROM federated_models
      WHERE is_active = 1
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const row = executeQuerySingle<any>(sql);

    if (!row) return null;

    // Convert BLOB back to number[]
    // row.weights_blob should be an ArrayBuffer or Uint8Array depending on driver
    // safely handle conversion
    let parameters: number[] = [];
    if (row.weights_blob) {
      // Assuming quick-sqlite returns Uint8Array or ArrayBuffer for blobs
      const buffer = row.weights_blob instanceof Uint8Array
        ? row.weights_blob.buffer
        : row.weights_blob;
      const floats = new Float32Array(buffer);
      parameters = Array.from(floats);
    }

    const config = JSON.parse(row.config_json);

    return {
      id: row.id,
      version: row.version,
      parameters,
      roundNumber: config.roundNumber || 0,
      createdAt: new Date(row.created_at),
    };
  }

  /**
   * Save assessment schedule
   */
  async saveAssessmentSchedule(schedule: any): Promise<void> {
    const query = `
      INSERT INTO assessment_schedule 
      (id, patient_id, due_date, window_start, window_end, status, reschedule_count, original_due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await executeQuery(query, [
      schedule.id,
      schedule.patientId,
      schedule.dueDate,
      schedule.windowStart,
      schedule.windowEnd,
      schedule.status,
      schedule.rescheduleCount,
      schedule.originalDueDate || null
    ]);
  }

  /**
   * Update assessment schedule
   */
  async updateAssessmentSchedule(schedule: any): Promise<void> {
    const query = `
      UPDATE assessment_schedule
      SET due_date = ?, window_end = ?, status = ?, reschedule_count = ?, original_due_date = ?, updated_at = datetime('now')
      WHERE id = ?
    `;
    await executeQuery(query, [
      schedule.dueDate,
      schedule.windowEnd,
      schedule.status,
      schedule.rescheduleCount,
      schedule.originalDueDate || null,
      schedule.id
    ]);
  }

  /**
   * Get assessment schedule by ID
   */
  async getAssessmentSchedule(id: string): Promise<any | null> {
    const query = 'SELECT * FROM assessment_schedule WHERE id = ?';
    const results = await executeQuery(query, [id]);

    if (results.length === 0) return null;

    const row = results.item(0);
    return {
      id: row.id,
      patientId: row.patient_id,
      dueDate: row.due_date,
      windowStart: row.window_start,
      windowEnd: row.window_end,
      status: row.status,
      rescheduleCount: row.reschedule_count,
      originalDueDate: row.original_due_date
    };
  }

  /**
   * Get pending assessment for patient
   */
  async getPendingAssessment(patientId: string): Promise<any | null> {
    const query = `
      SELECT * FROM assessment_schedule 
      WHERE patient_id = ? AND status = 'PENDING' 
      ORDER BY due_date ASC 
      LIMIT 1
    `;
    const results = await executeQuery(query, [patientId]);

    if (results.length === 0) return null;

    const row = results.item(0);
    return {
      id: row.id,
      patientId: row.patient_id,
      dueDate: row.due_date,
      windowStart: row.window_start,
      windowEnd: row.window_end,
      status: row.status,
      rescheduleCount: row.reschedule_count,
      originalDueDate: row.original_due_date
    };
  }
}

export interface FederatedModel {
  id?: string;
  version: string;
  roundNumber: number;
  parameters: number[];
  createdAt?: Date;
}

/**
 * Create a singleton instance of LocalStorageManager
 */
export const localStorageManager = new LocalStorageManagerImpl();
