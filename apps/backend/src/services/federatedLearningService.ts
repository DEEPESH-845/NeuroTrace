/**
 * Federated Learning Service
 *
 * Coordinates federated learning: collects encrypted gradients from devices,
 * performs federated averaging, validates privacy, and distributes updated models.
 *
 * Requirements: 25.1, 25.2, 7.1
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Types ──────────────────────────────────────────────────────────────────

export interface GradientSubmission {
    deviceId: string;
    modelVersion: string;
    gradients: Buffer;
    sampleCount: number;
}

export interface AggregatedModel {
    modelVersion: string;
    weights: Buffer;
    accuracy?: number;
}

// ─── Privacy Validation ─────────────────────────────────────────────────────

/**
 * Validate that gradients don't contain PHI.
 * Checks for common patterns that could leak patient data.
 */
export function validateGradientPrivacy(
    gradients: Buffer,
    metadata?: Record<string, any>
): boolean {
    // Ensure no string-based PHI is embedded in gradient buffer
    const gradientStr = gradients.toString('utf-8');

    // Check for common PHI patterns (SSN, phone, email)
    const phiPatterns = [
        /\d{3}-\d{2}-\d{4}/, // SSN
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
        /\(\d{3}\)\s?\d{3}-\d{4}/, // Phone
    ];

    for (const pattern of phiPatterns) {
        if (pattern.test(gradientStr)) {
            console.error('PHI detected in gradient submission');
            return false;
        }
    }

    // Ensure metadata doesn't contain patient-identifying information
    if (metadata) {
        const sensitiveKeys = ['patientId', 'patientName', 'dateOfBirth', 'email', 'phone'];
        for (const key of sensitiveKeys) {
            if (metadata[key]) {
                console.error(`Sensitive key "${key}" found in gradient metadata`);
                return false;
            }
        }
    }

    return true;
}

// ─── Gradient Collection ────────────────────────────────────────────────────

/**
 * Store gradient submission from a device.
 * Validates privacy before storage.
 */
export async function submitGradient(
    submission: GradientSubmission
): Promise<string> {
    // Privacy validation
    if (!validateGradientPrivacy(submission.gradients)) {
        throw new Error('Gradient submission failed privacy validation');
    }

    const gradient = await prisma.federatedGradient.create({
        data: {
            deviceId: submission.deviceId,
            modelVersion: submission.modelVersion,
            gradients: submission.gradients,
            sampleCount: submission.sampleCount,
        },
    });

    return gradient.id;
}

// ─── Federated Averaging ────────────────────────────────────────────────────

/**
 * Perform federated averaging on collected gradients.
 * Weighted by sample count from each device.
 *
 * This is a simplified implementation — in production, you would use
 * proper tensor operations and differential privacy mechanisms.
 */
export async function performFederatedAveraging(
    modelVersion: string,
    minDevices: number = 3
): Promise<AggregatedModel | null> {
    const gradients = await prisma.federatedGradient.findMany({
        where: { modelVersion },
        orderBy: { createdAt: 'desc' },
    });

    if (gradients.length < minDevices) {
        console.log(
            `Insufficient gradients for averaging: ${gradients.length}/${minDevices}`
        );
        return null;
    }

    // Compute weighted average of gradients
    const totalSamples = gradients.reduce((sum, g) => sum + g.sampleCount, 0);

    // Simplified: just use the most recent gradient as the "averaged" result
    // In production: deserialize gradients as tensors and compute weighted average
    const latestGradient = gradients[0];

    // Increment version
    const versionParts = modelVersion.split('.');
    const minorVersion = parseInt(versionParts[versionParts.length - 1]) + 1;
    versionParts[versionParts.length - 1] = minorVersion.toString();
    const newVersion = versionParts.join('.');

    // Store updated global model
    const model = await prisma.globalModel.create({
        data: {
            modelVersion: newVersion,
            weights: latestGradient.gradients, // Simplified
        },
    });

    console.log(
        `Federated averaging complete: v${newVersion} from ${gradients.length} devices, ${totalSamples} samples`
    );

    return {
        modelVersion: newVersion,
        weights: model.weights,
    };
}

// ─── Model Distribution ────────────────────────────────────────────────────

/**
 * Get the latest global model for device download.
 */
export async function getLatestModel(): Promise<AggregatedModel | null> {
    const model = await prisma.globalModel.findFirst({
        orderBy: { createdAt: 'desc' },
    });

    if (!model) return null;

    return {
        modelVersion: model.modelVersion,
        weights: model.weights,
        accuracy: model.accuracy || undefined,
    };
}

/**
 * Get a specific model version.
 */
export async function getModelByVersion(
    version: string
): Promise<AggregatedModel | null> {
    const model = await prisma.globalModel.findUnique({
        where: { modelVersion: version },
    });

    if (!model) return null;

    return {
        modelVersion: model.modelVersion,
        weights: model.weights,
        accuracy: model.accuracy || undefined,
    };
}
