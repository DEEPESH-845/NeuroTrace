/**
 * Assessment Service Tests
 *
 * Tests assessment payload validation (no DB required).
 */

import { validateAssessmentPayload } from '../services/assessmentService';

describe('validateAssessmentPayload', () => {
    const validPayload = {
        patientId: 'patient-1',
        timestamp: '2025-01-15T10:30:00Z',
        dayNumber: 5,
        derivedMetrics: {
            speech: {
                articulationRate: 120,
                meanPauseDuration: 200,
                pauseFrequency: 5,
                phoneticPrecision: 0.8,
                voiceQuality: 0.9,
            },
            facial: {
                symmetryScore: 0.85,
                eyeOpennessRatio: 0.8,
                mouthSymmetry: 0.85,
            },
            reaction: {
                meanReactionTime: 300,
                reactionTimeVariability: 30,
                accuracy: 0.9,
            },
        },
        metadata: {
            deviceId: 'device-1',
            platform: 'ios',
            appVersion: '1.0.0',
            modelVersion: '1.0.0',
            processingTime: 3.5,
        },
    };

    it('accepts valid payload', () => {
        const result = validateAssessmentPayload(validPayload);
        expect(result.valid).toBe(true);
    });

    it('rejects missing patientId', () => {
        const result = validateAssessmentPayload({ ...validPayload, patientId: undefined });
        expect(result.valid).toBe(false);
        if (!result.valid) {
            expect(result.errors.some((e) => e.field === 'patientId')).toBe(true);
        }
    });

    it('rejects invalid timestamp', () => {
        const result = validateAssessmentPayload({ ...validPayload, timestamp: 'not-a-date' });
        expect(result.valid).toBe(false);
    });

    it('rejects negative dayNumber', () => {
        const result = validateAssessmentPayload({ ...validPayload, dayNumber: -1 });
        expect(result.valid).toBe(false);
    });

    it('rejects zero dayNumber', () => {
        const result = validateAssessmentPayload({ ...validPayload, dayNumber: 0 });
        expect(result.valid).toBe(false);
    });

    it('rejects missing derivedMetrics', () => {
        const result = validateAssessmentPayload({ ...validPayload, derivedMetrics: undefined });
        expect(result.valid).toBe(false);
    });

    it('rejects missing speech metrics', () => {
        const payload = {
            ...validPayload,
            derivedMetrics: { ...validPayload.derivedMetrics, speech: undefined },
        };
        const result = validateAssessmentPayload(payload);
        expect(result.valid).toBe(false);
    });

    it('rejects missing facial metrics', () => {
        const payload = {
            ...validPayload,
            derivedMetrics: { ...validPayload.derivedMetrics, facial: undefined },
        };
        const result = validateAssessmentPayload(payload);
        expect(result.valid).toBe(false);
    });

    it('rejects missing reaction metrics', () => {
        const payload = {
            ...validPayload,
            derivedMetrics: { ...validPayload.derivedMetrics, reaction: undefined },
        };
        const result = validateAssessmentPayload(payload);
        expect(result.valid).toBe(false);
    });

    it('REJECTS raw biometric data (privacy requirement)', () => {
        const result = validateAssessmentPayload({
            ...validPayload,
            rawAudio: Buffer.from('audio-data'),
        });
        expect(result.valid).toBe(false);
        if (!result.valid) {
            expect(result.errors.some((e) => e.field === 'rawData')).toBe(true);
        }
    });

    it('REJECTS raw image data', () => {
        const result = validateAssessmentPayload({
            ...validPayload,
            rawImage: Buffer.from('image'),
        });
        expect(result.valid).toBe(false);
    });

    it('REJECTS raw video data', () => {
        const result = validateAssessmentPayload({
            ...validPayload,
            rawVideo: Buffer.from('video'),
        });
        expect(result.valid).toBe(false);
    });

    it('collects multiple validation errors', () => {
        const result = validateAssessmentPayload({
            timestamp: 'bad',
            dayNumber: -1,
        });
        expect(result.valid).toBe(false);
        if (!result.valid) {
            expect(result.errors.length).toBeGreaterThanOrEqual(3);
        }
    });
});
