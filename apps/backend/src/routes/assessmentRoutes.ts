/**
 * Assessment Routes
 *
 * POST /api/v1/assessments — Ingest assessment from mobile device
 * GET  /api/v1/patients/:patientId/assessments — List patient assessments
 */

import { Router, Request, Response } from 'express';
import {
    validateAssessmentPayload,
    ingestAssessment,
    getPatientAssessments,
} from '../services/assessmentService';
import { requireRole, requirePatientAccess, UserRole } from '../middleware/authMiddleware';
import { auditMiddleware } from '../services/auditService';

const router = Router();

/**
 * POST /api/v1/assessments
 * Ingest a new assessment result from a mobile device.
 */
router.post(
    '/',
    requireRole(UserRole.PATIENT, UserRole.CLINICIAN, UserRole.ADMIN),
    auditMiddleware('ASSESSMENT'),
    async (req: Request, res: Response) => {
        try {
            const validation = validateAssessmentPayload(req.body);

            if (!validation.valid) {
                res.status(400).json({
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid assessment payload',
                        details: (validation as any).errors,
                        timestamp: new Date().toISOString(),
                    },
                });
                return;
            }

            const assessmentId = await ingestAssessment(req.body);

            res.status(201).json({
                assessmentId,
                message: 'Assessment ingested successfully',
                timestamp: new Date().toISOString(),
            });
        } catch (err: any) {
            if (err.message?.includes('not found')) {
                res.status(404).json({
                    error: {
                        code: 'PATIENT_NOT_FOUND',
                        message: err.message,
                        timestamp: new Date().toISOString(),
                    },
                });
                return;
            }

            console.error('Assessment ingestion error:', err);
            res.status(500).json({
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to ingest assessment',
                    timestamp: new Date().toISOString(),
                },
            });
        }
    }
);

/**
 * GET /api/v1/patients/:patientId/assessments
 * List assessments for a patient.
 */
router.get(
    '/patients/:patientId/assessments',
    requireRole(UserRole.PATIENT, UserRole.CAREGIVER, UserRole.CLINICIAN, UserRole.ADMIN),
    requirePatientAccess(),
    auditMiddleware('ASSESSMENT'),
    async (req: Request, res: Response) => {
        try {
            const { patientId } = req.params;
            const { startDate, endDate, limit, offset } = req.query;

            const assessments = await getPatientAssessments(patientId, {
                startDate: startDate ? new Date(startDate as string) : undefined,
                endDate: endDate ? new Date(endDate as string) : undefined,
                limit: limit ? parseInt(limit as string) : undefined,
                offset: offset ? parseInt(offset as string) : undefined,
            });

            res.json({
                data: assessments,
                count: assessments.length,
                timestamp: new Date().toISOString(),
            });
        } catch (err: any) {
            console.error('Assessment list error:', err);
            res.status(500).json({
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to retrieve assessments',
                    timestamp: new Date().toISOString(),
                },
            });
        }
    }
);

export default router;
