/**
 * Federated Learning Routes
 *
 * POST /api/v1/federated/gradients — Submit gradients
 * GET  /api/v1/federated/model/latest — Get latest global model
 */

import { Router, Request, Response } from 'express';
import {
    submitGradient,
    getLatestModel,
    getModelByVersion,
} from '../services/federatedLearningService';
import { requireRole, UserRole } from '../middleware/authMiddleware';

const router = Router();

/**
 * POST /api/v1/federated/gradients
 * Submit encrypted gradients from a device.
 */
router.post(
    '/gradients',
    requireRole(UserRole.PATIENT, UserRole.ADMIN),
    async (req: Request, res: Response) => {
        try {
            const { deviceId, modelVersion, gradients, sampleCount } = req.body;

            if (!deviceId || !modelVersion || !gradients || !sampleCount) {
                res.status(400).json({
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Missing required fields: deviceId, modelVersion, gradients, sampleCount',
                        timestamp: new Date().toISOString(),
                    },
                });
                return;
            }

            const gradientBuffer = Buffer.from(gradients, 'base64');
            const id = await submitGradient({
                deviceId,
                modelVersion,
                gradients: gradientBuffer,
                sampleCount,
            });

            res.status(201).json({
                gradientId: id,
                message: 'Gradient submitted successfully',
                timestamp: new Date().toISOString(),
            });
        } catch (err: any) {
            if (err.message?.includes('privacy')) {
                res.status(400).json({
                    error: {
                        code: 'PRIVACY_VIOLATION',
                        message: err.message,
                        timestamp: new Date().toISOString(),
                    },
                });
                return;
            }

            console.error('Gradient submission error:', err);
            res.status(500).json({
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to submit gradient',
                    timestamp: new Date().toISOString(),
                },
            });
        }
    }
);

/**
 * GET /api/v1/federated/model/latest
 * Get the latest global model.
 */
router.get(
    '/model/latest',
    requireRole(UserRole.PATIENT, UserRole.ADMIN),
    async (_req: Request, res: Response) => {
        try {
            const model = await getLatestModel();

            if (!model) {
                res.status(404).json({
                    error: {
                        code: 'NOT_FOUND',
                        message: 'No global model available',
                        timestamp: new Date().toISOString(),
                    },
                });
                return;
            }

            res.json({
                modelVersion: model.modelVersion,
                weights: model.weights.toString('base64'),
                accuracy: model.accuracy,
                timestamp: new Date().toISOString(),
            });
        } catch (err: any) {
            console.error('Model retrieval error:', err);
            res.status(500).json({
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to retrieve model',
                    timestamp: new Date().toISOString(),
                },
            });
        }
    }
);

/**
 * GET /api/v1/federated/model/:version
 * Get a specific model version.
 */
router.get(
    '/model/:version',
    requireRole(UserRole.PATIENT, UserRole.ADMIN),
    async (req: Request, res: Response) => {
        try {
            const model = await getModelByVersion(req.params.version);

            if (!model) {
                res.status(404).json({
                    error: {
                        code: 'NOT_FOUND',
                        message: `Model version ${req.params.version} not found`,
                        timestamp: new Date().toISOString(),
                    },
                });
                return;
            }

            res.json({
                modelVersion: model.modelVersion,
                weights: model.weights.toString('base64'),
                accuracy: model.accuracy,
                timestamp: new Date().toISOString(),
            });
        } catch (err: any) {
            console.error('Model retrieval error:', err);
            res.status(500).json({
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to retrieve model',
                    timestamp: new Date().toISOString(),
                },
            });
        }
    }
);

export default router;
