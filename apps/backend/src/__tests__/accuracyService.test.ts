/**
 * Accuracy Service Tests
 *
 * Tests accuracy metrics computation and threshold alerting.
 */

import {
    recordAlertOutcome,
    recordMissedDetection,
    computeAccuracyMetrics,
    checkThresholds,
    getOutcomes,
    _resetState,
} from '../services/accuracyService';

beforeEach(() => {
    _resetState();
});

describe('recordAlertOutcome', () => {
    it('records an outcome', () => {
        recordAlertOutcome({
            alertId: 'alert-1',
            patientId: 'p1',
            severity: 'HIGH',
            outcome: 'TRUE_POSITIVE',
            reviewedBy: 'clinician-1',
        });

        const outcomes = getOutcomes();
        expect(outcomes).toHaveLength(1);
        expect(outcomes[0].alertId).toBe('alert-1');
        expect(outcomes[0].outcome).toBe('TRUE_POSITIVE');
    });
});

describe('recordMissedDetection', () => {
    it('records a missed detection as a special outcome', () => {
        recordMissedDetection('p1', 'clinician-1');

        const outcomes = getOutcomes();
        expect(outcomes).toHaveLength(1);
        expect(outcomes[0].wasMissed).toBe(true);
        expect(outcomes[0].outcome).toBe('TRUE_POSITIVE');
    });
});

describe('computeAccuracyMetrics', () => {
    it('returns perfect metrics when all alerts are true positives', () => {
        for (let i = 0; i < 10; i++) {
            recordAlertOutcome({
                alertId: `alert-${i}`,
                patientId: `p${i}`,
                severity: 'MEDIUM',
                outcome: 'TRUE_POSITIVE',
            });
        }

        const metrics = computeAccuracyMetrics(undefined, 100);
        expect(metrics.sensitivity).toBe(1.0);
        expect(metrics.falsePositiveRate).toBe(0.0);
        expect(metrics.ppv).toBe(1.0);
        expect(metrics.totalReviewed).toBe(10);
    });

    it('computes correct sensitivity with missed detections', () => {
        // 8 true positives, 2 missed
        for (let i = 0; i < 8; i++) {
            recordAlertOutcome({
                alertId: `alert-${i}`,
                patientId: `p${i}`,
                severity: 'MEDIUM',
                outcome: 'TRUE_POSITIVE',
            });
        }
        recordMissedDetection('p8', 'c1');
        recordMissedDetection('p9', 'c1');

        const metrics = computeAccuracyMetrics(undefined, 100);
        // sensitivity = TP / (TP + FN) = 8 / (8 + 2) = 0.8
        expect(metrics.sensitivity).toBe(0.8);
    });

    it('computes correct false positive rate', () => {
        // 6 true positives, 4 false positives
        for (let i = 0; i < 6; i++) {
            recordAlertOutcome({
                alertId: `tp-${i}`,
                patientId: `p${i}`,
                severity: 'MEDIUM',
                outcome: 'TRUE_POSITIVE',
            });
        }
        for (let i = 0; i < 4; i++) {
            recordAlertOutcome({
                alertId: `fp-${i}`,
                patientId: `p${i + 6}`,
                severity: 'LOW',
                outcome: 'FALSE_POSITIVE',
            });
        }

        const metrics = computeAccuracyMetrics(undefined, 100);
        // FPR in this context = FP / (TP + FP) = 4 / 10 = 0.4
        expect(metrics.falsePositiveRate).toBe(0.4);
        // PPV = TP / (TP + FP) = 6 / 10 = 0.6
        expect(metrics.ppv).toBe(0.6);
    });

    it('excludes UNREVIEWED outcomes', () => {
        recordAlertOutcome({
            alertId: 'alert-1',
            patientId: 'p1',
            severity: 'LOW',
            outcome: 'UNREVIEWED',
        });

        const metrics = computeAccuracyMetrics();
        expect(metrics.totalReviewed).toBe(0);
    });

    it('returns defaults when no data', () => {
        const metrics = computeAccuracyMetrics();
        expect(metrics.sensitivity).toBe(1.0);
        expect(metrics.falsePositiveRate).toBe(0.0);
        expect(metrics.totalReviewed).toBe(0);
    });
});

describe('checkThresholds', () => {
    it('generates alert when sensitivity drops below threshold', () => {
        // 7 TP, 3 missed → sensitivity = 0.7
        for (let i = 0; i < 7; i++) {
            recordAlertOutcome({
                alertId: `tp-${i}`,
                patientId: `p${i}`,
                severity: 'MEDIUM',
                outcome: 'TRUE_POSITIVE',
            });
        }
        for (let i = 0; i < 3; i++) {
            recordMissedDetection(`p${i + 7}`, 'c1');
        }

        const metrics = computeAccuracyMetrics(undefined, 100);
        const alerts = checkThresholds(metrics);

        expect(alerts.some((a) => a.metric === 'sensitivity')).toBe(true);
        expect(alerts.find((a) => a.metric === 'sensitivity')!.direction).toBe('below');
    });

    it('generates alert when false positive rate exceeds threshold', () => {
        // 5 TP, 5 FP → FPR = 0.5
        for (let i = 0; i < 5; i++) {
            recordAlertOutcome({
                alertId: `tp-${i}`,
                patientId: `p${i}`,
                severity: 'MEDIUM',
                outcome: 'TRUE_POSITIVE',
            });
        }
        for (let i = 0; i < 5; i++) {
            recordAlertOutcome({
                alertId: `fp-${i}`,
                patientId: `p${i + 5}`,
                severity: 'LOW',
                outcome: 'FALSE_POSITIVE',
            });
        }

        const metrics = computeAccuracyMetrics(undefined, 100);
        const alerts = checkThresholds(metrics);

        expect(alerts.some((a) => a.metric === 'falsePositiveRate')).toBe(true);
        expect(alerts.find((a) => a.metric === 'falsePositiveRate')!.direction).toBe('above');
    });

    it('returns no alerts when all metrics are within bounds', () => {
        for (let i = 0; i < 20; i++) {
            recordAlertOutcome({
                alertId: `tp-${i}`,
                patientId: `p${i}`,
                severity: 'MEDIUM',
                outcome: 'TRUE_POSITIVE',
            });
        }

        const metrics = computeAccuracyMetrics(undefined, 200);
        const alerts = checkThresholds(metrics);

        expect(alerts).toHaveLength(0);
    });

    it('supports custom thresholds', () => {
        for (let i = 0; i < 10; i++) {
            recordAlertOutcome({
                alertId: `tp-${i}`,
                patientId: `p${i}`,
                severity: 'MEDIUM',
                outcome: 'TRUE_POSITIVE',
            });
        }

        const metrics = computeAccuracyMetrics(undefined, 100);

        // With very strict thresholds
        const alerts = checkThresholds(metrics, {
            minSensitivity: 0.99,
            maxFalsePositiveRate: 0.01,
            minSpecificity: 0.99,
            minPPV: 0.99,
        });

        // Should still pass since all are TP
        expect(alerts).toHaveLength(0);
    });
});

describe('getOutcomes', () => {
    it('filters by patientId', () => {
        recordAlertOutcome({ alertId: 'a1', patientId: 'p1', severity: 'LOW', outcome: 'TRUE_POSITIVE' });
        recordAlertOutcome({ alertId: 'a2', patientId: 'p2', severity: 'LOW', outcome: 'FALSE_POSITIVE' });

        const p1Outcomes = getOutcomes({ patientId: 'p1' });
        expect(p1Outcomes).toHaveLength(1);
        expect(p1Outcomes[0].patientId).toBe('p1');
    });

    it('filters by outcome type', () => {
        recordAlertOutcome({ alertId: 'a1', patientId: 'p1', severity: 'LOW', outcome: 'TRUE_POSITIVE' });
        recordAlertOutcome({ alertId: 'a2', patientId: 'p2', severity: 'LOW', outcome: 'FALSE_POSITIVE' });

        const fpOutcomes = getOutcomes({ outcome: 'FALSE_POSITIVE' });
        expect(fpOutcomes).toHaveLength(1);
        expect(fpOutcomes[0].outcome).toBe('FALSE_POSITIVE');
    });
});
