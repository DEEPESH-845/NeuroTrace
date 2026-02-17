/**
 * FHIR Routes
 *
 * GET  /fhir/Patient/:patientId — Get patient as FHIR resource
 * GET  /fhir/Bundle/:patientId — Get full FHIR bundle for patient
 */

import { Router, Request, Response } from 'express';
import { exportPatientBundle } from '../services/fhirService';
import { requireRole, UserRole } from '../middleware/authMiddleware';
import { auditMiddleware, logDataExport } from '../services/auditService';

const router = Router();

/**
 * GET /fhir/Bundle/:patientId
 * Export all patient data as a FHIR Bundle.
 */
router.get(
    '/Bundle/:patientId',
    requireRole(UserRole.CLINICIAN, UserRole.ADMIN),
    auditMiddleware('FHIR_EXPORT'),
    async (req: Request, res: Response) => {
        try {
            const bundle = await exportPatientBundle(req.params.patientId);

            // Log the data export for HIPAA compliance
            await logDataExport(
                req.user!.userId,
                req.params.patientId,
                'FHIR_BUNDLE',
                req.ip || 'unknown'
            );

            res.json(bundle);
        } catch (err: any) {
            if (err.message?.includes('not found')) {
                res.status(404).json({
                    error: {
                        code: 'NOT_FOUND',
                        message: err.message,
                        timestamp: new Date().toISOString(),
                    },
                });
                return;
            }

            console.error('FHIR export error:', err);
            res.status(500).json({
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to export FHIR bundle',
                    timestamp: new Date().toISOString(),
                },
            });
        }
    }
);

export default router;
