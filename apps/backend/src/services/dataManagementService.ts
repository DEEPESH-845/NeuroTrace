/**
 * Data Management Service
 *
 * Handles HIPAA-compliant patient data deletion and export.
 * Supports right-to-deletion and data portability requirements.
 *
 * Requirements: 33.1, 33.3 — Data retention, deletion, and export
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DeletionRequest {
    patientId: string;
    requestedBy: string;
    reason: string;
    retainAuditLogs: boolean;
}

export interface DeletionResult {
    patientId: string;
    deletedRecords: {
        assessments: number;
        alerts: number;
        notifications: number;
        baseline: boolean;
        caregivers: number;
        federatedGradients: number;
        auditLogs: number;
        patient: boolean;
    };
    retainedAuditLogs: boolean;
    completedAt: Date;
}

export interface ExportResult {
    patientId: string;
    format: 'json' | 'fhir';
    data: any;
    exportedAt: Date;
    recordCounts: {
        assessments: number;
        alerts: number;
        baseline: boolean;
        caregivers: number;
    };
}

// ─── Data Deletion ──────────────────────────────────────────────────────────

/**
 * Delete all patient data from the system.
 *
 * Follows cascade deletion order to respect foreign key constraints.
 * Optionally retains audit logs for HIPAA compliance (6-year retention).
 */
export async function deletePatientData(
    request: DeletionRequest
): Promise<DeletionResult> {
    const { patientId, retainAuditLogs } = request;

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
        where: { id: patientId },
    });

    if (!patient) {
        throw new Error(`Patient ${patientId} not found`);
    }

    const result: DeletionResult = {
        patientId,
        deletedRecords: {
            assessments: 0,
            alerts: 0,
            notifications: 0,
            baseline: false,
            caregivers: 0,
            federatedGradients: 0,
            auditLogs: 0,
            patient: false,
        },
        retainedAuditLogs: retainAuditLogs,
        completedAt: new Date(),
    };

    // Use a transaction for atomic deletion
    await prisma.$transaction(async (tx) => {
        // 1. Delete notifications (depends on alerts)
        const notifications = await tx.notification.deleteMany({
            where: {
                alert: { patientId },
            },
        });
        result.deletedRecords.notifications = notifications.count;

        // 2. Delete alerts
        const alerts = await tx.alert.deleteMany({
            where: { patientId },
        });
        result.deletedRecords.alerts = alerts.count;

        // 3. Delete assessments
        const assessments = await tx.assessment.deleteMany({
            where: { patientId },
        });
        result.deletedRecords.assessments = assessments.count;

        // 4. Delete baseline
        const baseline = await tx.baseline.deleteMany({
            where: { patientId },
        });
        result.deletedRecords.baseline = baseline.count > 0;

        // 5. Delete caregivers
        const caregivers = await tx.caregiver.deleteMany({
            where: { patientId },
        });
        result.deletedRecords.caregivers = caregivers.count;

        // 6. Delete audit logs (unless retained for compliance)
        if (!retainAuditLogs) {
            const auditLogs = await tx.auditLog.deleteMany({
                where: { patientId },
            });
            result.deletedRecords.auditLogs = auditLogs.count;
        }

        // 7. Delete the patient record itself
        await tx.patient.delete({
            where: { id: patientId },
        });
        result.deletedRecords.patient = true;
    });

    result.completedAt = new Date();
    return result;
}

// ─── Data Export ────────────────────────────────────────────────────────────

/**
 * Export all patient data in JSON format.
 *
 * Returns a complete snapshot of the patient's data for portability.
 */
export async function exportPatientData(
    patientId: string,
    format: 'json' | 'fhir' = 'json'
): Promise<ExportResult> {
    const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        include: {
            assessments: {
                orderBy: { timestamp: 'asc' },
            },
            alerts: {
                include: { notifications: true },
                orderBy: { createdAt: 'asc' },
            },
            baseline: true,
            caregivers: true,
        },
    });

    if (!patient) {
        throw new Error(`Patient ${patientId} not found`);
    }

    // Sanitize — remove internal IDs and metadata not relevant to export
    const exportData = {
        patient: {
            id: patient.id,
            dateOfBirth: patient.dateOfBirth,
            gender: patient.gender,
            strokeDate: patient.strokeDate,
            strokeType: patient.strokeType,
            dischargeDate: patient.dischargeDate,
            enrollmentDate: patient.enrollmentDate,
            programEndDate: patient.programEndDate,
            language: patient.language,
            timezone: patient.timezone,
        },
        assessments: patient.assessments.map((a) => ({
            id: a.id,
            timestamp: a.timestamp,
            dayNumber: a.dayNumber,
            derivedMetrics: a.derivedMetrics,
            deviations: a.deviations,
        })),
        alerts: patient.alerts.map((alert) => ({
            id: alert.id,
            severity: alert.severity,
            message: alert.message,
            status: alert.status,
            affectedModalities: alert.affectedModalities,
            consecutiveDays: alert.consecutiveDays,
            createdAt: alert.createdAt,
            acknowledgedAt: alert.acknowledgedAt,
        })),
        baseline: patient.baseline
            ? {
                assessmentCount: patient.baseline.assessmentCount,
                speechMetrics: patient.baseline.speechMetrics,
                facialMetrics: patient.baseline.facialMetrics,
                reactionMetrics: patient.baseline.reactionMetrics,
            }
            : null,
        caregivers: patient.caregivers.map((c) => ({
            name: c.name,
            relationship: c.relationship,
            linkedAt: c.linkedAt,
        })),
        exportMetadata: {
            exportedAt: new Date().toISOString(),
            format,
            version: '1.0',
        },
    };

    return {
        patientId,
        format,
        data: exportData,
        exportedAt: new Date(),
        recordCounts: {
            assessments: patient.assessments.length,
            alerts: patient.alerts.length,
            baseline: !!patient.baseline,
            caregivers: patient.caregivers.length,
        },
    };
}

// ─── Data Retention ─────────────────────────────────────────────────────────

/**
 * Check if patient data is past its retention period.
 *
 * Default retention: 6 years from program end date (HIPAA minimum).
 */
export function isDataPastRetention(
    programEndDate: Date,
    retentionYears = 6
): boolean {
    const retentionEnd = new Date(programEndDate);
    retentionEnd.setFullYear(retentionEnd.getFullYear() + retentionYears);
    return new Date() > retentionEnd;
}

/**
 * Find all patients whose data is past the retention period.
 */
export async function findExpiredPatients(
    retentionYears = 6
): Promise<Array<{ id: string; programEndDate: Date }>> {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - retentionYears);

    return prisma.patient.findMany({
        where: {
            programEndDate: { lt: cutoffDate },
        },
        select: {
            id: true,
            programEndDate: true,
        },
    });
}
