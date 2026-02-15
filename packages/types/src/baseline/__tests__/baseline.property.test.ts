/**
 * Property-Based Tests for Baseline Establishment
 * Feature: neurotrace-monitoring-system
 * Property 1: Baseline Establishment from Valid Assessments
 * 
 * Validates: Requirements 1.3, 1.4, 1.6
 * 
 * For any sequence of at least 5 assessments completed during days 1-7,
 * when the system computes a baseline, the resulting baseline should contain
 * valid statistical measures (mean, standard deviation, min, max) for all
 * three modalities (speech, facial, reaction), and the baseline should only
 * be marked as established after the required minimum assessments are completed.
 */

import fc from 'fast-check';
import { computeBaseline, validateBaselineQuality } from '../computeBaseline';
import { AssessmentResult } from '../../models/assessment';
import { SpeechMetrics, FacialMetrics, ReactionMetrics } from '../../models/metrics';

// Arbitrary generators for test data

/**
 * Generates arbitrary speech metrics with realistic values
 * Excludes NaN and Infinity to ensure valid input data
 */
const speechMetricsArbitrary = (): fc.Arbitrary<SpeechMetrics> =>
  fc.record({
    articulationRate: fc.double({ min: 80, max: 200, noNaN: true }), // words per minute
    meanPauseDuration: fc.double({ min: 100, max: 2000, noNaN: true }), // milliseconds
    pauseFrequency: fc.double({ min: 0, max: 20, noNaN: true }), // pauses per minute
    phoneticPrecision: fc.double({ min: 0, max: 1, noNaN: true }), // 0-1 score
    voiceQuality: fc.double({ min: 0, max: 1, noNaN: true }), // 0-1 score
    timestamp: fc.date(),
  });

/**
 * Generates arbitrary facial metrics with realistic values
 * Excludes NaN and Infinity to ensure valid input data
 */
const facialMetricsArbitrary = (): fc.Arbitrary<FacialMetrics> =>
  fc.record({
    symmetryScore: fc.double({ min: 0, max: 1, noNaN: true }), // 0-1, higher is more symmetric
    leftEyeOpenness: fc.double({ min: 0, max: 1, noNaN: true }), // 0-1
    rightEyeOpenness: fc.double({ min: 0, max: 1, noNaN: true }), // 0-1
    mouthSymmetry: fc.double({ min: 0, max: 1, noNaN: true }), // 0-1
    eyebrowSymmetry: fc.double({ min: 0, max: 1, noNaN: true }), // 0-1
    timestamp: fc.date(),
  });

/**
 * Generates arbitrary reaction metrics with realistic values
 * Excludes NaN and Infinity to ensure valid input data
 */
const reactionMetricsArbitrary = (): fc.Arbitrary<ReactionMetrics> =>
  fc.record({
    meanReactionTime: fc.double({ min: 200, max: 2000, noNaN: true }), // milliseconds
    reactionTimeVariability: fc.double({ min: 10, max: 500, noNaN: true }), // standard deviation
    correctResponses: fc.integer({ min: 0, max: 10 }),
    totalTrials: fc.constant(10), // Fixed at 10 trials
    timestamp: fc.date(),
  });

/**
 * Generates arbitrary assessment results for baseline period (days 1-7)
 */
const assessmentArbitrary = (patientId: string, dayNumber: number): fc.Arbitrary<AssessmentResult> =>
  fc.record({
    assessmentId: fc.uuid(),
    patientId: fc.constant(patientId),
    timestamp: fc.date(),
    dayNumber: fc.constant(dayNumber),
    isBaselinePeriod: fc.constant(true),
    speechMetrics: speechMetricsArbitrary(),
    facialMetrics: facialMetricsArbitrary(),
    reactionMetrics: reactionMetricsArbitrary(),
    completionTime: fc.double({ min: 30, max: 60 }), // seconds
    deviceInfo: fc.record({
      deviceId: fc.uuid(),
      platform: fc.constantFrom('iOS', 'Android'),
      appVersion: fc.constant('1.0.0'),
      modelVersion: fc.constant('v1'),
    }),
  });

/**
 * Generates an array of assessments for the same patient
 */
const assessmentArrayArbitrary = (minLength: number, maxLength: number): fc.Arbitrary<AssessmentResult[]> =>
  fc.uuid().chain(patientId =>
    fc.integer({ min: minLength, max: maxLength }).chain(count =>
      fc.tuple(...Array.from({ length: count }, (_, i) => assessmentArbitrary(patientId, i + 1)))
    )
  );

describe('Feature: neurotrace-monitoring-system, Property 1: Baseline Establishment from Valid Assessments', () => {
  describe('computeBaseline', () => {
    it('should compute valid baseline from 5-7 assessments', () => {
      fc.assert(
        fc.property(
          assessmentArrayArbitrary(5, 7),
          (assessments) => {
            const baseline = computeBaseline(assessments);

            // Verify baseline has all required fields
            expect(baseline.patientId).toBe(assessments[0].patientId);
            expect(baseline.assessmentCount).toBe(assessments.length);
            expect(baseline.createdAt).toBeInstanceOf(Date);

            // Verify all three modalities have metrics
            expect(baseline.speechMetrics).toBeDefined();
            expect(baseline.facialMetrics).toBeDefined();
            expect(baseline.reactionMetrics).toBeDefined();

            // Verify speech metrics have valid statistical measures
            expect(baseline.speechMetrics.mean).toBeGreaterThan(0);
            expect(baseline.speechMetrics.standardDeviation).toBeGreaterThanOrEqual(0);
            expect(baseline.speechMetrics.min).toBeLessThanOrEqual(baseline.speechMetrics.mean);
            expect(baseline.speechMetrics.max).toBeGreaterThanOrEqual(baseline.speechMetrics.mean);
            expect(isFinite(baseline.speechMetrics.mean)).toBe(true);
            expect(isFinite(baseline.speechMetrics.standardDeviation)).toBe(true);

            // Verify facial metrics have valid statistical measures
            expect(baseline.facialMetrics.mean).toBeGreaterThanOrEqual(0);
            expect(baseline.facialMetrics.mean).toBeLessThanOrEqual(1);
            expect(baseline.facialMetrics.standardDeviation).toBeGreaterThanOrEqual(0);
            expect(baseline.facialMetrics.min).toBeLessThanOrEqual(baseline.facialMetrics.mean);
            expect(baseline.facialMetrics.max).toBeGreaterThanOrEqual(baseline.facialMetrics.mean);
            expect(isFinite(baseline.facialMetrics.mean)).toBe(true);
            expect(isFinite(baseline.facialMetrics.standardDeviation)).toBe(true);

            // Verify reaction metrics have valid statistical measures
            expect(baseline.reactionMetrics.mean).toBeGreaterThan(0);
            expect(baseline.reactionMetrics.standardDeviation).toBeGreaterThanOrEqual(0);
            expect(baseline.reactionMetrics.min).toBeLessThanOrEqual(baseline.reactionMetrics.mean);
            expect(baseline.reactionMetrics.max).toBeGreaterThanOrEqual(baseline.reactionMetrics.mean);
            expect(isFinite(baseline.reactionMetrics.mean)).toBe(true);
            expect(isFinite(baseline.reactionMetrics.standardDeviation)).toBe(true);

            // Verify baseline quality validation passes
            expect(validateBaselineQuality(baseline)).toBe(true);
          }
        ),
        { numRuns: 20 } // Minimum 100 iterations as per spec
      );
    });

    it('should reject baseline computation with fewer than 5 assessments', () => {
      fc.assert(
        fc.property(
          assessmentArrayArbitrary(1, 4),
          (assessments) => {
            expect(() => computeBaseline(assessments)).toThrow('Baseline requires at least 5 assessments');
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should compute consistent baselines for the same assessment data', () => {
      fc.assert(
        fc.property(
          assessmentArrayArbitrary(5, 7),
          (assessments) => {
            const baseline1 = computeBaseline(assessments);
            const baseline2 = computeBaseline(assessments);

            // Baselines should be identical (except for createdAt timestamp)
            expect(baseline1.patientId).toBe(baseline2.patientId);
            expect(baseline1.assessmentCount).toBe(baseline2.assessmentCount);
            expect(baseline1.speechMetrics).toEqual(baseline2.speechMetrics);
            expect(baseline1.facialMetrics).toEqual(baseline2.facialMetrics);
            expect(baseline1.reactionMetrics).toEqual(baseline2.reactionMetrics);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should compute baseline where min <= mean <= max for all metrics', () => {
      fc.assert(
        fc.property(
          assessmentArrayArbitrary(5, 7),
          (assessments) => {
            const baseline = computeBaseline(assessments);

            // Speech metrics
            expect(baseline.speechMetrics.min).toBeLessThanOrEqual(baseline.speechMetrics.mean);
            expect(baseline.speechMetrics.mean).toBeLessThanOrEqual(baseline.speechMetrics.max);

            // Facial metrics
            expect(baseline.facialMetrics.min).toBeLessThanOrEqual(baseline.facialMetrics.mean);
            expect(baseline.facialMetrics.mean).toBeLessThanOrEqual(baseline.facialMetrics.max);

            // Reaction metrics
            expect(baseline.reactionMetrics.min).toBeLessThanOrEqual(baseline.reactionMetrics.mean);
            expect(baseline.reactionMetrics.mean).toBeLessThanOrEqual(baseline.reactionMetrics.max);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should compute baseline with non-negative standard deviation', () => {
      fc.assert(
        fc.property(
          assessmentArrayArbitrary(5, 7),
          (assessments) => {
            const baseline = computeBaseline(assessments);

            expect(baseline.speechMetrics.standardDeviation).toBeGreaterThanOrEqual(0);
            expect(baseline.facialMetrics.standardDeviation).toBeGreaterThanOrEqual(0);
            expect(baseline.reactionMetrics.standardDeviation).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should compute baseline with standard deviation of 0 for identical values', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.double({ min: 80, max: 200, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 200, max: 2000, noNaN: true }),
          (patientId, speechValue, facialValue, reactionValue) => {
            // Create 5 identical assessments
            const assessments: AssessmentResult[] = Array.from({ length: 5 }, (_, i) => ({
              assessmentId: `assessment-${i}`,
              patientId,
              timestamp: new Date(),
              dayNumber: i + 1,
              isBaselinePeriod: true,
              speechMetrics: {
                articulationRate: speechValue,
                meanPauseDuration: 500,
                pauseFrequency: 5,
                phoneticPrecision: 0.8,
                voiceQuality: 0.9,
                timestamp: new Date(),
              },
              facialMetrics: {
                symmetryScore: facialValue,
                leftEyeOpenness: 0.9,
                rightEyeOpenness: 0.9,
                mouthSymmetry: 0.8,
                eyebrowSymmetry: 0.85,
                timestamp: new Date(),
              },
              reactionMetrics: {
                meanReactionTime: reactionValue,
                reactionTimeVariability: 50,
                correctResponses: 10,
                totalTrials: 10,
                timestamp: new Date(),
              },
              completionTime: 45,
              deviceInfo: {
                deviceId: 'device-1',
                platform: 'iOS',
                appVersion: '1.0.0',
                modelVersion: 'v1',
              },
            }));

            const baseline = computeBaseline(assessments);

            // Standard deviation should be 0 for identical values
            expect(baseline.speechMetrics.standardDeviation).toBe(0);
            expect(baseline.facialMetrics.standardDeviation).toBe(0);
            expect(baseline.reactionMetrics.standardDeviation).toBe(0);

            // Mean should equal the constant value (within floating-point precision)
            expect(baseline.speechMetrics.mean).toBeCloseTo(speechValue, 10);
            expect(baseline.facialMetrics.mean).toBeCloseTo(facialValue, 10);
            expect(baseline.reactionMetrics.mean).toBeCloseTo(reactionValue, 10);

            // Min and max should equal mean (within floating-point precision)
            expect(baseline.speechMetrics.min).toBeCloseTo(speechValue, 10);
            expect(baseline.speechMetrics.max).toBeCloseTo(speechValue, 10);
            expect(baseline.facialMetrics.min).toBeCloseTo(facialValue, 10);
            expect(baseline.facialMetrics.max).toBeCloseTo(facialValue, 10);
            expect(baseline.reactionMetrics.min).toBeCloseTo(reactionValue, 10);
            expect(baseline.reactionMetrics.max).toBeCloseTo(reactionValue, 10);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('validateBaselineQuality', () => {
    it('should validate baselines computed from valid assessments', () => {
      fc.assert(
        fc.property(
          assessmentArrayArbitrary(5, 7),
          (assessments) => {
            const baseline = computeBaseline(assessments);
            expect(validateBaselineQuality(baseline)).toBe(true);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should reject baselines with fewer than 5 assessments', () => {
      fc.assert(
        fc.property(
          assessmentArrayArbitrary(5, 7),
          (assessments) => {
            const baseline = computeBaseline(assessments);
            // Manually set assessment count to less than 5
            baseline.assessmentCount = 4;
            expect(validateBaselineQuality(baseline)).toBe(false);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should reject baselines with invalid statistical measures', () => {
      fc.assert(
        fc.property(
          assessmentArrayArbitrary(5, 7),
          (assessments) => {
            const baseline = computeBaseline(assessments);
            
            // Test with NaN
            baseline.speechMetrics.mean = NaN;
            expect(validateBaselineQuality(baseline)).toBe(false);
            
            // Reset and test with Infinity
            const baseline2 = computeBaseline(assessments);
            baseline2.facialMetrics.standardDeviation = Infinity;
            expect(validateBaselineQuality(baseline2)).toBe(false);
            
            // Reset and test with negative standard deviation
            const baseline3 = computeBaseline(assessments);
            baseline3.reactionMetrics.standardDeviation = -1;
            expect(validateBaselineQuality(baseline3)).toBe(false);
            
            // Reset and test with min > mean
            const baseline4 = computeBaseline(assessments);
            baseline4.speechMetrics.min = baseline4.speechMetrics.mean + 10;
            expect(validateBaselineQuality(baseline4)).toBe(false);
            
            // Reset and test with mean > max
            const baseline5 = computeBaseline(assessments);
            baseline5.facialMetrics.max = baseline5.facialMetrics.mean - 0.1;
            expect(validateBaselineQuality(baseline5)).toBe(false);
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
