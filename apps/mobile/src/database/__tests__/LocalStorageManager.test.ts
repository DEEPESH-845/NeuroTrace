/**
 * LocalStorageManager Tests
 * 
 * Tests for saving/retrieving assessments and baselines
 * Requirements: 6.5, 6.6, 6.8, 14.4
 */

import { LocalStorageManagerImpl } from '../LocalStorageManager';
import { AssessmentResult, Baseline } from '@neurotrace/types';
import * as db from '../index';

// Mock the database functions
jest.mock('../index', () => ({
  executeQuery: jest.fn(),
  executeQuerySingle: jest.fn(),
  getDatabase: jest.fn(),
}));

describe('LocalStorageManager', () => {
  let storageManager: LocalStorageManagerImpl;

  beforeEach(() => {
    storageManager = new LocalStorageManagerImpl();
    jest.clearAllMocks();
  });

  describe('saveAssessment', () => {
    it('should save assessment with all metrics', async () => {
      const assessment: AssessmentResult = {
        assessmentId: 'test-123',
        patientId: 'patient-456',
        timestamp: new Date('2024-01-15T10:00:00Z'),
        dayNumber: 5,
        isBaselinePeriod: true,
        speechMetrics: {
          articulationRate: 150,
          meanPauseDuration: 200,
          pauseFrequency: 5,
          phoneticPrecision: 0.95,
          voiceQuality: 0.9,
          timestamp: new Date('2024-01-15T10:00:00Z'),
        },
        facialMetrics: {
          symmetryScore: 0.92,
          leftEyeOpenness: 0.8,
          rightEyeOpenness: 0.82,
          mouthSymmetry: 0.88,
          eyebrowSymmetry: 0.85,
          timestamp: new Date('2024-01-15T10:00:00Z'),
        },
        reactionMetrics: {
          meanReactionTime: 450,
          reactionTimeVariability: 50,
          correctResponses: 9,
          totalTrials: 10,
          timestamp: new Date('2024-01-15T10:00:00Z'),
        },
        completionTime: 58,
        deviceInfo: {
          deviceId: 'device-789',
          platform: 'iOS',
          appVersion: '1.0.0',
          modelVersion: 'v1',
        },
      };

      (db.executeQuery as jest.Mock).mockReturnValue({ rows: [], rowsAffected: 1 });

      await storageManager.saveAssessment(assessment);

      expect(db.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO assessments'),
        expect.arrayContaining([
          'test-123',
          'patient-456',
          expect.any(String), // timestamp
          5,
          1, // isBaselinePeriod
        ])
      );
    });

    it('should handle assessments with deviations', async () => {
      const assessment: AssessmentResult = {
        assessmentId: 'test-123',
        patientId: 'patient-456',
        timestamp: new Date('2024-01-15T10:00:00Z'),
        dayNumber: 10,
        isBaselinePeriod: false,
        speechMetrics: {
          articulationRate: 120,
          meanPauseDuration: 300,
          pauseFrequency: 8,
          phoneticPrecision: 0.75,
          voiceQuality: 0.7,
          timestamp: new Date('2024-01-15T10:00:00Z'),
        },
        facialMetrics: {
          symmetryScore: 0.75,
          leftEyeOpenness: 0.6,
          rightEyeOpenness: 0.8,
          mouthSymmetry: 0.7,
          eyebrowSymmetry: 0.72,
          timestamp: new Date('2024-01-15T10:00:00Z'),
        },
        reactionMetrics: {
          meanReactionTime: 650,
          reactionTimeVariability: 120,
          correctResponses: 7,
          totalTrials: 10,
          timestamp: new Date('2024-01-15T10:00:00Z'),
        },
        deviations: [
          {
            metricName: 'articulationRate',
            currentValue: 120,
            baselineValue: 150,
            standardDeviations: 2.5,
            timestamp: new Date('2024-01-15T10:00:00Z'),
          },
        ],
        completionTime: 60,
        deviceInfo: {
          deviceId: 'device-789',
          platform: 'iOS',
          appVersion: '1.0.0',
          modelVersion: 'v1',
        },
      };

      (db.executeQuery as jest.Mock).mockReturnValue({ rows: [], rowsAffected: 1 });

      await storageManager.saveAssessment(assessment);

      expect(db.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO assessments'),
        expect.arrayContaining([
          expect.any(String),
          expect.any(String),
          expect.any(String),
          expect.any(Number),
          expect.any(Number),
          expect.any(Number),
          expect.any(Number),
          expect.any(Number),
          expect.any(Number),
          expect.any(Number),
          expect.any(Number),
          expect.any(Number),
          expect.any(Number),
          expect.any(Number),
          expect.any(Number),
          expect.any(Number),
          expect.any(Number),
          expect.any(Number),
          expect.any(Number),
          expect.any(Number),
          expect.any(String),
          expect.any(String),
          expect.any(String),
          expect.any(String),
          expect.any(Number),
          1, // has_deviations
          expect.stringContaining('articulationRate'), // deviations_json
        ])
      );
    });
  });

  describe('getBaseline', () => {
    it('should return null when baseline does not exist', async () => {
      (db.executeQuerySingle as jest.Mock).mockReturnValue(null);

      const result = await storageManager.getBaseline('patient-456');

      expect(result).toBeNull();
      expect(db.executeQuerySingle).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM baselines'),
        ['patient-456']
      );
    });

    it('should return baseline when it exists', async () => {
      const mockRow = {
        patient_id: 'patient-456',
        created_at: '2024-01-15T10:00:00Z',
        assessment_count: 7,
        speech_articulation_rate_mean: 150,
        speech_articulation_rate_std: 10,
        speech_articulation_rate_min: 130,
        speech_articulation_rate_max: 170,
        facial_symmetry_mean: 0.9,
        facial_symmetry_std: 0.05,
        facial_symmetry_min: 0.85,
        facial_symmetry_max: 0.95,
        reaction_mean_time_mean: 450,
        reaction_mean_time_std: 30,
        reaction_mean_time_min: 400,
        reaction_mean_time_max: 500,
      };

      (db.executeQuerySingle as jest.Mock).mockReturnValue(mockRow);

      const result = await storageManager.getBaseline('patient-456');

      expect(result).toEqual({
        patientId: 'patient-456',
        createdAt: new Date('2024-01-15T10:00:00Z'),
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
      });
    });
  });

  describe('saveBaseline', () => {
    it('should insert new baseline when it does not exist', async () => {
      const baseline: Baseline = {
        patientId: 'patient-456',
        createdAt: new Date('2024-01-15T10:00:00Z'),
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

      (db.executeQuerySingle as jest.Mock).mockReturnValue(null);
      (db.executeQuery as jest.Mock).mockReturnValue({ rows: [], rowsAffected: 1 });

      await storageManager.saveBaseline(baseline);

      expect(db.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO baselines'),
        expect.arrayContaining([
          expect.any(String), // id
          'patient-456',
          expect.any(String), // created_at
          7,
        ])
      );

      // Should also update patient record
      expect(db.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE patients'),
        expect.arrayContaining([expect.any(String), 'patient-456'])
      );
    });

    it('should update existing baseline', async () => {
      const baseline: Baseline = {
        patientId: 'patient-456',
        createdAt: new Date('2024-01-15T10:00:00Z'),
        assessmentCount: 8,
        speechMetrics: {
          mean: 155,
          standardDeviation: 12,
          min: 135,
          max: 175,
        },
        facialMetrics: {
          mean: 0.91,
          standardDeviation: 0.06,
          min: 0.86,
          max: 0.96,
        },
        reactionMetrics: {
          mean: 455,
          standardDeviation: 32,
          min: 405,
          max: 505,
        },
      };

      // Mock existing baseline
      (db.executeQuerySingle as jest.Mock).mockReturnValue({
        patient_id: 'patient-456',
        created_at: '2024-01-15T10:00:00Z',
        assessment_count: 7,
        speech_articulation_rate_mean: 150,
        speech_articulation_rate_std: 10,
        speech_articulation_rate_min: 130,
        speech_articulation_rate_max: 170,
        facial_symmetry_mean: 0.9,
        facial_symmetry_std: 0.05,
        facial_symmetry_min: 0.85,
        facial_symmetry_max: 0.95,
        reaction_mean_time_mean: 450,
        reaction_mean_time_std: 30,
        reaction_mean_time_min: 400,
        reaction_mean_time_max: 500,
      });

      (db.executeQuery as jest.Mock).mockReturnValue({ rows: [], rowsAffected: 1 });

      await storageManager.saveBaseline(baseline);

      expect(db.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE baselines'),
        expect.arrayContaining([
          8, // assessment_count
          155, // speech mean
          12, // speech std
          135, // speech min
          175, // speech max
        ])
      );
    });
  });

  describe('getRecentAssessments', () => {
    it('should return assessments from the last N days', async () => {
      const mockRows = [
        {
          id: 'assessment-1',
          patient_id: 'patient-456',
          timestamp: '2024-01-15T10:00:00Z',
          day_number: 5,
          is_baseline_period: 1,
          speech_articulation_rate: 150,
          speech_mean_pause_duration: 200,
          speech_pause_frequency: 5,
          speech_phonetic_precision: 0.95,
          speech_voice_quality: 0.9,
          facial_symmetry_score: 0.92,
          facial_left_eye_openness: 0.8,
          facial_right_eye_openness: 0.82,
          facial_mouth_symmetry: 0.88,
          facial_eyebrow_symmetry: 0.85,
          reaction_mean_time: 450,
          reaction_time_variability: 50,
          reaction_correct_responses: 9,
          reaction_total_trials: 10,
          completion_time: 58,
          device_id: 'device-789',
          platform: 'iOS',
          app_version: '1.0.0',
          model_version: 'v1',
          deviations_json: null,
        },
      ];

      (db.executeQuery as jest.Mock).mockReturnValue({ rows: mockRows, rowsAffected: 1 });

      const result = await storageManager.getRecentAssessments('patient-456', 7);

      expect(result).toHaveLength(1);
      expect(result[0].assessmentId).toBe('assessment-1');
      expect(result[0].patientId).toBe('patient-456');
      expect(result[0].dayNumber).toBe(5);
      expect(result[0].isBaselinePeriod).toBe(true);
      expect(result[0].speechMetrics.articulationRate).toBe(150);
    });

    it('should return empty array when no assessments found', async () => {
      (db.executeQuery as jest.Mock).mockReturnValue({ rows: [], rowsAffected: 0 });

      const result = await storageManager.getRecentAssessments('patient-456', 7);

      expect(result).toEqual([]);
    });
  });

  describe('encryptData and decryptData', () => {
    it('should encrypt and decrypt data correctly', async () => {
      const testData = {
        sensitive: 'information',
        number: 42,
        nested: { value: 'test' },
      };

      const encrypted = await storageManager.encryptData(testData);

      expect(encrypted).toHaveProperty('encrypted');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('authTag');
      expect(encrypted.iv).toBe('sqlcipher-encrypted');

      const decrypted = await storageManager.decryptData(encrypted);

      expect(decrypted).toEqual(testData);
    });

    it('should throw error for unsupported encryption format', async () => {
      const invalidEncrypted = {
        encrypted: 'test',
        iv: 'invalid-format',
        authTag: 'invalid',
      };

      await expect(storageManager.decryptData(invalidEncrypted)).rejects.toThrow(
        'Unsupported encryption format'
      );
    });
  });
});
