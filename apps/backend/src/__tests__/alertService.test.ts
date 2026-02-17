/**
 * Alert Service Tests
 *
 * Tests alert message generation and severity logic (no DB required).
 */

import {
    createAlertMessage,
    TrendData,
} from '../services/alertService';

describe('createAlertMessage', () => {
    it('generates LOW severity message with monitoring actions', () => {
        const trend: TrendData = {
            sustainedDeviations: [
                {
                    metricName: 'speech',
                    currentValue: 95,
                    baselineValue: 120,
                    standardDeviations: 2.5,
                    timestamp: new Date().toISOString(),
                },
            ],
            consecutiveDays: 3,
            affectedModalities: ['speech'],
            severity: 'LOW',
        };

        const { message, recommendedActions } = createAlertMessage(trend, 'p1');

        expect(message).toContain('Minor changes detected');
        expect(message).toContain('speech patterns');
        expect(message).toContain('3 consecutive day(s)');
        expect(message).toContain('2.5 standard deviations');
        expect(recommendedActions).toContain('Monitor patient in next assessment cycle');
        expect(recommendedActions).toContain('Evaluate speech therapy progress');
    });

    it('generates MEDIUM severity message with follow-up actions', () => {
        const trend: TrendData = {
            sustainedDeviations: [
                {
                    metricName: 'speech',
                    currentValue: 85,
                    baselineValue: 120,
                    standardDeviations: 3.5,
                    timestamp: new Date().toISOString(),
                },
                {
                    metricName: 'facial',
                    currentValue: 0.65,
                    baselineValue: 0.85,
                    standardDeviations: 4.0,
                    timestamp: new Date().toISOString(),
                },
            ],
            consecutiveDays: 4,
            affectedModalities: ['speech', 'facial'],
            severity: 'MEDIUM',
        };

        const { message, recommendedActions } = createAlertMessage(trend, 'p1');

        expect(message).toContain('Significant changes detected');
        expect(message).toContain('speech patterns and facial symmetry');
        expect(recommendedActions).toContain('Schedule follow-up within 48 hours');
    });

    it('generates HIGH severity message with urgent actions', () => {
        const trend: TrendData = {
            sustainedDeviations: [
                {
                    metricName: 'speech',
                    currentValue: 70,
                    baselineValue: 120,
                    standardDeviations: 5.0,
                    timestamp: new Date().toISOString(),
                },
                {
                    metricName: 'facial',
                    currentValue: 0.55,
                    baselineValue: 0.85,
                    standardDeviations: 6.0,
                    timestamp: new Date().toISOString(),
                },
                {
                    metricName: 'reaction',
                    currentValue: 500,
                    baselineValue: 300,
                    standardDeviations: 6.7,
                    timestamp: new Date().toISOString(),
                },
            ],
            consecutiveDays: 5,
            affectedModalities: ['speech', 'facial', 'reaction'],
            severity: 'HIGH',
        };

        const { message, recommendedActions } = createAlertMessage(trend, 'p1');

        expect(message).toContain('Critical changes detected');
        expect(message).toContain('speech patterns and facial symmetry and reaction time');
        expect(recommendedActions).toContain('Immediate clinical review recommended');
        expect(recommendedActions).toContain('Contact patient or caregiver');
        expect(recommendedActions).toContain('Consider in-person assessment');
    });

    it('includes modality-specific actions', () => {
        const trend: TrendData = {
            sustainedDeviations: [
                {
                    metricName: 'reaction',
                    currentValue: 400,
                    baselineValue: 300,
                    standardDeviations: 3.3,
                    timestamp: new Date().toISOString(),
                },
            ],
            consecutiveDays: 3,
            affectedModalities: ['reaction'],
            severity: 'LOW',
        };

        const { recommendedActions } = createAlertMessage(trend, 'p1');
        expect(recommendedActions).toContain('Review cognitive assessment results');
    });
});
