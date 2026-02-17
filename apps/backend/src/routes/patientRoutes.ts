/**
 * Patient Routes
 *
 * GET  /api/v1/patients/:patientId — Get patient details
 * GET  /api/v1/patients/:patientId/baseline — Get patient baseline
 * GET  /api/v1/clinicians/:clinicianId/patients — List clinician's patients
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireRole, requirePatientAccess, UserRole } from '../middleware/authMiddleware';
import { auditMiddleware } from '../services/auditService';

const prisma = new PrismaClient();
const router = Router();

/**
 * GET /api/v1/patients/:patientId
 * Get patient details.
 */
router.get(
    '/:patientId',
    requireRole(UserRole.PATIENT, UserRole.CAREGIVER, UserRole.CLINICIAN, UserRole.ADMIN),
    requirePatientAccess(),
    auditMiddleware('PATIENT'),
    async (req: Request, res: Response) => {
        try {
            const patient = await prisma.patient.findUnique({
                where: { id: req.params.patientId },
                include: {
                    baseline: true,
                    caregivers: {
                        select: {
                            id: true,
                            name: true,
                            relationship: true,
                            linkedAt: true,
                        },
                    },
                },
            });

            if (!patient) {
                res.status(404).json({
                    error: {
                        code: 'NOT_FOUND',
                        message: 'Patient not found',
                        timestamp: new Date().toISOString(),
                    },
                });
                return;
            }

            res.json({ data: patient, timestamp: new Date().toISOString() });
        } catch (err: any) {
            console.error('Patient get error:', err);
            res.status(500).json({
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to retrieve patient',
                    timestamp: new Date().toISOString(),
                },
            });
        }
    }
);

/**
 * GET /api/v1/patients/:patientId/baseline
 * Get patient's established baseline.
 */
router.get(
    '/:patientId/baseline',
    requireRole(UserRole.PATIENT, UserRole.CAREGIVER, UserRole.CLINICIAN, UserRole.ADMIN),
    requirePatientAccess(),
    auditMiddleware('BASELINE'),
    async (req: Request, res: Response) => {
        try {
            const baseline = await prisma.baseline.findUnique({
                where: { patientId: req.params.patientId },
            });

            if (!baseline) {
                res.status(404).json({
                    error: {
                        code: 'NOT_FOUND',
                        message: 'Baseline not yet established for this patient',
                        timestamp: new Date().toISOString(),
                    },
                });
                return;
            }

            res.json({ data: baseline, timestamp: new Date().toISOString() });
        } catch (err: any) {
            console.error('Baseline get error:', err);
            res.status(500).json({
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to retrieve baseline',
                    timestamp: new Date().toISOString(),
                },
            });
        }
    }
);

/**
 * GET /api/v1/clinicians/:clinicianId/patients
 * List all patients assigned to a clinician.
 */
router.get(
    '/clinicians/:clinicianId/patients',
    requireRole(UserRole.CLINICIAN, UserRole.ADMIN),
    auditMiddleware('PATIENT'),
    async (req: Request, res: Response) => {
        try {
            const { clinicianId } = req.params;
            const { limit, offset } = req.query;

            const patients = await prisma.patient.findMany({
                where: { assignedClinician: clinicianId },
                include: {
                    baseline: true,
                    alerts: {
                        where: { status: 'ACTIVE' },
                        orderBy: { createdAt: 'desc' },
                        take: 5,
                    },
                    _count: {
                        select: { assessments: true, alerts: true },
                    },
                },
                orderBy: { enrollmentDate: 'desc' },
                take: limit ? parseInt(limit as string) : 50,
                skip: offset ? parseInt(offset as string) : 0,
            });

            res.json({
                data: patients,
                count: patients.length,
                timestamp: new Date().toISOString(),
            });
        } catch (err: any) {
            console.error('Clinician patients error:', err);
            res.status(500).json({
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to retrieve patients',
                    timestamp: new Date().toISOString(),
                },
            });
        }
    }
);

export default router;
