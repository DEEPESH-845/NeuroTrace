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
import { localStorageManager, FederatedModel } from '../database/LocalStorageManager';
import { offlineManager } from '../database/OfflineManager';

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
    /** Model update check interval */
    updateCheckIntervalMs: number;
    /** Backend FL coordinator URL */
    serverUrl: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_FEDERATED_CONFIG: FederatedConfig = {
    minLocalSamples: 10,
    noiseScale: 0.1,
    maxGradientNorm: 1.0,
    participationEnabled: true,
    updateCheckIntervalMs: 24 * 60 * 60 * 1000, // 24 hours
    serverUrl: 'https://api.neurotrace.com/v1/federated',
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
    private currentModel: FederatedModel | null = null;
    private submissionCount: number = 0;
    private initialized: boolean = false;

    constructor(config: FederatedConfig = DEFAULT_FEDERATED_CONFIG) {
        this.config = config;
    }

    /**
     * Initialize client by loading latest model from storage
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            this.currentModel = await localStorageManager.getLatestModel();
            console.log('FederatedLearningClient initialized. Model version:', this.currentModel?.version || 'none');
            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize FederatedLearningClient:', error);
        }
    }

    /**
     * Check for model updates from the server
     * 
     * @returns True if a new model was downloaded
     */
    async checkForModelUpdates(): Promise<void> {
        // Only check if online
        const status = offlineManager.getStatus();
        if (!status.isOnline) {
            return;
        }
        if (!this.config.participationEnabled) return;

        try {
            const response = await fetch(`${this.config.serverUrl}/model/latest`);
            if (!response.ok) {
                throw new Error(`Failed to fetch model: ${response.statusText}`);
            }

            const data = await response.json();

            // Check if model is new
            if (data.version !== this.currentModel?.version) {
                // Download new model
                const model: FederatedModel = {
                    version: data.version,
                    roundNumber: data.roundNumber,
                    parameters: data.parameters,
                    receivedAt: new Date().toISOString(),
                };

                await localStorageManager.saveModel(model);
                this.currentModel = model;
                console.log(`Downloaded new model version: ${model.version}`);
            }
        } catch (error) {
            console.error('Failed to check for model updates:', error);
        }
    }

    /**
     * Receive a model update from the federated coordinator.
     * Use this if pushing updates via socket/push notification.
     */
    async receiveModel(modelVersion: string, roundNumber: number, parameters: number[]): Promise<void> {
        const model: FederatedModel = {
            version: modelVersion,
            roundNumber,
            parameters: [...parameters],
            createdAt: new Date(),
        };

        await localStorageManager.saveModel(model);
        this.currentModel = model;
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
        // Create sync payload
        const syncPayload: any = {
            id: payload.submissionId,
            type: 'GRADIENT',
            data: payload,
            timestamp: new Date(),
            retryCount: 0,
        };

        // Queue for synchronization
        await syncManager.queueForSync(syncPayload);

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
    getModelInfo(): FederatedModel | null {
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
