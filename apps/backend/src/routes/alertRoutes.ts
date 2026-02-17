/**
 * Alert Routes
 *
 * GET  /api/v1/patients/:patientId/alerts — List patient alerts
 * POST /api/v1/alerts/:alertId/acknowledge — Acknowledge alert
 * POST /api/v1/alerts/:alertId/resolve — Resolve alert
 */

import { Router, Request, Response } from 'express';
import {
    getPatientAlerts,
    acknowledgeAlert,
    resolveAlert,
} from '../services/alertService';
import { requireRole, requirePatientAccess, UserRole } from '../middleware/authMiddleware';
import { auditMiddleware } from '../services/auditService';

const router = Router();

/**
 * GET /api/v1/patients/:patientId/alerts
 * List alerts for a patient with optional status/severity filters.
 */
router.get(
    '/patients/:patientId/alerts',
    requireRole(UserRole.CAREGIVER, UserRole.CLINICIAN, UserRole.ADMIN),
    requirePatientAccess(),
    auditMiddleware('ALERT'),
    async (req: Request, res: Response) => {
        try {
            const { patientId } = req.params;
            const { status, severity, limit, offset } = req.query;

            const alerts = await getPatientAlerts(patientId, {
                status: status as string,
                severity: severity as string,
                limit: limit ? parseInt(limit as string) : undefined,
                offset: offset ? parseInt(offset as string) : undefined,
            });

            res.json({
                data: alerts,
                count: alerts.length,
                timestamp: new Date().toISOString(),
            });
        } catch (err: any) {
            console.error('Alert list error:', err);
            res.status(500).json({
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to retrieve alerts',
                    timestamp: new Date().toISOString(),
                },
            });
        }
    }
);

/**
 * POST /api/v1/alerts/:alertId/acknowledge
 * Acknowledge an alert (clinician action).
 */
router.post(
    '/:alertId/acknowledge',
    requireRole(UserRole.CLINICIAN, UserRole.ADMIN),
    auditMiddleware('ALERT'),
    async (req: Request, res: Response) => {
        try {
            const { alertId } = req.params;
            const { notes } = req.body;

            await acknowledgeAlert(alertId, req.user!.userId, notes);

            res.json({
                message: 'Alert acknowledged',
                alertId,
                timestamp: new Date().toISOString(),
            });
        } catch (err: any) {
            console.error('Alert acknowledge error:', err);
            res.status(500).json({
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to acknowledge alert',
                    timestamp: new Date().toISOString(),
                },
            });
        }
    }
);

/**
 * POST /api/v1/alerts/:alertId/resolve
 * Resolve an alert.
 */
router.post(
    '/:alertId/resolve',
    requireRole(UserRole.CLINICIAN, UserRole.ADMIN),
    auditMiddleware('ALERT'),
    async (req: Request, res: Response) => {
        try {
            const { alertId } = req.params;
            const { notes } = req.body;

            await resolveAlert(alertId, req.user!.userId, notes);

            res.json({
                message: 'Alert resolved',
                alertId,
                timestamp: new Date().toISOString(),
            });
        } catch (err: any) {
            console.error('Alert resolve error:', err);
            res.status(500).json({
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to resolve alert',
                    timestamp: new Date().toISOString(),
                },
            });
        }
    }
);

export default router;
