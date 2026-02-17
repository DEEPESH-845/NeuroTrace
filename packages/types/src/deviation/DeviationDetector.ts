/**
 * DeviationDetector — Core deviation detection algorithm
 *
 * Compares current assessment metrics against an established baseline,
 * identifies sustained deviations, analyzes trends across consecutive days,
 * and computes alert severity.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 *
 * Design rules (from design.md):
 * - Deviation threshold: > 2 standard deviations from baseline
 * - Sustained deviation: same metric deviating for ≥ 3 consecutive days
 * - Severity: LOW (1 modality), MEDIUM (2 modalities or > 3σ), HIGH (3 modalities or > 4σ)
 * - Single-day anomalies are filtered out (no alert)
 */

import { AssessmentResult } from '../models/assessment';
import { Baseline, MetricBaseline } from '../models/baseline';
import { Deviation, TrendAnalysis, AlertSeverity } from '../models/deviation';

// ─── Configuration ───────────────────────────────────────────────────────────

/** Thresholds for deviation detection */
export interface DeviationConfig {
  /** Number of standard deviations to trigger a deviation (default: 2) */
  deviationThreshold: number;
  /** Number of consecutive days required for a sustained deviation (default: 3) */
  sustainedDays: number;
  /** Threshold for MEDIUM severity (standard deviations, default: 3) */
  mediumSeverityThreshold: number;
  /** Threshold for HIGH severity (standard deviations, default: 4) */
  highSeverityThreshold: number;
}

export const DEFAULT_DEVIATION_CONFIG: DeviationConfig = {
  deviationThreshold: 2,
  sustainedDays: 3,
  mediumSeverityThreshold: 3,
  highSeverityThreshold: 4,
};

// ─── Modality Names ──────────────────────────────────────────────────────────

export const MODALITY_SPEECH = 'speech';
export const MODALITY_FACIAL = 'facial';
export const MODALITY_REACTION = 'reaction';

// ─── Metric Extraction ──────────────────────────────────────────────────────

/** Extracts the primary metric value for each modality from an assessment */
export function extractMetricValue(
  assessment: AssessmentResult,
  modality: string
): number {
  switch (modality) {
    case MODALITY_SPEECH:
      return assessment.speechMetrics.articulationRate;
    case MODALITY_FACIAL:
      return assessment.facialMetrics.symmetryScore;
    case MODALITY_REACTION:
      return assessment.reactionMetrics.meanReactionTime;
    default:
      throw new Error(`Unknown modality: ${modality}`);
  }
}

/** Extracts the baseline statistics for a modality */
export function extractBaselineMetric(
  baseline: Baseline,
  modality: string
): MetricBaseline {
  switch (modality) {
    case MODALITY_SPEECH:
      return baseline.speechMetrics;
    case MODALITY_FACIAL:
      return baseline.facialMetrics;
    case MODALITY_REACTION:
      return baseline.reactionMetrics;
    default:
      throw new Error(`Unknown modality: ${modality}`);
  }
}

// ─── Core Detection ─────────────────────────────────────────────────────────

/**
 * Computes the number of standard deviations a value is from the baseline mean.
 *
 * For metrics where lower is worse (speech articulationRate, facial symmetryScore),
 * a negative deviation (value below mean) indicates deterioration.
 * For metrics where higher is worse (reaction meanReactionTime),
 * a positive deviation (value above mean) indicates deterioration.
 *
 * Returns the absolute number of standard deviations.
 * Returns 0 if standard deviation is 0 and value equals mean.
 * Returns Infinity if standard deviation is 0 and value differs from mean.
 */
export function computeStandardDeviations(
  value: number,
  baseline: MetricBaseline
): number {
  if (baseline.standardDeviation === 0) {
    return value === baseline.mean ? 0 : Infinity;
  }
  return Math.abs(value - baseline.mean) / baseline.standardDeviation;
}

/**
 * Determines whether a metric value represents a clinically meaningful
 * deterioration from baseline.
 *
 * - Speech (articulationRate): deterioration = value DECREASES
 * - Facial (symmetryScore): deterioration = value DECREASES
 * - Reaction (meanReactionTime): deterioration = value INCREASES
 */
export function isDeteriorating(
  value: number,
  baseline: MetricBaseline,
  modality: string
): boolean {
  if (modality === MODALITY_REACTION) {
    // Higher reaction time = worse
    return value > baseline.mean;
  }
  // Lower articulation/symmetry = worse
  return value < baseline.mean;
}

/**
 * Detect deviations in a single assessment against a baseline.
 *
 * Returns an array of Deviation objects for metrics that exceed
 * the deviation threshold AND represent deterioration.
 *
 * @param assessment - Current assessment to evaluate
 * @param baseline - Established patient baseline
 * @param config - Detection configuration
 * @returns Array of detected deviations (may be empty)
 */
export function detectDeviations(
  assessment: AssessmentResult,
  baseline: Baseline,
  config: DeviationConfig = DEFAULT_DEVIATION_CONFIG
): Deviation[] {
  const modalities = [MODALITY_SPEECH, MODALITY_FACIAL, MODALITY_REACTION];
  const deviations: Deviation[] = [];

  for (const modality of modalities) {
    const currentValue = extractMetricValue(assessment, modality);
    const baselineMetric = extractBaselineMetric(baseline, modality);
    const numSD = computeStandardDeviations(currentValue, baselineMetric);

    // Only flag if it exceeds threshold AND represents deterioration
    if (
      numSD >= config.deviationThreshold &&
      isDeteriorating(currentValue, baselineMetric, modality)
    ) {
      deviations.push({
        metricName: modality,
        currentValue,
        baselineValue: baselineMetric.mean,
        standardDeviations: numSD,
        timestamp: assessment.timestamp,
      });
    }
  }

  return deviations;
}

// ─── Trend Analysis ─────────────────────────────────────────────────────────

/**
 * Analyzes a sequence of assessments (most recent N days) to identify
 * sustained deviation trends.
 *
 * A sustained deviation occurs when the same modality shows deviation
 * for `config.sustainedDays` or more consecutive days.
 *
 * @param assessments - Array of recent assessments, sorted by dayNumber ascending
 * @param baseline - Established patient baseline
 * @param config - Detection configuration
 * @returns TrendAnalysis if sustained deviations found, null otherwise
 */
export function analyzeTrends(
  assessments: AssessmentResult[],
  baseline: Baseline,
  config: DeviationConfig = DEFAULT_DEVIATION_CONFIG
): TrendAnalysis | null {
  if (assessments.length < config.sustainedDays) {
    return null;
  }

  // Sort by dayNumber ascending to ensure correct ordering
  const sorted = [...assessments].sort((a, b) => a.dayNumber - b.dayNumber);

  // For each modality, find consecutive runs of deviations
  const modalities = [MODALITY_SPEECH, MODALITY_FACIAL, MODALITY_REACTION];
  const sustainedDeviations: Deviation[] = [];
  const affectedModalities: Set<string> = new Set();

  for (const modality of modalities) {
    const consecutiveDeviations = findConsecutiveDeviations(
      sorted,
      baseline,
      modality,
      config
    );

    if (consecutiveDeviations.length >= config.sustainedDays) {
      sustainedDeviations.push(...consecutiveDeviations);
      affectedModalities.add(modality);
    }
  }

  if (sustainedDeviations.length === 0) {
    return null;
  }

  // Compute the maximum consecutive day count across all modalities
  const consecutiveDays = computeMaxConsecutiveDays(sorted, baseline, config);

  const severity = computeSeverity(
    sustainedDeviations,
    affectedModalities.size,
    config
  );

  return {
    sustainedDeviations,
    consecutiveDays,
    affectedModalities: Array.from(affectedModalities),
    severity,
  };
}

/**
 * Finds the longest run of consecutive day deviations for a single modality.
 *
 * "Consecutive" means dayNumber increments by 1 each time with no gaps.
 * Returns the deviations from the longest consecutive run if it meets threshold.
 */
export function findConsecutiveDeviations(
  sortedAssessments: AssessmentResult[],
  baseline: Baseline,
  modality: string,
  config: DeviationConfig = DEFAULT_DEVIATION_CONFIG
): Deviation[] {
  let currentRun: Deviation[] = [];
  let longestRun: Deviation[] = [];
  let previousDayNumber = -Infinity;

  for (const assessment of sortedAssessments) {
    const currentValue = extractMetricValue(assessment, modality);
    const baselineMetric = extractBaselineMetric(baseline, modality);
    const numSD = computeStandardDeviations(currentValue, baselineMetric);

    const isDeviation =
      numSD >= config.deviationThreshold &&
      isDeteriorating(currentValue, baselineMetric, modality);

    const isConsecutiveDay = assessment.dayNumber === previousDayNumber + 1;

    if (isDeviation && (isConsecutiveDay || currentRun.length === 0)) {
      currentRun.push({
        metricName: modality,
        currentValue,
        baselineValue: baselineMetric.mean,
        standardDeviations: numSD,
        timestamp: assessment.timestamp,
      });
    } else if (isDeviation) {
      // Deviation but not consecutive — start new run
      if (currentRun.length > longestRun.length) {
        longestRun = currentRun;
      }
      currentRun = [
        {
          metricName: modality,
          currentValue,
          baselineValue: baselineMetric.mean,
          standardDeviations: numSD,
          timestamp: assessment.timestamp,
        },
      ];
    } else {
      // No deviation — break the run
      if (currentRun.length > longestRun.length) {
        longestRun = currentRun;
      }
      currentRun = [];
    }

    previousDayNumber = assessment.dayNumber;
  }

  // Final check
  if (currentRun.length > longestRun.length) {
    longestRun = currentRun;
  }

  return longestRun;
}

/**
 * Computes the maximum number of consecutive days with ANY deviation
 * across all modalities.
 */
function computeMaxConsecutiveDays(
  sortedAssessments: AssessmentResult[],
  baseline: Baseline,
  config: DeviationConfig
): number {
  let maxConsecutive = 0;
  let currentConsecutive = 0;
  let previousDayNumber = -Infinity;

  for (const assessment of sortedAssessments) {
    const deviations = detectDeviations(assessment, baseline, config);
    const isConsecutiveDay = assessment.dayNumber === previousDayNumber + 1;

    if (deviations.length > 0 && (isConsecutiveDay || currentConsecutive === 0)) {
      currentConsecutive++;
    } else if (deviations.length > 0) {
      currentConsecutive = 1;
    } else {
      maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      currentConsecutive = 0;
    }

    previousDayNumber = assessment.dayNumber;
  }

  return Math.max(maxConsecutive, currentConsecutive);
}

// ─── Severity Computation ───────────────────────────────────────────────────

/**
 * Determines alert severity based on:
 * 1. Number of affected modalities
 * 2. Maximum standard deviation across all sustained deviations
 *
 * Rules:
 * - HIGH: 3 modalities affected OR any deviation > highSeverityThreshold (4σ)
 * - MEDIUM: 2 modalities affected OR any deviation > mediumSeverityThreshold (3σ)
 * - LOW: 1 modality affected with deviations at threshold level (2σ)
 */
export function computeSeverity(
  deviations: Deviation[],
  affectedModalityCount: number,
  config: DeviationConfig = DEFAULT_DEVIATION_CONFIG
): AlertSeverity {
  if (deviations.length === 0) {
    return AlertSeverity.LOW;
  }

  const maxSD = Math.max(...deviations.map((d) => d.standardDeviations));

  // HIGH: 3 modalities or extreme deviation
  if (affectedModalityCount >= 3 || maxSD >= config.highSeverityThreshold) {
    return AlertSeverity.HIGH;
  }

  // MEDIUM: 2 modalities or significant deviation
  if (affectedModalityCount >= 2 || maxSD >= config.mediumSeverityThreshold) {
    return AlertSeverity.MEDIUM;
  }

  // LOW: single modality with moderate deviation
  return AlertSeverity.LOW;
}

// ─── Convenience Function ───────────────────────────────────────────────────

/**
 * Full pipeline: detect deviations for a single assessment and optionally
 * perform trend analysis if historical assessments are available.
 *
 * @param currentAssessment - The latest assessment to evaluate
 * @param baseline - Established patient baseline
 * @param recentAssessments - Recent assessments (including current) sorted by dayNumber ascending
 * @param config - Detection configuration
 * @returns Object containing deviations and optional trend analysis
 */
export function analyzeAssessment(
  currentAssessment: AssessmentResult,
  baseline: Baseline,
  recentAssessments: AssessmentResult[],
  config: DeviationConfig = DEFAULT_DEVIATION_CONFIG
): { deviations: Deviation[]; trend: TrendAnalysis | null } {
  const deviations = detectDeviations(currentAssessment, baseline, config);
  const trend = analyzeTrends(recentAssessments, baseline, config);

  return { deviations, trend };
}
