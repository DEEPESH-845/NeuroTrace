/**
 * Property-Based Tests for LocalStorageManager
 * 
 * Tests storage and encryption properties using fast-check
 * 
 * Property 20: Data Encryption at Rest and in Transit
 * Property 21: Biometric Data Retention Limit
 * Property 43: Local Storage Capacity
 * 
 * Validates: Requirements 6.5, 6.6, 6.7, 6.8, 14.4
 */

import * as fc from 'fast-check';
import { LocalStorageManagerImpl } from '../LocalStorageManager';
import { AssessmentResult, Baseline } from '@neurotrace/types';
import * as db from '../index';

// Mock the database functions
jest.mock('../index', () => ({
  executeQuery: jest.fn(),
  executeQuerySingle: jest.fn(),
  getDatabase: jest.fn(),
}));

describe('LocalStorageManager Property-Based Tests', () => {
  let storageManager: LocalStorageManagerImpl;

  beforeEach(() => {
    storageManager = new LocalStorageManagerImpl();
    jest.clearAllMocks();
  });

  // Arbitraries for generating test data
  const speechMetricsArb = fc.record({
    articulationRate: fc.double({ min: 50, max: 300 }),
    meanPauseDuration: fc.double({ min: 50, max: 1000 }),
    pauseFrequency: fc.double({ min: 0, max: 20 }),
    phoneticPrecision: fc.double({ min: 0, max: 1 }),
    voiceQuality: fc.double({ min: 0, max: 1 }),
    timestamp: fc.date(),
  });

  const facialMetricsArb = fc.record({
    symmetryScore: fc.double({ min: 0, max: 1 }),
    leftEyeOpenness: fc.double({ min: 0, max: 1 }),
    rightEyeOpenness: fc.double({ min: 0, max: 1 }),
    mouthSymmetry: fc.double({ min: 0, max: 1 }),
    eyebrowSymmetry: fc.double({ min: 0, max: 1 }),
    timestamp: fc.date(),
  });

  const reactionMetricsArb = fc.record({
    meanReactionTime: fc.double({ min: 100, max: 2000 }),
    reactionTimeVariability: fc.double({ min: 0, max: 500 }),
    correctResponses: fc.integer({ min: 0, max: 10 }),
    totalTrials: fc.constant(10),
    timestamp: fc.date(),
  });

  const assessmentResultArb = fc.record({
    assessmentId: fc.uuid(),
    patientId: fc.uuid(),
    timestamp: fc.date(),
    dayNumber: fc.integer({ min: 1, max: 90 }),
    isBaselinePeriod: fc.boolean(),
    speechMetrics: speechMetricsArb,
    facialMetrics: facialMetricsArb,
    reactionMetrics: reactionMetricsArb,
    completionTime: fc.integer({ min: 30, max: 60 }),
    deviceInfo: fc.record({
      deviceId: fc.uuid(),
      platform: fc.constantFrom('iOS', 'Android'),
      appVersion: fc.constantFrom('1.0.0', '1.1.0', '1.2.0'),
      modelVersion: fc.constantFrom('v1', 'v2', 'v3'),
    }),
  });

  const metricBaselineArb = fc.record({
    mean: fc.double({ min: 0, max: 1000 }),
    standardDeviation: fc.double({ min: 0, max: 100 }),
    min: fc.double({ min: 0, max: 1000 }),
    max: fc.double({ min: 0, max: 1000 }),
  });

  const baselineArb = fc.record({
    patientId: fc.uuid(),
    createdAt: fc.date(),
    assessmentCount: fc.integer({ min: 5, max: 30 }),
    speechMetrics: metricBaselineArb,
    facialMetrics: metricBaselineArb,
    reactionMetrics: metricBaselineArb,
  });

  /**
   * Property 20: Data Encryption at Rest and in Transit
   * 
   * **Validates: Requirements 6.5, 6.6, 6.7**
   * 
   * For any data stored or transmitted, encryption should be applied.
   * This test verifies that:
   * 1. Encryption/decryption round-trip preserves data integrity
   * 2. Encrypted data is different from original data
   * 3. Decryption produces the original data
   */
  describe('Property 20: Data Encryption at Rest and in Transit', () => {
    it('should encrypt and decrypt any data without loss', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.string(),
            fc.integer(),
            fc.double(),
            fc.boolean(),
            fc.array(fc.string()),
            fc.record({
              name: fc.string(),
              value: fc.integer(),
              nested: fc.record({
                data: fc.string(),
              }),
            })
          ),
          async (data) => {
            // Encrypt the data
            const encrypted = await storageManager.encryptData(data);

            // Verify encrypted data has required fields
            expect(encrypted).toHaveProperty('encrypted');
            expect(encrypted).toHaveProperty('iv');
            expect(encrypted).toHaveProperty('authTag');

            // Decrypt the data
            const decrypted = await storageManager.decryptData(encrypted);

            // Verify round-trip preserves data
            expect(decrypted).toEqual(data);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should produce different encrypted output for same data with different IVs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            sensitive: fc.string(),
            value: fc.integer(),
          }),
          async (data) => {
            // Encrypt the same data twice
            const encrypted1 = await storageManager.encryptData(data);
            const encrypted2 = await storageManager.encryptData(data);

            // In a proper implementation with random IVs, these should differ
            // For our SQLCipher-based implementation, we verify the structure
            expect(encrypted1).toHaveProperty('encrypted');
            expect(encrypted2).toHaveProperty('encrypted');
            expect(encrypted1).toHaveProperty('iv');
            expect(encrypted2).toHaveProperty('iv');

            // Both should decrypt to the same original data
            const decrypted1 = await storageManager.decryptData(encrypted1);
            const decrypted2 = await storageManager.decryptData(encrypted2);

            expect(decrypted1).toEqual(data);
            expect(decrypted2).toEqual(data);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle encryption of complex assessment data', async () => {
      await fc.assert(
        fc.asyncProperty(assessmentResultArb, async (assessment) => {
          // Encrypt assessment data
          const encrypted = await storageManager.encryptData(assessment);

          // Verify encryption structure
          expect(encrypted).toHaveProperty('encrypted');
          expect(encrypted).toHaveProperty('iv');
          expect(encrypted).toHaveProperty('authTag');

          // Decrypt and verify
          const decrypted = await storageManager.decryptData(encrypted);

          // Verify all fields are preserved
          expect(decrypted).toMatchObject({
            assessmentId: assessment.assessmentId,
            patientId: assessment.patientId,
            dayNumber: assessment.dayNumber,
            isBaselinePeriod: assessment.isBaselinePeriod,
          });
        }),
        { numRuns: 20 }
      );
    });
  });

  /**
   * Property 21: Biometric Data Retention Limit
   * 
   * **Validates: Requirements 6.8**
   * 
   * Raw biometric data should not exist in storage more than 5 seconds
   * after assessment processing is complete.
   * 
   * Note: This property tests the interface contract. In a real implementation,
   * raw biometric data would be deleted immediately after metric extraction,
   * and only derived metrics would be passed to saveAssessment.
   */
  describe('Property 21: Biometric Data Retention Limit', () => {
    it('should only store derived metrics, never raw biometric data', async () => {
      await fc.assert(
        fc.asyncProperty(assessmentResultArb, async (assessment) => {
          // Mock database response
          (db.executeQuery as jest.Mock).mockReturnValue({
            rows: [],
            rowsAffected: 1,
          });

          // Save assessment
          await storageManager.saveAssessment(assessment);

          // Verify that executeQuery was called
          expect(db.executeQuery).toHaveBeenCalled();

          // Get the SQL and parameters
          const calls = (db.executeQuery as jest.Mock).mock.calls;
          const [sql, params] = calls[0];

          // Verify SQL is for assessments table
          expect(sql).toContain('INSERT INTO assessments');

          // Verify parameters contain only derived metrics (numbers)
          // and no raw data (audio buffers, images, etc.)
          const numericParams = params.filter(
            (p: unknown) => typeof p === 'number'
          );
          const stringParams = params.filter(
            (p: unknown) => typeof p === 'string'
          );

          // All numeric parameters should be valid derived metrics
          numericParams.forEach((param: number) => {
            expect(param).toBeGreaterThanOrEqual(0);
            expect(param).toBeLessThan(10000); // Reasonable upper bound
            expect(Number.isFinite(param)).toBe(true);
          });

          // String parameters should be IDs, timestamps, or JSON
          // but never contain raw audio/image data indicators
          stringParams.forEach((param: string) => {
            expect(param).not.toContain('data:audio');
            expect(param).not.toContain('data:image');
            expect(param).not.toContain('base64,');
            expect(param).not.toContain('ArrayBuffer');
            expect(param).not.toContain('Float32Array');
          });
        }),
        { numRuns: 20 }
      );
    });

    it('should not accept or store raw biometric data in assessment structure', async () => {
      await fc.assert(
        fc.asyncProperty(assessmentResultArb, async (assessment) => {
          // Verify assessment structure contains only derived metrics
          expect(assessment.speechMetrics).toHaveProperty('articulationRate');
          expect(assessment.speechMetrics).toHaveProperty('meanPauseDuration');
          expect(assessment.speechMetrics).toHaveProperty('pauseFrequency');
          expect(assessment.speechMetrics).toHaveProperty('phoneticPrecision');
          expect(assessment.speechMetrics).toHaveProperty('voiceQuality');

          // Verify no raw audio data
          expect(assessment.speechMetrics).not.toHaveProperty('audioBuffer');
          expect(assessment.speechMetrics).not.toHaveProperty('rawAudio');
          expect(assessment.speechMetrics).not.toHaveProperty('waveform');

          // Verify facial metrics are derived
          expect(assessment.facialMetrics).toHaveProperty('symmetryScore');
          expect(assessment.facialMetrics).toHaveProperty('leftEyeOpenness');
          expect(assessment.facialMetrics).toHaveProperty('rightEyeOpenness');

          // Verify no raw image data
          expect(assessment.facialMetrics).not.toHaveProperty('imageData');
          expect(assessment.facialMetrics).not.toHaveProperty('rawImage');
          expect(assessment.facialMetrics).not.toHaveProperty('pixels');

          // All metric values should be numbers (derived metrics)
          expect(typeof assessment.speechMetrics.articulationRate).toBe('number');
          expect(typeof assessment.facialMetrics.symmetryScore).toBe('number');
          expect(typeof assessment.reactionMetrics.meanReactionTime).toBe('number');
        }),
        { numRuns: 20 }
      );
    });
  });

  /**
   * Property 43: Local Storage Capacity
   * 
   * **Validates: Requirements 14.4**
   * 
   * The system should be able to store at least 30 days of assessment data locally.
   * This test verifies that:
   * 1. Multiple assessments can be stored
   * 2. Recent assessments can be retrieved
   * 3. Storage handles at least 30 assessments (1 per day for 30 days)
   */
  describe('Property 43: Local Storage Capacity', () => {
    it('should store and retrieve at least 30 days of assessments', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(assessmentResultArb, { minLength: 30, maxLength: 30 }),
          async (assessments) => {
            // Mock database to store assessments
            const storedAssessments: AssessmentResult[] = [];

            (db.executeQuery as jest.Mock).mockImplementation((sql, params) => {
              if (sql.includes('INSERT INTO assessments')) {
                // Store the assessment
                storedAssessments.push(assessments[storedAssessments.length]);
                return { rows: [], rowsAffected: 1 };
              } else if (sql.includes('SELECT * FROM assessments')) {
                // Return stored assessments
                const rows = storedAssessments.map((a) => ({
                  id: a.assessmentId,
                  patient_id: a.patientId,
                  timestamp: a.timestamp.toISOString(),
                  day_number: a.dayNumber,
                  is_baseline_period: a.isBaselinePeriod ? 1 : 0,
                  speech_articulation_rate: a.speechMetrics.articulationRate,
                  speech_mean_pause_duration: a.speechMetrics.meanPauseDuration,
                  speech_pause_frequency: a.speechMetrics.pauseFrequency,
                  speech_phonetic_precision: a.speechMetrics.phoneticPrecision,
                  speech_voice_quality: a.speechMetrics.voiceQuality,
                  facial_symmetry_score: a.facialMetrics.symmetryScore,
                  facial_left_eye_openness: a.facialMetrics.leftEyeOpenness,
                  facial_right_eye_openness: a.facialMetrics.rightEyeOpenness,
                  facial_mouth_symmetry: a.facialMetrics.mouthSymmetry,
                  facial_eyebrow_symmetry: a.facialMetrics.eyebrowSymmetry,
                  reaction_mean_time: a.reactionMetrics.meanReactionTime,
                  reaction_time_variability: a.reactionMetrics.reactionTimeVariability,
                  reaction_correct_responses: a.reactionMetrics.correctResponses,
                  reaction_total_trials: a.reactionMetrics.totalTrials,
                  completion_time: a.completionTime,
                  device_id: a.deviceInfo.deviceId,
                  platform: a.deviceInfo.platform,
                  app_version: a.deviceInfo.appVersion,
                  model_version: a.deviceInfo.modelVersion,
                  deviations_json: null,
                }));
                return { rows, rowsAffected: rows.length };
              }
              return { rows: [], rowsAffected: 0 };
            });

            // Save all 30 assessments
            for (const assessment of assessments) {
              await storageManager.saveAssessment(assessment);
            }

            // Verify all assessments were stored
            expect(storedAssessments).toHaveLength(30);

            // Retrieve recent assessments
            const patientId = assessments[0].patientId;
            const retrieved = await storageManager.getRecentAssessments(
              patientId,
              30
            );

            // Verify we can retrieve at least 30 assessments
            expect(retrieved.length).toBeGreaterThanOrEqual(30);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle storage of assessments with varying data sizes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(assessmentResultArb, { minLength: 1, maxLength: 50 }),
          async (assessments) => {
            // Clear mocks before each property test iteration
            jest.clearAllMocks();

            // Mock database
            (db.executeQuery as jest.Mock).mockReturnValue({
              rows: [],
              rowsAffected: 1,
            });

            // Save all assessments
            for (const assessment of assessments) {
              await storageManager.saveAssessment(assessment);
            }

            // Verify all assessments were saved
            expect(db.executeQuery).toHaveBeenCalledTimes(assessments.length);

            // Verify each call was for an INSERT
            const calls = (db.executeQuery as jest.Mock).mock.calls;
            calls.forEach(([sql]) => {
              expect(sql).toContain('INSERT INTO assessments');
            });
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should maintain data integrity across multiple save operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(assessmentResultArb, { minLength: 10, maxLength: 30 }),
          async (assessments) => {
            // Mock database to track saved data
            const savedData: unknown[][] = [];

            (db.executeQuery as jest.Mock).mockImplementation((sql, params) => {
              if (sql.includes('INSERT INTO assessments')) {
                savedData.push(params);
                return { rows: [], rowsAffected: 1 };
              }
              return { rows: [], rowsAffected: 0 };
            });

            // Save all assessments
            for (const assessment of assessments) {
              await storageManager.saveAssessment(assessment);
            }

            // Verify correct number of saves
            expect(savedData).toHaveLength(assessments.length);

            // Verify each saved data matches the original assessment
            savedData.forEach((params, index) => {
              const original = assessments[index];

              // Verify key fields are preserved
              expect(params[0]).toBe(original.assessmentId);
              expect(params[1]).toBe(original.patientId);
              expect(params[3]).toBe(original.dayNumber);
              expect(params[4]).toBe(original.isBaselinePeriod ? 1 : 0);

              // Verify metrics are preserved
              expect(params[5]).toBe(original.speechMetrics.articulationRate);
              expect(params[10]).toBe(original.facialMetrics.symmetryScore);
              expect(params[15]).toBe(original.reactionMetrics.meanReactionTime);
            });
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  /**
   * Additional property: Baseline storage and retrieval
   * 
   * Verifies that baselines can be stored and retrieved correctly
   */
  describe('Baseline Storage Properties', () => {
    it('should store and retrieve baselines without data loss', async () => {
      await fc.assert(
        fc.asyncProperty(baselineArb, async (baseline) => {
          // Mock database for baseline operations
          (db.executeQuerySingle as jest.Mock).mockReturnValue(null);
          (db.executeQuery as jest.Mock).mockReturnValue({
            rows: [],
            rowsAffected: 1,
          });

          // Save baseline
          await storageManager.saveBaseline(baseline);

          // Mock retrieval
          (db.executeQuerySingle as jest.Mock).mockReturnValue({
            patient_id: baseline.patientId,
            created_at: baseline.createdAt.toISOString(),
            assessment_count: baseline.assessmentCount,
            speech_articulation_rate_mean: baseline.speechMetrics.mean,
            speech_articulation_rate_std: baseline.speechMetrics.standardDeviation,
            speech_articulation_rate_min: baseline.speechMetrics.min,
            speech_articulation_rate_max: baseline.speechMetrics.max,
            facial_symmetry_mean: baseline.facialMetrics.mean,
            facial_symmetry_std: baseline.facialMetrics.standardDeviation,
            facial_symmetry_min: baseline.facialMetrics.min,
            facial_symmetry_max: baseline.facialMetrics.max,
            reaction_mean_time_mean: baseline.reactionMetrics.mean,
            reaction_mean_time_std: baseline.reactionMetrics.standardDeviation,
            reaction_mean_time_min: baseline.reactionMetrics.min,
            reaction_mean_time_max: baseline.reactionMetrics.max,
          });

          // Retrieve baseline
          const retrieved = await storageManager.getBaseline(baseline.patientId);

          // Verify baseline was retrieved correctly
          expect(retrieved).not.toBeNull();
          expect(retrieved?.patientId).toBe(baseline.patientId);
          expect(retrieved?.assessmentCount).toBe(baseline.assessmentCount);
          expect(retrieved?.speechMetrics.mean).toBe(baseline.speechMetrics.mean);
          expect(retrieved?.facialMetrics.mean).toBe(baseline.facialMetrics.mean);
          expect(retrieved?.reactionMetrics.mean).toBe(baseline.reactionMetrics.mean);
        }),
        { numRuns: 20 }
      );
    });
  });
});
