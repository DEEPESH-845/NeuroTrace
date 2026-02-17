/**
 * FHIR Integration Service
 *
 * Generates FHIR R4 resources for EHR interoperability.
 * Maps NeuroTrace assessments to FHIR Observation resources
 * and alerts to FHIR Communication resources.
 *
 * Requirements: 9.1, 9.2, 9.3
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── LOINC Code Mapping ─────────────────────────────────────────────────────

const LOINC_CODES: Record<string, { code: string; display: string }> = {
    articulationRate: { code: '72166-2', display: 'Speech articulation rate' },
    pauseDuration: { code: '72167-0', display: 'Speech pause duration' },
    pauseFrequency: { code: '72168-8', display: 'Speech pause frequency' },
    phoneticPrecision: { code: '72169-6', display: 'Phonetic precision score' },
    voiceQuality: { code: '72170-4', display: 'Voice quality score' },
    symmetryScore: { code: '72171-2', display: 'Facial symmetry score' },
    eyeOpenness: { code: '72172-0', display: 'Eye openness ratio' },
    mouthSymmetry: { code: '72173-8', display: 'Mouth symmetry score' },
    reactionTime: { code: '72174-6', display: 'Reaction time' },
    reactionVariability: { code: '72175-3', display: 'Reaction time variability' },
    reactionAccuracy: { code: '72176-1', display: 'Reaction accuracy' },
};

// ─── FHIR Resource Builders ─────────────────────────────────────────────────

/**
 * Create a FHIR Observation resource from an assessment.
 */
export function createObservationResource(
    assessment: any,
    patientId: string
): any {
    const metrics = assessment.derivedMetrics;

    return {
        resourceType: 'Observation',
        id: assessment.id,
        status: 'final',
        category: [
            {
                coding: [
                    {
                        system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                        code: 'exam',
                        display: 'Exam',
                    },
                ],
            },
        ],
        code: {
            coding: [
                {
                    system: 'http://loinc.org',
                    code: '72166-2',
                    display: 'Neurological assessment panel',
                },
            ],
        },
        subject: {
            reference: `Patient/${patientId}`,
        },
        effectiveDateTime: assessment.timestamp,
        component: [
            {
                code: {
                    coding: [{ system: 'http://loinc.org', ...LOINC_CODES.articulationRate }],
                },
                valueQuantity: {
                    value: metrics.speech?.articulationRate,
                    unit: 'words/min',
                    system: 'http://unitsofmeasure.org',
                },
            },
            {
                code: {
                    coding: [{ system: 'http://loinc.org', ...LOINC_CODES.symmetryScore }],
                },
                valueQuantity: {
                    value: metrics.facial?.symmetryScore,
                    unit: 'score',
                },
            },
            {
                code: {
                    coding: [{ system: 'http://loinc.org', ...LOINC_CODES.reactionTime }],
                },
                valueQuantity: {
                    value: metrics.reaction?.meanReactionTime,
                    unit: 'ms',
                    system: 'http://unitsofmeasure.org',
                },
            },
        ],
    };
}

/**
 * Create a FHIR Communication resource from an alert.
 */
export function createCommunicationResource(alert: any): any {
    return {
        resourceType: 'Communication',
        id: alert.id,
        status: alert.status === 'ACTIVE' ? 'in-progress' : 'completed',
        category: [
            {
                coding: [
                    {
                        system: 'http://terminology.hl7.org/CodeSystem/communication-category',
                        code: 'alert',
                        display: 'Alert',
                    },
                ],
            },
        ],
        priority: alert.severity === 'HIGH' ? 'urgent' : alert.severity === 'MEDIUM' ? 'routine' : 'routine',
        subject: {
            reference: `Patient/${alert.patientId}`,
        },
        sent: alert.createdAt,
        payload: [
            {
                contentString: alert.message,
            },
        ],
    };
}

/**
 * Export all patient data as a FHIR Bundle.
 */
export async function exportPatientBundle(patientId: string): Promise<any> {
    const patient = await prisma.patient.findUnique({
        where: { id: patientId },
    });

    if (!patient) {
        throw new Error(`Patient ${patientId} not found`);
    }

    const assessments = await prisma.assessment.findMany({
        where: { patientId },
        orderBy: { timestamp: 'desc' },
    });

    const alerts = await prisma.alert.findMany({
        where: { patientId },
        orderBy: { createdAt: 'desc' },
    });

    const entries = [];

    // Patient resource
    entries.push({
        resource: {
            resourceType: 'Patient',
            id: patientId,
            gender: patient.gender.toLowerCase(),
            birthDate: patient.dateOfBirth.toISOString().split('T')[0],
        },
        request: { method: 'GET', url: `Patient/${patientId}` },
    });

    // Observation resources from assessments
    for (const assessment of assessments) {
        entries.push({
            resource: createObservationResource(assessment, patientId),
            request: { method: 'GET', url: `Observation/${assessment.id}` },
        });
    }

    // Communication resources from alerts
    for (const alert of alerts) {
        entries.push({
            resource: createCommunicationResource(alert),
            request: { method: 'GET', url: `Communication/${alert.id}` },
        });
    }

    return {
        resourceType: 'Bundle',
        type: 'searchset',
        total: entries.length,
        entry: entries,
    };
}
