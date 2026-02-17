/**
 * Accuracy Monitoring Service
 *
 * Tracks detection accuracy metrics (sensitivity, specificity, false positive rate)
 * and alerts when accuracy falls below configured thresholds.
 *
 * Requirements: 35.1, 35.2 — Accuracy monitoring and threshold alerts
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AlertOutcome {
    alertId: string;
    patientId: string;
    severity: string;
    /** Clinician's determination: true positive, false positive, or unreviewed */
    outcome: 'TRUE_POSITIVE' | 'FALSE_POSITIVE' | 'UNREVIEWED';
    /** If missed: a deterioration happened but no alert was generated */
    wasMissed?: boolean;
    reviewedBy?: string;
    reviewedAt?: Date;
}

export interface AccuracyMetrics {
    /** Proportion of actual deteriorations correctly detected */
    sensitivity: number;
    /** Proportion of non-deteriorations correctly identified */
    specificity: number;
    /** Proportion of alerts that were false positives */
    falsePositiveRate: number;
    /** Positive predictive value (precision) */
    ppv: number;
    /** Negative predictive value */
    npv: number;
    /** Total alerts reviewed */
    totalReviewed: number;
    /** Period covered */
    periodStart: Date;
    periodEnd: Date;
}

export interface AccuracyThresholds {
    minSensitivity: number;
    maxFalsePositiveRate: number;
    minSpecificity: number;
    minPPV: number;
}

export interface ThresholdAlert {
    id: string;
    metric: string;
    currentValue: number;
    threshold: number;
    direction: 'below' | 'above';
    message: string;
    createdAt: Date;
}

// ─── Configuration ──────────────────────────────────────────────────────────

const DEFAULT_THRESHOLDS: AccuracyThresholds = {
    /** Sensitivity must be >= 85% (catch most real deteriorations) */
    minSensitivity: 0.85,
    /** False positive rate must be <= 20% (avoid alert fatigue) */
    maxFalsePositiveRate: 0.20,
    /** Specificity must be >= 80% */
    minSpecificity: 0.80,
    /** Positive predictive value must be >= 75% */
    minPPV: 0.75,
};

// ─── State ──────────────────────────────────────────────────────────────────

const outcomes: AlertOutcome[] = [];
const thresholdAlerts: ThresholdAlert[] = [];
let alertIdCounter = 0;

// ─── Outcome Recording ─────────────────────────────────────────────────────

/**
 * Record the outcome of an alert after clinician review.
 */
export function recordAlertOutcome(outcome: AlertOutcome): void {
    outcomes.push({
        ...outcome,
        reviewedAt: outcome.reviewedAt || new Date(),
    });
}

/**
 * Record a missed detection (deterioration occurred but no alert was generated).
 */
export function recordMissedDetection(
    patientId: string,
    reviewedBy: string
): void {
    outcomes.push({
        alertId: `missed-${Date.now()}`,
        patientId,
        severity: 'UNKNOWN',
        outcome: 'TRUE_POSITIVE',
        wasMissed: true,
        reviewedBy,
        reviewedAt: new Date(),
    });
}

// ─── Accuracy Computation ───────────────────────────────────────────────────

/**
 * Compute accuracy metrics from recorded outcomes.
 *
 * Uses standard confusion matrix:
 *   - True Positive (TP): Alert generated AND clinician confirmed deterioration
 *   - False Positive (FP): Alert generated BUT clinician said no real deterioration
 *   - False Negative (FN): No alert BUT deterioration occurred (missed detection)
 *   - True Negative (TN): No alert AND no deterioration (estimated from total assessments)
 *
 * @param sinceDate - Only consider outcomes after this date
 * @param totalAssessments - Total assessments in the period (for TN estimation)
 */
export function computeAccuracyMetrics(
    sinceDate?: Date,
    totalAssessments?: number
): AccuracyMetrics {
    const cutoff = sinceDate || new Date(0);
    const relevantOutcomes = outcomes.filter(
        (o) => o.outcome !== 'UNREVIEWED' && (!o.reviewedAt || o.reviewedAt >= cutoff)
    );

    const tp = relevantOutcomes.filter(
        (o) => o.outcome === 'TRUE_POSITIVE' && !o.wasMissed
    ).length;

    const fp = relevantOutcomes.filter(
        (o) => o.outcome === 'FALSE_POSITIVE'
    ).length;

    const fn = relevantOutcomes.filter(
        (o) => o.wasMissed === true
    ).length;

    // Estimate TN: total assessments minus those with alerts or missed detections
    const totalAlertedOrMissed = tp + fp + fn;
    const tn = totalAssessments
        ? Math.max(0, totalAssessments - totalAlertedOrMissed)
        : 0;

    // Compute metrics (with safe division)
    const sensitivity = tp + fn > 0 ? tp / (tp + fn) : 1.0;
    const specificity = tn + fp > 0 ? tn / (tn + fp) : 1.0;
    const falsePositiveRate = tp + fp > 0 ? fp / (tp + fp) : 0.0;
    const ppv = tp + fp > 0 ? tp / (tp + fp) : 1.0;
    const npv = tn + fn > 0 ? tn / (tn + fn) : 1.0;

    return {
        sensitivity,
        specificity,
        falsePositiveRate,
        ppv,
        npv,
        totalReviewed: relevantOutcomes.length,
        periodStart: cutoff,
        periodEnd: new Date(),
    };
}

// ─── Threshold Monitoring ───────────────────────────────────────────────────

/**
 * Check accuracy metrics against thresholds and generate alerts if needed.
 */
export function checkThresholds(
    metrics: AccuracyMetrics,
    thresholds: AccuracyThresholds = DEFAULT_THRESHOLDS
): ThresholdAlert[] {
    const alerts: ThresholdAlert[] = [];

    if (metrics.sensitivity < thresholds.minSensitivity) {
        alerts.push(createThresholdAlert(
            'sensitivity',
            metrics.sensitivity,
            thresholds.minSensitivity,
            'below',
            `Sensitivity dropped to ${(metrics.sensitivity * 100).toFixed(1)}% ` +
            `(threshold: ${(thresholds.minSensitivity * 100).toFixed(1)}%). ` +
            `The system is missing real deteriorations.`
        ));
    }

    if (metrics.falsePositiveRate > thresholds.maxFalsePositiveRate) {
        alerts.push(createThresholdAlert(
            'falsePositiveRate',
            metrics.falsePositiveRate,
            thresholds.maxFalsePositiveRate,
            'above',
            `False positive rate rose to ${(metrics.falsePositiveRate * 100).toFixed(1)}% ` +
            `(threshold: ${(thresholds.maxFalsePositiveRate * 100).toFixed(1)}%). ` +
            `Alert fatigue risk is increasing.`
        ));
    }

    if (metrics.specificity < thresholds.minSpecificity) {
        alerts.push(createThresholdAlert(
            'specificity',
            metrics.specificity,
            thresholds.minSpecificity,
            'below',
            `Specificity dropped to ${(metrics.specificity * 100).toFixed(1)}% ` +
            `(threshold: ${(thresholds.minSpecificity * 100).toFixed(1)}%). ` +
            `Too many healthy patients are being flagged.`
        ));
    }

    if (metrics.ppv < thresholds.minPPV) {
        alerts.push(createThresholdAlert(
            'ppv',
            metrics.ppv,
            thresholds.minPPV,
            'below',
            `Positive predictive value dropped to ${(metrics.ppv * 100).toFixed(1)}% ` +
            `(threshold: ${(thresholds.minPPV * 100).toFixed(1)}%). ` +
            `Alerts are less likely to indicate real issues.`
        ));
    }

    thresholdAlerts.push(...alerts);
    return alerts;
}

function createThresholdAlert(
    metric: string,
    currentValue: number,
    threshold: number,
    direction: 'below' | 'above',
    message: string
): ThresholdAlert {
    return {
        id: `acc-${++alertIdCounter}`,
        metric,
        currentValue,
        threshold,
        direction,
        message,
        createdAt: new Date(),
    };
}

// ─── Queries ────────────────────────────────────────────────────────────────

/**
 * Get all recorded outcomes.
 */
export function getOutcomes(
    options?: { patientId?: string; outcome?: string; limit?: number }
): AlertOutcome[] {
    let filtered = [...outcomes];

    if (options?.patientId) {
        filtered = filtered.filter((o) => o.patientId === options.patientId);
    }
    if (options?.outcome) {
        filtered = filtered.filter((o) => o.outcome === options.outcome);
    }

    return filtered.slice(-(options?.limit || 100));
}

/**
 * Get accuracy trend over time (weekly buckets).
 */
export function getAccuracyTrend(
    weeks = 12,
    totalAssessmentsPerWeek = 100
): Array<{ weekStart: Date; metrics: AccuracyMetrics }> {
    const trend: Array<{ weekStart: Date; metrics: AccuracyMetrics }> = [];
    const now = new Date();

    for (let i = weeks - 1; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - i * 7);

        const metrics = computeAccuracyMetrics(weekStart, totalAssessmentsPerWeek);
        trend.push({ weekStart, metrics });
    }

    return trend;
}

/**
 * Get threshold alerts history.
 */
export function getThresholdAlerts(limit = 50): ThresholdAlert[] {
    return thresholdAlerts.slice(-limit);
}

/**
 * Reset all state (for testing only).
 */
export function _resetState(): void {
    outcomes.length = 0;
    thresholdAlerts.length = 0;
    alertIdCounter = 0;
}
