/**
 * Alert Generation Service
 *
 * Generates alerts from sustained deviation trends, determines recipients,
 * and computes plain-language alert messages.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TrendData {
    sustainedDeviations: Array<{
        metricName: string;
        currentValue: number;
        baselineValue: number;
        standardDeviations: number;
        timestamp: string;
    }>;
    consecutiveDays: number;
    affectedModalities: string[];
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface GeneratedAlert {
    alertId: string;
    patientId: string;
    severity: string;
    message: string;
    recommendedActions: string[];
    affectedModalities: string[];
    consecutiveDays: number;
}

// ─── Alert Message Generation ───────────────────────────────────────────────

const MODALITY_LABELS: Record<string, string> = {
    speech: 'speech patterns',
    facial: 'facial symmetry',
    reaction: 'reaction time',
};

/**
 * Generate a human-readable alert message from trend data.
 */
export function createAlertMessage(
    trend: TrendData,
    _patientId: string
): { message: string; recommendedActions: string[] } {
    const modalityList = trend.affectedModalities
        .map((m) => MODALITY_LABELS[m] || m)
        .join(' and ');

    const severityText = {
        LOW: 'Minor changes detected',
        MEDIUM: 'Significant changes detected',
        HIGH: 'Critical changes detected',
    }[trend.severity];

    const message =
        `${severityText} in ${modalityList} for patient. ` +
        `Sustained deviation observed over ${trend.consecutiveDays} consecutive day(s). ` +
        `Maximum deviation: ${Math.max(
            ...trend.sustainedDeviations.map((d) => d.standardDeviations)
        ).toFixed(1)} standard deviations from baseline.`;

    const recommendedActions: string[] = [];

    if (trend.severity === 'HIGH') {
        recommendedActions.push('Immediate clinical review recommended');
        recommendedActions.push('Contact patient or caregiver');
        recommendedActions.push('Consider in-person assessment');
    } else if (trend.severity === 'MEDIUM') {
        recommendedActions.push('Review patient assessment history');
        recommendedActions.push('Schedule follow-up within 48 hours');
    } else {
        recommendedActions.push('Monitor patient in next assessment cycle');
        recommendedActions.push('Review trend data at next scheduled review');
    }

    if (trend.affectedModalities.includes('speech')) {
        recommendedActions.push('Evaluate speech therapy progress');
    }
    if (trend.affectedModalities.includes('facial')) {
        recommendedActions.push('Assess facial motor function');
    }
    if (trend.affectedModalities.includes('reaction')) {
        recommendedActions.push('Review cognitive assessment results');
    }

    return { message, recommendedActions };
}

// ─── Service ────────────────────────────────────────────────────────────────

/**
 * Generate an alert from a trend analysis result and store it in the database.
 */
export async function generateAlert(
    trend: TrendData,
    patientId: string,
    triggeringAssessmentIds: string[]
): Promise<GeneratedAlert> {
    const { message, recommendedActions } = createAlertMessage(trend, patientId);

    const alert = await prisma.alert.create({
        data: {
            patientId,
            severity: trend.severity,
            triggeringAssessments: triggeringAssessmentIds,
            sustainedDeviations: trend.sustainedDeviations as any,
            affectedModalities: trend.affectedModalities,
            consecutiveDays: trend.consecutiveDays,
            message,
            recommendedActions,
            status: 'ACTIVE',
        },
    });

    // Mark triggering assessments as having generated an alert
    await prisma.assessment.updateMany({
        where: { id: { in: triggeringAssessmentIds } },
        data: { alertGenerated: true },
    });

    return {
        alertId: alert.id,
        patientId,
        severity: trend.severity,
        message,
        recommendedActions,
        affectedModalities: trend.affectedModalities,
        consecutiveDays: trend.consecutiveDays,
    };
}

/**
 * Acknowledge an alert.
 */
export async function acknowledgeAlert(
    alertId: string,
    clinicianId: string,
    notes?: string
): Promise<void> {
    await prisma.alert.update({
        where: { id: alertId },
        data: {
            status: 'ACKNOWLEDGED',
            acknowledgedAt: new Date(),
            acknowledgedBy: clinicianId,
            clinicianNotes: notes,
        },
    });
}

/**
 * Resolve an alert.
 */
export async function resolveAlert(
    alertId: string,
    clinicianId: string,
    notes?: string
): Promise<void> {
    await prisma.alert.update({
        where: { id: alertId },
        data: {
            status: 'RESOLVED',
            acknowledgedBy: clinicianId,
            clinicianNotes: notes,
        },
    });
}

/**
 * Get alerts for a patient with optional status filter.
 */
export async function getPatientAlerts(
    patientId: string,
    options?: {
        status?: string;
        severity?: string;
        limit?: number;
        offset?: number;
    }
): Promise<any[]> {
    const where: any = { patientId };
    if (options?.status) where.status = options.status;
    if (options?.severity) where.severity = options.severity;

    return prisma.alert.findMany({
        where,
        include: { notifications: true },
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
    });
}
