import { AssessmentResult } from '../models/assessment';
import { Baseline, MetricBaseline } from '../models/baseline';

/**
 * Computes a baseline from a sequence of assessments
 * Requirements: 1.3, 1.4, 1.6
 * 
 * @param assessments - Array of 5-7 assessments from the baseline period
 * @returns Baseline with statistical measures for all modalities
 * @throws Error if fewer than 5 assessments provided
 */
export function computeBaseline(assessments: AssessmentResult[]): Baseline {
  if (assessments.length < 5) {
    throw new Error('Baseline requires at least 5 assessments');
  }

  if (assessments.length === 0) {
    throw new Error('Cannot compute baseline from empty assessment array');
  }

  const patientId = assessments[0].patientId;

  // Extract speech metrics
  const speechValues = assessments.map(a => a.speechMetrics.articulationRate);
  const speechMetrics = computeMetricBaseline(speechValues);

  // Extract facial metrics (using symmetryScore as the primary metric)
  const facialValues = assessments.map(a => a.facialMetrics.symmetryScore);
  const facialMetrics = computeMetricBaseline(facialValues);

  // Extract reaction metrics
  const reactionValues = assessments.map(a => a.reactionMetrics.meanReactionTime);
  const reactionMetrics = computeMetricBaseline(reactionValues);

  return {
    patientId,
    createdAt: new Date(),
    assessmentCount: assessments.length,
    speechMetrics,
    facialMetrics,
    reactionMetrics,
  };
}

/**
 * Computes statistical measures for a single metric
 * 
 * @param values - Array of metric values
 * @returns MetricBaseline with mean, standard deviation, min, max
 */
function computeMetricBaseline(values: number[]): MetricBaseline {
  if (values.length === 0) {
    throw new Error('Cannot compute baseline from empty values array');
  }

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  
  // Check if all values are identical (within floating-point precision)
  // Use a relative epsilon that scales with the magnitude of the values
  const maxAbsValue = Math.max(...values.map(Math.abs));
  const epsilon = maxAbsValue * Number.EPSILON * 10; // Scale epsilon by magnitude
  const allIdentical = values.every(val => Math.abs(val - mean) <= epsilon);
  
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  // Handle floating-point precision: if all values are identical, set SD to exactly 0
  const standardDeviation = allIdentical ? 0 : Math.sqrt(variance);
  
  const min = Math.min(...values);
  const max = Math.max(...values);

  return {
    mean,
    standardDeviation,
    min,
    max,
  };
}

/**
 * Validates that a baseline has valid statistical measures
 * Requirements: 1.6
 * 
 * @param baseline - Baseline to validate
 * @returns true if baseline is valid, false otherwise
 */
export function validateBaselineQuality(baseline: Baseline): boolean {
  // Check that all metrics exist
  if (!baseline.speechMetrics || !baseline.facialMetrics || !baseline.reactionMetrics) {
    return false;
  }

  // Check that assessment count is at least 5
  if (baseline.assessmentCount < 5) {
    return false;
  }

  // Validate each metric baseline
  return (
    isValidMetricBaseline(baseline.speechMetrics) &&
    isValidMetricBaseline(baseline.facialMetrics) &&
    isValidMetricBaseline(baseline.reactionMetrics)
  );
}

/**
 * Validates that a metric baseline has valid statistical measures
 */
function isValidMetricBaseline(metric: MetricBaseline): boolean {
  // Check that all values are numbers
  if (
    typeof metric.mean !== 'number' ||
    typeof metric.standardDeviation !== 'number' ||
    typeof metric.min !== 'number' ||
    typeof metric.max !== 'number'
  ) {
    return false;
  }

  // Check that values are not NaN or Infinity
  if (
    !isFinite(metric.mean) ||
    !isFinite(metric.standardDeviation) ||
    !isFinite(metric.min) ||
    !isFinite(metric.max)
  ) {
    return false;
  }

  // Check that standard deviation is non-negative
  if (metric.standardDeviation < 0) {
    return false;
  }

  // Check that min <= mean <= max
  if (metric.min > metric.mean || metric.mean > metric.max) {
    return false;
  }

  return true;
}
