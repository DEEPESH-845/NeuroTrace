/**
 * Deviation Analysis Service — Mobile integration for deviation detection
 *
 * Orchestrates the on-device analysis of assessment results:
 * 1. Fetches patient baseline based on ID
 * 2. Fetches recent assessment history
 * 3. Runs core deviation detection logic (from @neurotrace/types)
 * 4. Returns deviations and trend analysis
 *
 * Requirements: 3.1, 3.4
 */

import {
    AssessmentResult,
    Deviation,
    TrendAnalysis,
    analyzeAssessment,
    DEFAULT_DEVIATION_CONFIG,
} from '@neurotrace/types';
import { localStorageManager } from '../database/LocalStorageManager';

export class DeviationAnalysisService {
    /**
     * Analyze an assessment for deviations and trends
     *
     * @param assessment - The assessment to analyze
     * @returns Object containing deviations and trend analysis
     */
    async analyze(assessment: AssessmentResult): Promise<{
        deviations: Deviation[];
        trend: TrendAnalysis | null;
    }> {
        try {
            // 1. Fetch patient baseline
            const baseline = await localStorageManager.getBaseline(assessment.patientId);

            if (!baseline) {
                console.log(`No baseline found for patient ${assessment.patientId}. Skipping deviation analysis.`);
                return { deviations: [], trend: null };
            }

            // 2. Fetch recent assessments for trend analysis
            // We need enough history for trend detection (default 3 days)
            // Fetching last 14 days to be safe and support longer trend windows if config changes
            // Note: analyzeAssessment expects sorted assessments
            const recentAssessments = await localStorageManager.getRecentAssessments(
                assessment.patientId,
                14
            );

            // Ensure specific sorting by dayNumber for trend analysis
            const sortedHistory = [...recentAssessments].sort((a, b) => a.dayNumber - b.dayNumber);

            // Add current assessment if not already present (it might not be saved yet when this runs)
            const exists = sortedHistory.some(a => a.assessmentId === assessment.assessmentId);
            if (!exists) {
                // Find correct insertion point or append if dayNumber is >= last
                // Assuming current assessment is newest
                sortedHistory.push(assessment);
            }

            // 3. Run core analysis logic
            const result = analyzeAssessment(
                assessment,
                baseline,
                sortedHistory,
                DEFAULT_DEVIATION_CONFIG
            );

            console.log(
                `Deviation analysis complete for assessment ${assessment.assessmentId}: ` +
                `found ${result.deviations.length} deviations, ` +
                `trend found: ${!!result.trend}`
            );

            return result;
        } catch (error) {
            console.error('Failed to run deviation analysis:', error);
            // Fail open - return empty results rather than crashing the assessment flow
            return { deviations: [], trend: null };
        }
    }
}

export const deviationAnalysisService = new DeviationAnalysisService();
