/**
 * BaselineManager — Mobile integration for baseline computation
 *
 * Bridges the packages/types computeBaseline function with the mobile
 * local storage layer. Manages the baseline lifecycle:
 *   1. Collects assessments during baseline period (days 1-7)
 *   2. Computes baseline using package function when 5+ assessments ready
 *   3. Persists baseline to local storage
 *   4. Exposes baseline status for UI and deviation detection
 *
 * Requirements: 1.3, 1.4, 1.6, 10.1
 */

import { computeBaseline, validateBaselineQuality } from '@neurotrace/types';
import { AssessmentResult, Baseline } from '@neurotrace/types';
import { localStorageManager } from '../database/LocalStorageManager';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BaselineStatus {
    /** Whether the baseline period is complete */
    isComplete: boolean;
    /** Number of assessments collected so far */
    assessmentCount: number;
    /** Minimum assessments needed */
    requiredCount: number;
    /** Days remaining in baseline period */
    daysRemaining: number;
    /** Quality validation result (null if not computed yet) */
    qualityValid: boolean | null;
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** Minimum assessments required for baseline computation */
const MIN_BASELINE_ASSESSMENTS = 5;

/** Maximum baseline period in days */
const BASELINE_PERIOD_DAYS = 7;

// ─── BaselineManager ────────────────────────────────────────────────────────

/**
 * Manages baseline computation on the mobile device.
 */
export class BaselineManager {
    /**
     * Check if a patient has completed their baseline period.
     */
    async getBaselineStatus(patientId: string): Promise<BaselineStatus> {
        // Check if baseline already exists
        const existing = await localStorageManager.getBaseline(patientId);
        if (existing) {
            return {
                isComplete: true,
                assessmentCount: existing.assessmentCount,
                requiredCount: MIN_BASELINE_ASSESSMENTS,
                daysRemaining: 0,
                qualityValid: validateBaselineQuality(existing),
            };
        }

        // Get baseline-period assessments
        const assessments = await localStorageManager.getRecentAssessments(
            patientId,
            BASELINE_PERIOD_DAYS
        );
        const baselineAssessments = assessments.filter((a) => a.isBaselinePeriod);
        const dayNumber = assessments.length + 1;

        return {
            isComplete: false,
            assessmentCount: baselineAssessments.length,
            requiredCount: MIN_BASELINE_ASSESSMENTS,
            daysRemaining: Math.max(0, BASELINE_PERIOD_DAYS - dayNumber + 1),
            qualityValid: null,
        };
    }

    /**
     * Attempt to compute and save a baseline after an assessment completes.
     *
     * Called by the AssessmentOrchestrator after each assessment during the baseline period.
     * Only computes if we have enough assessments and no baseline exists yet.
     *
     * @returns The computed baseline, or null if not enough data
     */
    async tryComputeBaseline(patientId: string): Promise<Baseline | null> {
        // Skip if baseline already exists
        const existing = await localStorageManager.getBaseline(patientId);
        if (existing) {
            return existing;
        }

        // Get assessments from baseline period
        const allAssessments = await localStorageManager.getRecentAssessments(
            patientId,
            BASELINE_PERIOD_DAYS
        );
        const baselineAssessments = allAssessments.filter((a) => a.isBaselinePeriod);

        if (baselineAssessments.length < MIN_BASELINE_ASSESSMENTS) {
            return null;
        }

        // Compute baseline using package function
        const baseline = computeBaseline(baselineAssessments);

        // Validate quality
        if (!validateBaselineQuality(baseline)) {
            console.warn(
                `Baseline quality check failed for patient ${patientId}. ` +
                `Computed from ${baselineAssessments.length} assessments but metrics are invalid.`
            );
            return null;
        }

        // Save to local storage
        await localStorageManager.saveBaseline(baseline);

        console.log(
            `Baseline computed for patient ${patientId} from ${baselineAssessments.length} assessments.`
        );

        return baseline;
    }

    /**
     * Get the stored baseline for a patient (if it exists).
     */
    async getBaseline(patientId: string): Promise<Baseline | null> {
        return localStorageManager.getBaseline(patientId);
    }

    /**
     * Force recomputation of baseline (e.g., after new assessments).
     *
     * Deletes the existing baseline and recomputes from stored assessments.
     */
    async recomputeBaseline(patientId: string): Promise<Baseline | null> {
        // Delete existing baseline
        await localStorageManager.deleteBaseline(patientId);
        // Recompute
        return this.tryComputeBaseline(patientId);
    }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

export const baselineManager = new BaselineManager();
