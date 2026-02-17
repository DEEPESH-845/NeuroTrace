/**
 * Audit Logger Service
 *
 * Logs access to PHI, security events, and data exports.
 * HIPAA requires 6-year retention of audit logs.
 *
 * Requirements: 22.1, 6.4, 6.5
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
    userId: string;
    patientId?: string;
    resource: string;
    action: string;
    ipAddress: string;
    details?: Record<string, any>;
}

// ─── Service ────────────────────────────────────────────────────────────────

/**
 * Log an access event to the audit trail.
 */
export async function logAccess(entry: AuditLogEntry): Promise<string> {
    const log = await prisma.auditLog.create({
        data: {
            userId: entry.userId,
            patientId: entry.patientId,
            resource: entry.resource,
            action: entry.action,
            ipAddress: entry.ipAddress,
            details: entry.details as any,
        },
    });

    return log.id;
}

/**
 * Log a data export event (required by HIPAA).
 */
export async function logDataExport(
    userId: string,
    patientId: string,
    exportType: string,
    ipAddress: string
): Promise<string> {
    return logAccess({
        userId,
        patientId,
        resource: 'PATIENT_DATA',
        action: `EXPORT_${exportType.toUpperCase()}`,
        ipAddress,
        details: { exportType, timestamp: new Date().toISOString() },
    });
}

/**
 * Log a security event.
 */
export async function logSecurityEvent(
    userId: string,
    eventType: string,
    ipAddress: string,
    details?: Record<string, any>
): Promise<string> {
    return logAccess({
        userId,
        resource: 'SECURITY',
        action: eventType,
        ipAddress,
        details,
    });
}

/**
 * Query audit logs with filters.
 */
export async function queryAuditLogs(
    filters: {
        userId?: string;
        patientId?: string;
        resource?: string;
        action?: string;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
        offset?: number;
    }
): Promise<any[]> {
    const where: any = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.patientId) where.patientId = filters.patientId;
    if (filters.resource) where.resource = filters.resource;
    if (filters.action) where.action = filters.action;

    if (filters.startDate || filters.endDate) {
        where.timestamp = {};
        if (filters.startDate) where.timestamp.gte = filters.startDate;
        if (filters.endDate) where.timestamp.lte = filters.endDate;
    }

    return prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: filters.limit || 100,
        skip: filters.offset || 0,
    });
}

// ─── Middleware ──────────────────────────────────────────────────────────────

/**
 * Express middleware that automatically logs requests accessing PHI.
 */
export function auditMiddleware(resource: string) {
    return async (req: any, _res: any, next: any) => {
        // Log the access attempt
        try {
            await logAccess({
                userId: req.user?.userId || 'anonymous',
                patientId: req.params.patientId,
                resource,
                action: `${req.method} ${req.originalUrl}`,
                ipAddress: req.ip || req.headers['x-forwarded-for'] || 'unknown',
            });
        } catch (err) {
            console.error('Audit logging failed:', err);
            // Don't block the request if audit logging fails
        }
        next();
    };
}
