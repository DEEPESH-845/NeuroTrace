/**
 * Assessment Ingestion Service
 *
 * Validates and stores assessment results from mobile devices.
 * Only derived metrics are accepted — no raw biometric data.
 *
 * Requirements: 15.1, 2.7, 6.8
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AssessmentIngestionPayload {
    patientId: string;
    timestamp: string; // ISO 8601
    dayNumber: number;
    derivedMetrics: {
        speech: {
            articulationRate: number;
            meanPauseDuration: number;
            pauseFrequency: number;
            phoneticPrecision: number;
            voiceQuality: number;
        };
        facial: {
            symmetryScore: number;
            eyeOpennessRatio: number;
            mouthSymmetry: number;
        };
        reaction: {
            meanReactionTime: number;
            reactionTimeVariability: number;
            accuracy: number;
        };
    };
    deviations?: Array<{
        metricName: string;
        currentValue: number;
        baselineValue: number;
        standardDeviations: number;
        timestamp: string;
    }>;
    metadata: {
        deviceId: string;
        platform: string;
        appVersion: string;
        modelVersion: string;
        processingTime: number;
    };
}

export interface ValidationError {
    field: string;
    message: string;
}

// ─── Validation ─────────────────────────────────────────────────────────────

/**
 * Validate assessment payload.
 * Ensures no raw biometric data is present and all required fields exist.
 */
export function validateAssessmentPayload(
    payload: any
): { valid: true } | { valid: false; errors: ValidationError[] } {
    const errors: ValidationError[] = [];

    if (!payload.patientId || typeof payload.patientId !== 'string') {
        errors.push({ field: 'patientId', message: 'Patient ID is required' });
    }

    if (!payload.timestamp || isNaN(Date.parse(payload.timestamp))) {
        errors.push({ field: 'timestamp', message: 'Valid ISO 8601 timestamp is required' });
    }

    if (typeof payload.dayNumber !== 'number' || payload.dayNumber < 1) {
        errors.push({ field: 'dayNumber', message: 'Day number must be a positive integer' });
    }

    // Validate derived metrics structure
    if (!payload.derivedMetrics) {
        errors.push({ field: 'derivedMetrics', message: 'Derived metrics are required' });
    } else {
        const { speech, facial, reaction } = payload.derivedMetrics;

        if (!speech || typeof speech.articulationRate !== 'number') {
            errors.push({ field: 'derivedMetrics.speech', message: 'Valid speech metrics are required' });
        }
        if (!facial || typeof facial.symmetryScore !== 'number') {
            errors.push({ field: 'derivedMetrics.facial', message: 'Valid facial metrics are required' });
        }
        if (!reaction || typeof reaction.meanReactionTime !== 'number') {
            errors.push({ field: 'derivedMetrics.reaction', message: 'Valid reaction metrics are required' });
        }
    }

    // Reject if raw biometric data is present (privacy requirement)
    if (payload.rawAudio || payload.rawImage || payload.rawVideo) {
        errors.push({
            field: 'rawData',
            message: 'Raw biometric data must not be transmitted — only derived metrics are accepted',
        });
    }

    if (errors.length > 0) {
        return { valid: false, errors };
    }

    return { valid: true };
}

// ─── Service ────────────────────────────────────────────────────────────────

/**
 * Ingest an assessment result into the database.
 */
export async function ingestAssessment(
    payload: AssessmentIngestionPayload
): Promise<string> {
    // Verify patient exists
    const patient = await prisma.patient.findUnique({
        where: { id: payload.patientId },
    });

    if (!patient) {
        throw new Error(`Patient ${payload.patientId} not found`);
    }

    // Store assessment
    const assessment = await prisma.assessment.create({
        data: {
            patientId: payload.patientId,
            timestamp: new Date(payload.timestamp),
            dayNumber: payload.dayNumber,
            derivedMetrics: payload.derivedMetrics as any,
            deviations: payload.deviations ? (payload.deviations as any) : undefined,
            alertGenerated: false,
        },
    });

    return assessment.id;
}

/**
 * Get assessments for a patient with optional filters.
 */
export async function getPatientAssessments(
    patientId: string,
    options?: {
        startDate?: Date;
        endDate?: Date;
        limit?: number;
        offset?: number;
    }
): Promise<any[]> {
    const where: any = { patientId };

    if (options?.startDate || options?.endDate) {
        where.timestamp = {};
        if (options.startDate) where.timestamp.gte = options.startDate;
        if (options.endDate) where.timestamp.lte = options.endDate;
    }

    return prisma.assessment.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
    });
}

export { prisma };
