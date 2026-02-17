/**
 * DeviationDetector Unit & Property Tests
 *
 * Covers:
 * - Single assessment deviation detection
 * - Deterioration direction per modality
 * - Trend analysis with consecutive days
 * - Severity computation rules
 * - Edge cases (zero SD, single assessments, non-consecutive days)
 */

import {
    detectDeviations,
    analyzeTrends,
    computeSeverity,
    computeStandardDeviations,
    isDeteriorating,
    analyzeAssessment,
    DeviationConfig,
    DEFAULT_DEVIATION_CONFIG,
    MODALITY_SPEECH,
    MODALITY_FACIAL,
    MODALITY_REACTION,
} from '../DeviationDetector';
import { AssessmentResult } from '../../models/assessment';
import { Baseline, MetricBaseline } from '../../models/baseline';
import { AlertSeverity } from '../../models/deviation';

// ─── Test Helpers ────────────────────────────────────────────────────────────

function makeBaseline(overrides?: Partial<Baseline>): Baseline {
    return {
        patientId: 'patient-1',
        createdAt: new Date('2025-01-01'),
        assessmentCount: 7,
        speechMetrics: { mean: 120, standardDeviation: 10, min: 100, max: 140 },
        facialMetrics: { mean: 0.85, standardDeviation: 0.05, min: 0.75, max: 0.95 },
        reactionMetrics: { mean: 300, standardDeviation: 30, min: 240, max: 360 },
        ...overrides,
    };
}

function makeAssessment(
    dayNumber: number,
    overrides?: {
        speechRate?: number;
        symmetry?: number;
        reactionTime?: number;
    }
): AssessmentResult {
    const baseDate = new Date('2025-01-10');
    const timestamp = new Date(baseDate);
    timestamp.setDate(baseDate.getDate() + dayNumber - 1);

    return {
        assessmentId: `assess-${dayNumber}`,
        patientId: 'patient-1',
        timestamp,
        dayNumber,
        isBaselinePeriod: false,
        speechMetrics: {
            articulationRate: overrides?.speechRate ?? 120,
            meanPauseDuration: 200,
            pauseFrequency: 5,
            phoneticPrecision: 0.8,
            voiceQuality: 0.9,
            timestamp,
        },
        facialMetrics: {
            symmetryScore: overrides?.symmetry ?? 0.85,
            leftEyeOpenness: 0.8,
            rightEyeOpenness: 0.8,
            mouthSymmetry: 0.85,
            eyebrowSymmetry: 0.9,
            timestamp,
        },
        reactionMetrics: {
            meanReactionTime: overrides?.reactionTime ?? 300,
            reactionTimeVariability: 30,
            correctResponses: 18,
            totalTrials: 20,
            timestamp,
        },
        completionTime: 180,
        deviceInfo: {
            deviceId: 'device-1',
            platform: 'ios',
            appVersion: '1.0.0',
            modelVersion: '1.0.0',
        },
    };
}

// ─── Tests: computeStandardDeviations ───────────────────────────────────────

describe('computeStandardDeviations', () => {
    const metric: MetricBaseline = { mean: 100, standardDeviation: 10, min: 80, max: 120 };

    it('returns 0 when value equals mean', () => {
        expect(computeStandardDeviations(100, metric)).toBe(0);
    });

    it('returns correct SD count for values above mean', () => {
        expect(computeStandardDeviations(120, metric)).toBe(2);
        expect(computeStandardDeviations(130, metric)).toBe(3);
    });

    it('returns correct SD count for values below mean', () => {
        expect(computeStandardDeviations(80, metric)).toBe(2);
        expect(computeStandardDeviations(70, metric)).toBe(3);
    });

    it('returns 0 when SD is 0 and value equals mean', () => {
        const zeroSD: MetricBaseline = { mean: 100, standardDeviation: 0, min: 100, max: 100 };
        expect(computeStandardDeviations(100, zeroSD)).toBe(0);
    });

    it('returns Infinity when SD is 0 and value differs from mean', () => {
        const zeroSD: MetricBaseline = { mean: 100, standardDeviation: 0, min: 100, max: 100 };
        expect(computeStandardDeviations(101, zeroSD)).toBe(Infinity);
    });
});

// ─── Tests: isDeteriorating ─────────────────────────────────────────────────

describe('isDeteriorating', () => {
    const metric: MetricBaseline = { mean: 100, standardDeviation: 10, min: 80, max: 120 };

    it('speech: lower = deteriorating', () => {
        expect(isDeteriorating(80, metric, MODALITY_SPEECH)).toBe(true);
        expect(isDeteriorating(120, metric, MODALITY_SPEECH)).toBe(false);
    });

    it('facial: lower = deteriorating', () => {
        expect(isDeteriorating(80, metric, MODALITY_FACIAL)).toBe(true);
        expect(isDeteriorating(120, metric, MODALITY_FACIAL)).toBe(false);
    });

    it('reaction: higher = deteriorating', () => {
        expect(isDeteriorating(120, metric, MODALITY_REACTION)).toBe(true);
        expect(isDeteriorating(80, metric, MODALITY_REACTION)).toBe(false);
    });
});

// ─── Tests: detectDeviations ────────────────────────────────────────────────

describe('detectDeviations', () => {
    const baseline = makeBaseline();

    it('returns empty array for normal assessment', () => {
        const assessment = makeAssessment(10);
        const deviations = detectDeviations(assessment, baseline);
        expect(deviations).toEqual([]);
    });

    it('detects speech deterioration (low articulationRate)', () => {
        // Baseline speech mean=120, SD=10 → 2SD below = 100
        const assessment = makeAssessment(10, { speechRate: 95 });
        const deviations = detectDeviations(assessment, baseline);
        expect(deviations).toHaveLength(1);
        expect(deviations[0].metricName).toBe(MODALITY_SPEECH);
        expect(deviations[0].standardDeviations).toBe(2.5);
    });

    it('does NOT flag speech improvement (high articulationRate)', () => {
        const assessment = makeAssessment(10, { speechRate: 150 });
        const deviations = detectDeviations(assessment, baseline);
        // High speech rate is improvement, not deterioration
        expect(deviations).toEqual([]);
    });

    it('detects facial deterioration (low symmetryScore)', () => {
        // Baseline facial mean=0.85, SD=0.05 → 2SD below = 0.75
        const assessment = makeAssessment(10, { symmetry: 0.70 });
        const deviations = detectDeviations(assessment, baseline);
        expect(deviations).toHaveLength(1);
        expect(deviations[0].metricName).toBe(MODALITY_FACIAL);
    });

    it('detects reaction deterioration (high reactionTime)', () => {
        // Baseline reaction mean=300, SD=30 → 2SD above = 360
        const assessment = makeAssessment(10, { reactionTime: 370 });
        const deviations = detectDeviations(assessment, baseline);
        expect(deviations).toHaveLength(1);
        expect(deviations[0].metricName).toBe(MODALITY_REACTION);
    });

    it('does NOT flag reaction improvement (low reactionTime)', () => {
        const assessment = makeAssessment(10, { reactionTime: 200 });
        const deviations = detectDeviations(assessment, baseline);
        expect(deviations).toEqual([]);
    });

    it('detects multiple modality deterioration', () => {
        const assessment = makeAssessment(10, {
            speechRate: 90,
            symmetry: 0.70,
            reactionTime: 400,
        });
        const deviations = detectDeviations(assessment, baseline);
        expect(deviations).toHaveLength(3);
        const names = deviations.map((d) => d.metricName).sort();
        expect(names).toEqual([MODALITY_FACIAL, MODALITY_REACTION, MODALITY_SPEECH]);
    });

    it('respects custom deviation threshold', () => {
        const config: DeviationConfig = { ...DEFAULT_DEVIATION_CONFIG, deviationThreshold: 3 };
        // 2.5 SD below = should NOT trigger at 3σ threshold
        const assessment = makeAssessment(10, { speechRate: 95 });
        const deviations = detectDeviations(assessment, baseline, config);
        expect(deviations).toEqual([]);
    });

    it('handles zero standard deviation baseline', () => {
        const zeroBaseline = makeBaseline({
            speechMetrics: { mean: 120, standardDeviation: 0, min: 120, max: 120 },
        });
        // Any deviation from exact mean triggers with Infinity SD
        const assessment = makeAssessment(10, { speechRate: 119 });
        const deviations = detectDeviations(assessment, zeroBaseline);
        expect(deviations).toHaveLength(1);
        expect(deviations[0].standardDeviations).toBe(Infinity);
    });
});

// ─── Tests: analyzeTrends ───────────────────────────────────────────────────

describe('analyzeTrends', () => {
    const baseline = makeBaseline();

    it('returns null when fewer than sustainedDays assessments provided', () => {
        const assessments = [makeAssessment(1, { speechRate: 90 })];
        const result = analyzeTrends(assessments, baseline);
        expect(result).toBeNull();
    });

    it('returns null when no sustained deviations found', () => {
        // All normal assessments
        const assessments = [
            makeAssessment(1),
            makeAssessment(2),
            makeAssessment(3),
        ];
        const result = analyzeTrends(assessments, baseline);
        expect(result).toBeNull();
    });

    it('detects 3-day sustained speech deviation', () => {
        const assessments = [
            makeAssessment(1, { speechRate: 90 }),
            makeAssessment(2, { speechRate: 85 }),
            makeAssessment(3, { speechRate: 88 }),
        ];
        const result = analyzeTrends(assessments, baseline);
        expect(result).not.toBeNull();
        expect(result!.affectedModalities).toContain(MODALITY_SPEECH);
        expect(result!.consecutiveDays).toBeGreaterThanOrEqual(3);
    });

    it('does NOT flag 2-day deviation (below threshold)', () => {
        const assessments = [
            makeAssessment(1, { speechRate: 90 }),
            makeAssessment(2, { speechRate: 85 }),
            makeAssessment(3), // normal day breaks the run
        ];
        const result = analyzeTrends(assessments, baseline);
        expect(result).toBeNull();
    });

    it('handles non-consecutive day numbers correctly', () => {
        // Days 1, 2, 5 — not 3 consecutive days despite 3 assessments with deviations
        const assessments = [
            makeAssessment(1, { speechRate: 90 }),
            makeAssessment(2, { speechRate: 85 }),
            makeAssessment(5, { speechRate: 88 }),
        ];
        const result = analyzeTrends(assessments, baseline);
        expect(result).toBeNull();
    });

    it('identifies multiple affected modalities', () => {
        const assessments = [
            makeAssessment(1, { speechRate: 90, symmetry: 0.70 }),
            makeAssessment(2, { speechRate: 85, symmetry: 0.68 }),
            makeAssessment(3, { speechRate: 88, symmetry: 0.72 }),
        ];
        const result = analyzeTrends(assessments, baseline);
        expect(result).not.toBeNull();
        expect(result!.affectedModalities).toContain(MODALITY_SPEECH);
        expect(result!.affectedModalities).toContain(MODALITY_FACIAL);
    });

    it('sets correct severity for multi-modality trends', () => {
        const assessments = [
            makeAssessment(1, { speechRate: 90, symmetry: 0.70, reactionTime: 400 }),
            makeAssessment(2, { speechRate: 85, symmetry: 0.68, reactionTime: 410 }),
            makeAssessment(3, { speechRate: 88, symmetry: 0.72, reactionTime: 395 }),
        ];
        const result = analyzeTrends(assessments, baseline);
        expect(result).not.toBeNull();
        expect(result!.severity).toBe(AlertSeverity.HIGH);
    });

    it('sorts assessments by dayNumber before analysis', () => {
        // Provide in reverse order — should still detect trend
        const assessments = [
            makeAssessment(3, { speechRate: 88 }),
            makeAssessment(1, { speechRate: 90 }),
            makeAssessment(2, { speechRate: 85 }),
        ];
        const result = analyzeTrends(assessments, baseline);
        expect(result).not.toBeNull();
        expect(result!.affectedModalities).toContain(MODALITY_SPEECH);
    });
});

// ─── Tests: computeSeverity ─────────────────────────────────────────────────

describe('computeSeverity', () => {
    it('returns LOW for 1 modality with moderate deviation', () => {
        const deviations = [
            {
                metricName: MODALITY_SPEECH,
                currentValue: 95,
                baselineValue: 120,
                standardDeviations: 2.5,
                timestamp: new Date(),
            },
        ];
        expect(computeSeverity(deviations, 1)).toBe(AlertSeverity.LOW);
    });

    it('returns MEDIUM for 2 affected modalities', () => {
        const deviations = [
            {
                metricName: MODALITY_SPEECH,
                currentValue: 95,
                baselineValue: 120,
                standardDeviations: 2.5,
                timestamp: new Date(),
            },
            {
                metricName: MODALITY_FACIAL,
                currentValue: 0.70,
                baselineValue: 0.85,
                standardDeviations: 3.0,
                timestamp: new Date(),
            },
        ];
        expect(computeSeverity(deviations, 2)).toBe(AlertSeverity.MEDIUM);
    });

    it('returns MEDIUM for > 3σ deviation in single modality', () => {
        const deviations = [
            {
                metricName: MODALITY_SPEECH,
                currentValue: 85,
                baselineValue: 120,
                standardDeviations: 3.5,
                timestamp: new Date(),
            },
        ];
        expect(computeSeverity(deviations, 1)).toBe(AlertSeverity.MEDIUM);
    });

    it('returns HIGH for 3 affected modalities', () => {
        const deviations = [
            { metricName: MODALITY_SPEECH, currentValue: 90, baselineValue: 120, standardDeviations: 3.0, timestamp: new Date() },
            { metricName: MODALITY_FACIAL, currentValue: 0.70, baselineValue: 0.85, standardDeviations: 3.0, timestamp: new Date() },
            { metricName: MODALITY_REACTION, currentValue: 400, baselineValue: 300, standardDeviations: 3.3, timestamp: new Date() },
        ];
        expect(computeSeverity(deviations, 3)).toBe(AlertSeverity.HIGH);
    });

    it('returns HIGH for > 4σ deviation even with 1 modality', () => {
        const deviations = [
            {
                metricName: MODALITY_SPEECH,
                currentValue: 70,
                baselineValue: 120,
                standardDeviations: 5.0,
                timestamp: new Date(),
            },
        ];
        expect(computeSeverity(deviations, 1)).toBe(AlertSeverity.HIGH);
    });

    it('returns LOW for empty deviations', () => {
        expect(computeSeverity([], 0)).toBe(AlertSeverity.LOW);
    });
});

// ─── Tests: analyzeAssessment (integration) ─────────────────────────────────

describe('analyzeAssessment', () => {
    const baseline = makeBaseline();

    it('returns deviations and null trend for single assessment', () => {
        const current = makeAssessment(1, { speechRate: 90 });
        const { deviations, trend } = analyzeAssessment(current, baseline, [current]);
        expect(deviations).toHaveLength(1);
        expect(trend).toBeNull();
    });

    it('returns deviations and trend for sustained deterioration', () => {
        const assessments = [
            makeAssessment(1, { speechRate: 90 }),
            makeAssessment(2, { speechRate: 85 }),
            makeAssessment(3, { speechRate: 88 }),
        ];
        const current = assessments[2];
        const { deviations, trend } = analyzeAssessment(current, baseline, assessments);
        expect(deviations).toHaveLength(1);
        expect(trend).not.toBeNull();
        expect(trend!.severity).toBe(AlertSeverity.MEDIUM);
    });

    it('returns empty deviations and null trend for normal assessment', () => {
        const assessments = [
            makeAssessment(1),
            makeAssessment(2),
            makeAssessment(3),
        ];
        const current = assessments[2];
        const { deviations, trend } = analyzeAssessment(current, baseline, assessments);
        expect(deviations).toEqual([]);
        expect(trend).toBeNull();
    });
});

// ─── Property-based Tests ───────────────────────────────────────────────────

describe('DeviationDetector properties', () => {
    const baseline = makeBaseline();

    it('PROPERTY: deviations are always flagged as deterioration direction', () => {
        for (let i = 0; i < 50; i++) {
            const speechRate = 50 + Math.random() * 100;
            const symmetry = Math.random();
            const reactionTime = 100 + Math.random() * 500;
            const assessment = makeAssessment(1, { speechRate, symmetry, reactionTime });
            const devs = detectDeviations(assessment, baseline);

            for (const dev of devs) {
                if (dev.metricName === MODALITY_SPEECH) {
                    expect(dev.currentValue).toBeLessThan(baseline.speechMetrics.mean);
                }
                if (dev.metricName === MODALITY_FACIAL) {
                    expect(dev.currentValue).toBeLessThan(baseline.facialMetrics.mean);
                }
                if (dev.metricName === MODALITY_REACTION) {
                    expect(dev.currentValue).toBeGreaterThan(baseline.reactionMetrics.mean);
                }
            }
        }
    });

    it('PROPERTY: standard deviations are always non-negative', () => {
        for (let i = 0; i < 50; i++) {
            const value = Math.random() * 200;
            const metric: MetricBaseline = {
                mean: 100,
                standardDeviation: 1 + Math.random() * 30,
                min: 70,
                max: 130,
            };
            expect(computeStandardDeviations(value, metric)).toBeGreaterThanOrEqual(0);
        }
    });

    it('PROPERTY: severity is monotonically non-decreasing with affected modalities', () => {
        const severityOrder = { LOW: 0, MEDIUM: 1, HIGH: 2 };
        const dev = {
            metricName: MODALITY_SPEECH,
            currentValue: 90,
            baselineValue: 120,
            standardDeviations: 2.5,
            timestamp: new Date(),
        };

        const severity1 = computeSeverity([dev], 1);
        const severity2 = computeSeverity([dev, dev], 2);
        const severity3 = computeSeverity([dev, dev, dev], 3);

        expect(severityOrder[severity1]).toBeLessThanOrEqual(severityOrder[severity2]);
        expect(severityOrder[severity2]).toBeLessThanOrEqual(severityOrder[severity3]);
    });

    it('PROPERTY: trend analysis requires minimum consecutive days', () => {
        // With varying numbers of assessments, trend should only be non-null
        // when there are enough consecutive deviating days
        for (let n = 1; n <= 5; n++) {
            const assessments: AssessmentResult[] = [];
            for (let d = 1; d <= n; d++) {
                assessments.push(makeAssessment(d, { speechRate: 90 }));
            }
            const result = analyzeTrends(assessments, baseline);
            if (n < DEFAULT_DEVIATION_CONFIG.sustainedDays) {
                expect(result).toBeNull();
            } else {
                expect(result).not.toBeNull();
            }
        }
    });
});
