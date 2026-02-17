/**
 * Admin API Routes
 *
 * Routes for admin-only operations: data management, security monitoring,
 * accuracy monitoring, and system health.
 *
 * All routes require ADMIN or CLINICIAN role.
 */

import { Router, Request, Response } from 'express';
import { requireRole } from '../middleware/authMiddleware';
import { UserRole } from '../middleware/authMiddleware';
import { deletePatientData, exportPatientData, findExpiredPatients } from '../services/dataManagementService';
import { getActiveIncidents, getRecentEvents, getSecurityMetrics, resolveIncident, SecurityEventType } from '../services/securityMonitorService';
import { recordAlertOutcome, recordMissedDetection, computeAccuracyMetrics, checkThresholds, getOutcomes } from '../services/accuracyService';

const router = Router();

// ─── Data Management ────────────────────────────────────────────────────────

/**
 * DELETE /api/v1/admin/patients/:patientId
 * Delete all patient data (HIPAA right-to-deletion).
 */
router.delete(
    '/patients/:patientId',
    requireRole(UserRole.ADMIN),
    async (req: Request, res: Response) => {
        try {
            const result = await deletePatientData({
                patientId: req.params.patientId,
                requestedBy: req.user!.userId,
                reason: req.body.reason || 'Patient request',
                retainAuditLogs: req.body.retainAuditLogs !== false, // default: retain
            });

            res.json({ success: true, result });
        } catch (error: any) {
            if (error.message?.includes('not found')) {
                res.status(404).json({ error: { code: 'PATIENT_NOT_FOUND', message: error.message } });
                return;
            }
            res.status(500).json({ error: { code: 'DELETION_FAILED', message: error.message } });
        }
    }
);

/**
 * GET /api/v1/admin/patients/:patientId/export
 * Export all patient data (data portability).
 */
router.get(
    '/patients/:patientId/export',
    requireRole(UserRole.ADMIN, UserRole.CLINICIAN),
    async (req: Request, res: Response) => {
        try {
            const format = (req.query.format as 'json' | 'fhir') || 'json';
            const result = await exportPatientData(req.params.patientId, format);
            res.json(result);
        } catch (error: any) {
            if (error.message?.includes('not found')) {
                res.status(404).json({ error: { code: 'PATIENT_NOT_FOUND', message: error.message } });
                return;
            }
            res.status(500).json({ error: { code: 'EXPORT_FAILED', message: error.message } });
        }
    }
);

/**
 * GET /api/v1/admin/retention/expired
 * List patients past retention period.
 */
router.get(
    '/retention/expired',
    requireRole(UserRole.ADMIN),
    async (_req: Request, res: Response) => {
        try {
            const expired = await findExpiredPatients();
            res.json({ patients: expired, count: expired.length });
        } catch (error: any) {
            res.status(500).json({ error: { code: 'QUERY_FAILED', message: error.message } });
        }
    }
);

// ─── Security Monitoring ────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/security/incidents
 * Get active security incidents.
 */
router.get(
    '/security/incidents',
    requireRole(UserRole.ADMIN),
    (_req: Request, res: Response) => {
        const incidents = getActiveIncidents();
        res.json({ incidents, count: incidents.length });
    }
);

/**
 * POST /api/v1/admin/security/incidents/:id/resolve
 * Resolve a security incident.
 */
router.post(
    '/security/incidents/:id/resolve',
    requireRole(UserRole.ADMIN),
    (req: Request, res: Response) => {
        const resolved = resolveIncident(req.params.id, req.body.notes);
        if (!resolved) {
            res.status(404).json({ error: { code: 'INCIDENT_NOT_FOUND' } });
            return;
        }
        res.json({ incident: resolved });
    }
);

/**
 * GET /api/v1/admin/security/events
 * Get recent security events.
 */
router.get(
    '/security/events',
    requireRole(UserRole.ADMIN),
    (req: Request, res: Response) => {
        const limit = parseInt(req.query.limit as string) || 100;
        const type = req.query.type as SecurityEventType | undefined;
        const events = getRecentEvents(limit, type);
        res.json({ events, count: events.length });
    }
);

/**
 * GET /api/v1/admin/security/metrics
 * Get security metrics summary.
 */
router.get(
    '/security/metrics',
    requireRole(UserRole.ADMIN),
    (_req: Request, res: Response) => {
        const metrics = getSecurityMetrics();
        res.json(metrics);
    }
);

// ─── Accuracy Monitoring ────────────────────────────────────────────────────

/**
 * POST /api/v1/admin/accuracy/outcomes
 * Record the outcome of an alert (clinician review).
 */
router.post(
    '/accuracy/outcomes',
    requireRole(UserRole.CLINICIAN, UserRole.ADMIN),
    (req: Request, res: Response) => {
        const { alertId, patientId, severity, outcome } = req.body;

        if (!alertId || !patientId || !outcome) {
            res.status(400).json({
                error: { code: 'INVALID_PAYLOAD', message: 'alertId, patientId, and outcome are required' },
            });
            return;
        }

        recordAlertOutcome({
            alertId,
            patientId,
            severity: severity || 'UNKNOWN',
            outcome,
            reviewedBy: req.user!.userId,
        });

        res.json({ success: true });
    }
);

/**
 * POST /api/v1/admin/accuracy/missed
 * Record a missed detection.
 */
router.post(
    '/accuracy/missed',
    requireRole(UserRole.CLINICIAN, UserRole.ADMIN),
    (req: Request, res: Response) => {
        const { patientId } = req.body;
        if (!patientId) {
            res.status(400).json({
                error: { code: 'INVALID_PAYLOAD', message: 'patientId is required' },
            });
            return;
        }

        recordMissedDetection(patientId, req.user!.userId);
        res.json({ success: true });
    }
);

/**
 * GET /api/v1/admin/accuracy/metrics
 * Get accuracy metrics for the system.
 */
router.get(
    '/accuracy/metrics',
    requireRole(UserRole.CLINICIAN, UserRole.ADMIN),
    (req: Request, res: Response) => {
        const totalAssessments = parseInt(req.query.totalAssessments as string) || undefined;
        const metrics = computeAccuracyMetrics(undefined, totalAssessments);
        const alerts = checkThresholds(metrics);
        res.json({ metrics, thresholdAlerts: alerts });
    }
);

/**
 * GET /api/v1/admin/accuracy/outcomes
 * Get recorded alert outcomes.
 */
router.get(
    '/accuracy/outcomes',
    requireRole(UserRole.CLINICIAN, UserRole.ADMIN),
    (req: Request, res: Response) => {
        const outcomes = getOutcomes({
            patientId: req.query.patientId as string,
            outcome: req.query.outcome as string,
            limit: parseInt(req.query.limit as string) || 100,
        });
        res.json({ outcomes, count: outcomes.length });
    }
);

export default router;
