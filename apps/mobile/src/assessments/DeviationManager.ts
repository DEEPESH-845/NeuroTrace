/**
 * DeviationManager — Mobile-layer deviation detection integration
 *
 * Wraps the packages/types DeviationDetector functions with the mobile
 * storage layer. Runs deviation analysis after each post-baseline assessment,
 * stores results locally, and queues alerts for backend sync.
 *
 * Requirements: 12.1, 36.1 — Offline deviation detection
 */

import {
    analyzeAssessment,
    detectDeviations,
    computeSeverity,
    DeviationConfig,
    DEFAULT_DEVIATION_CONFIG,
} from '@neurotrace/types';
import type { AssessmentResult, Deviation, TrendAnalysis } from '@neurotrace/types';
import { localStorageManager } from '../database/LocalStorageManager';
import { syncManager } from '../database/SyncManager';
import { baselineManager } from './BaselineManager';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DeviationAnalysisResult {
    /** Deviations found in the current assessment */
    deviations: Deviation[];
    /** Trend analysis result (null if no sustained trends) */
    trend: TrendAnalysis | null;
    /** Whether an alert should be generated */
    shouldAlert: boolean;
    /** Computed severity if alert needed */
    severity?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** Number of recent assessments to include in trend analysis */
const TREND_WINDOW_DAYS = 14;

// ─── DeviationManager ──────────────────────────────────────────────────────

/**
 * Manages deviation detection on the mobile device.
 *
 * Works offline — stores results locally and queues alerts for sync.
 */
export class DeviationManager {
    private config: DeviationConfig;

    constructor(config: DeviationConfig = DEFAULT_DEVIATION_CONFIG) {
        this.config = config;
    }

    /**
     * Analyze a completed assessment for deviations.
     *
     * Called by AssessmentOrchestrator after completeAssessment().
     * Only runs if baseline period is complete.
     *
     * @param assessment - The just-completed assessment
     * @returns Analysis result with deviations and trend data, or null if no baseline
     */
    async analyzeAssessmentForDeviations(
        assessment: AssessmentResult
    ): Promise<DeviationAnalysisResult | null> {
        // Skip during baseline period
        if (assessment.isBaselinePeriod) {
            return null;
        }

        // Get baseline
        const baseline = await baselineManager.getBaseline(assessment.patientId);
        if (!baseline) {
            console.warn(
                `No baseline found for patient ${assessment.patientId}, skipping deviation analysis.`
            );
            return null;
        }

        // Get recent assessments for trend analysis
        const recentAssessments = await localStorageManager.getRecentAssessments(
            assessment.patientId,
            TREND_WINDOW_DAYS
        );

        // Run the full analysis pipeline
        const { deviations, trend } = analyzeAssessment(
            assessment,
            baseline,
            recentAssessments,
            this.config
        );

        const shouldAlert = trend !== null;
        const severity = trend
            ? computeSeverity(
                trend.sustainedDeviations,
                trend.affectedModalities.length,
                this.config
            )
            : undefined;

        const result: DeviationAnalysisResult = {
            deviations,
            trend,
            shouldAlert,
            severity,
        };

        // If there's a trend that needs alerting, queue it for backend sync
        if (shouldAlert && trend) {
            await this.queueAlert(assessment, trend, severity!);
        }

        return result;
    }

    /**
     * Run a single-assessment deviation check (no trend analysis).
     *
     * Useful for quick spot-checks without the full trend window.
     */
    async quickCheck(
        assessment: AssessmentResult
    ): Promise<Deviation[]> {
        const baseline = await baselineManager.getBaseline(assessment.patientId);
        if (!baseline) return [];

        return detectDeviations(assessment, baseline, this.config);
    }

    /**
     * Queue an alert for backend sync.
     *
     * Stores the alert data locally and adds it to the sync queue
     * for eventual delivery to the backend when online.
     */
    private async queueAlert(
        assessment: AssessmentResult,
        trend: TrendAnalysis,
        severity: string
    ): Promise<void> {
        const alertPayload = {
            patientId: assessment.patientId,
            assessmentId: assessment.assessmentId,
            severity,
            affectedModalities: trend.affectedModalities,
            consecutiveDays: trend.consecutiveDays,
            sustainedDeviations: trend.sustainedDeviations.length,
            detectedAt: new Date().toISOString(),
        };

        // Queue for sync
        await syncManager.queueForSync({
            type: 'ALERT' as any,
            id: `alert-${assessment.assessmentId}`,
            data: alertPayload,
            timestamp: new Date(),
            retryCount: 0,
        });

        console.log(
            `Alert queued for patient ${assessment.patientId}: ` +
            `${severity} severity, ${trend.affectedModalities.join(', ')} affected.`
        );
    }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

export const deviationManager = new DeviationManager();
