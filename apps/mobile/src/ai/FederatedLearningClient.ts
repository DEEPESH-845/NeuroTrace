/**
 * Federated Learning Client — Mobile-side gradient computation & submission
 *
 * Computes local model gradients from on-device assessment data,
 * validates privacy constraints (no PHI leakage), and submits
 * to the backend federated learning coordinator.
 *
 * Requirements: 25.3 — Federated learning client
 */

import { syncManager } from '../database/SyncManager';
import { localStorageManager } from '../database/LocalStorageManager';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface GradientPayload {
    /** Unique identifier for this gradient submission */
    submissionId: string;
    /** Round number from the coordinator */
    roundNumber: number;
    /** Model version the gradients are computed against */
    modelVersion: string;
    /** The gradient values (flattened parameter updates) */
    gradients: number[];
    /** Number of local samples used for gradient computation */
    sampleCount: number;
    /** Noise added for differential privacy */
    noiseScale: number;
    /** Timestamp of computation */
    computedAt: string;
}

export interface FederatedConfig {
    /** Minimum local samples required before participating */
    minLocalSamples: number;
    /** Differential privacy noise scale (ε-budget) */
    noiseScale: number;
    /** Maximum gradient norm for clipping */
    maxGradientNorm: number;
    /** Whether to participate in federated learning */
    participationEnabled: boolean;
}

export interface ModelInfo {
    version: string;
    roundNumber: number;
    parameters: number[];
    receivedAt: Date;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_FEDERATED_CONFIG: FederatedConfig = {
    minLocalSamples: 10,
    noiseScale: 0.1,
    maxGradientNorm: 1.0,
    participationEnabled: true,
};

// ─── PHI Patterns ───────────────────────────────────────────────────────────

const PHI_PATTERNS = [
    /\d{3}-\d{2}-\d{4}/, // SSN
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // Email
    /\(\d{3}\)\s*\d{3}-\d{4}/, // Phone
    /\d{3}-\d{3}-\d{4}/, // Phone alt
];

// ─── FederatedLearningClient ────────────────────────────────────────────────

/**
 * Mobile-side federated learning client.
 */
export class FederatedLearningClient {
    private config: FederatedConfig;
    private currentModel: ModelInfo | null = null;
    private submissionCount: number = 0;

    constructor(config: FederatedConfig = DEFAULT_FEDERATED_CONFIG) {
        this.config = config;
    }

    /**
     * Receive a model update from the federated coordinator.
     */
    receiveModel(modelVersion: string, roundNumber: number, parameters: number[]): void {
        this.currentModel = {
            version: modelVersion,
            roundNumber,
            parameters: [...parameters],
            receivedAt: new Date(),
        };
    }

    /**
     * Compute gradients from local assessment data.
     *
     * Uses on-device data only — no raw data leaves the device.
     *
     * @param patientId - Patient whose data to use for gradient computation
     * @returns Gradient payload ready for submission, or null if not enough data
     */
    async computeGradients(patientId: string): Promise<GradientPayload | null> {
        if (!this.config.participationEnabled) {
            return null;
        }

        if (!this.currentModel) {
            console.warn('No model received yet. Cannot compute gradients.');
            return null;
        }

        // Get local assessment data
        const assessments = await localStorageManager.getRecentAssessments(patientId, 90);

        if (assessments.length < this.config.minLocalSamples) {
            console.log(
                `Not enough local samples for federated learning. ` +
                `Have ${assessments.length}, need ${this.config.minLocalSamples}.`
            );
            return null;
        }

        // Compute mock gradients from assessment metrics
        // In production, this would run a real on-device model forward/backward pass
        const rawGradients = this.computeRawGradients(assessments);

        // Apply gradient clipping
        const clippedGradients = this.clipGradients(rawGradients);

        // Add differential privacy noise
        const noisyGradients = this.addNoise(clippedGradients);

        // Validate no PHI leakage
        this.validatePrivacy(noisyGradients);

        const submissionId = `sub-${++this.submissionCount}-${Date.now()}`;

        return {
            submissionId,
            roundNumber: this.currentModel.roundNumber,
            modelVersion: this.currentModel.version,
            gradients: noisyGradients,
            sampleCount: assessments.length,
            noiseScale: this.config.noiseScale,
            computedAt: new Date().toISOString(),
        };
    }

    /**
     * Submit gradients to the backend coordinator.
     *
     * Queues for sync — works offline.
     */
    async submitGradients(payload: GradientPayload): Promise<void> {
        // Queue for sync
        await syncManager.queueForSync({
            dataType: 'federated_gradient',
            dataId: payload.submissionId,
            payload,
            timestamp: new Date(),
        });

        console.log(
            `Federated gradient ${payload.submissionId} queued for sync ` +
            `(round ${payload.roundNumber}, ${payload.sampleCount} samples).`
        );
    }

    /**
     * Compute raw gradients from assessment data.
     *
     * Simplified gradient computation — in production would use
     * actual model parameters and loss function.
     */
    private computeRawGradients(assessments: any[]): number[] {
        // Extract key metrics and compute simplified "gradients"
        // Real implementation: forward pass → loss → backward pass
        const modelParamCount = this.currentModel?.parameters.length || 10;
        const gradients = new Array(modelParamCount).fill(0);

        for (const assessment of assessments) {
            const speech = assessment.speechMetrics?.articulationRate || 0;
            const facial = assessment.facialMetrics?.symmetryScore || 0;
            const reaction = assessment.reactionMetrics?.meanReactionTime || 0;

            // Simplified gradient computation
            for (let i = 0; i < gradients.length; i++) {
                const feature = [speech, facial, reaction][i % 3];
                const param = this.currentModel?.parameters[i] || 0;
                gradients[i] += (feature - param) / assessments.length;
            }
        }

        return gradients;
    }

    /**
     * Clip gradients to maximum norm.
     */
    private clipGradients(gradients: number[]): number[] {
        const norm = Math.sqrt(
            gradients.reduce((sum, g) => sum + g * g, 0)
        );

        if (norm <= this.config.maxGradientNorm) {
            return gradients;
        }

        const scale = this.config.maxGradientNorm / norm;
        return gradients.map((g) => g * scale);
    }

    /**
     * Add Gaussian noise for differential privacy.
     */
    private addNoise(gradients: number[]): number[] {
        return gradients.map((g) => {
            // Box-Muller transform for Gaussian noise
            const u1 = Math.random();
            const u2 = Math.random();
            const noise =
                this.config.noiseScale *
                Math.sqrt(-2 * Math.log(u1)) *
                Math.cos(2 * Math.PI * u2);
            return g + noise;
        });
    }

    /**
     * Validate that gradients contain no PHI patterns.
     *
     * @throws Error if PHI detected in gradient metadata
     */
    private validatePrivacy(gradients: number[]): void {
        // Check that gradient values are just numbers
        for (const g of gradients) {
            if (!isFinite(g)) {
                throw new Error('Invalid gradient value detected (Infinity or NaN).');
            }
        }

        // Serialize and check for PHI patterns
        const serialized = JSON.stringify(gradients);
        for (const pattern of PHI_PATTERNS) {
            if (pattern.test(serialized)) {
                throw new Error('Potential PHI pattern detected in gradient data.');
            }
        }
    }

    /**
     * Get current model information.
     */
    getModelInfo(): ModelInfo | null {
        return this.currentModel;
    }

    /**
     * Check whether the client is ready to participate.
     */
    isReady(): boolean {
        return this.config.participationEnabled && this.currentModel !== null;
    }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

export const federatedClient = new FederatedLearningClient();
