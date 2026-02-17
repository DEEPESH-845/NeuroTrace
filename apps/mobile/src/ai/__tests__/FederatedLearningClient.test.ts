/**
 * FederatedLearningClient Tests
 *
 * Tests gradient computation, privacy validation, and submission queueing.
 */

import { FederatedLearningClient } from '../FederatedLearningClient';

// Mock dependencies
jest.mock('../../database/SyncManager', () => ({
    syncManager: {
        queueForSync: jest.fn().mockResolvedValue(undefined),
    },
}));

jest.mock('../../database/LocalStorageManager', () => ({
    localStorageManager: {
        getRecentAssessments: jest.fn().mockResolvedValue(
            Array.from({ length: 15 }, (_, i) => ({
                assessmentId: `a${i}`,
                patientId: 'p1',
                timestamp: new Date(),
                dayNumber: i + 1,
                isBaselinePeriod: false,
                speechMetrics: { articulationRate: 120 + Math.random() * 20 },
                facialMetrics: { symmetryScore: 0.8 + Math.random() * 0.1 },
                reactionMetrics: { meanReactionTime: 300 + Math.random() * 50 },
            }))
        ),
    },
}));

describe('FederatedLearningClient', () => {
    let client: FederatedLearningClient;

    beforeEach(() => {
        client = new FederatedLearningClient({
            minLocalSamples: 10,
            noiseScale: 0.1,
            maxGradientNorm: 1.0,
            participationEnabled: true,
        });
    });

    describe('receiveModel', () => {
        it('stores model information', () => {
            client.receiveModel('v1.0', 1, [0.1, 0.2, 0.3]);
            const info = client.getModelInfo();
            expect(info).not.toBeNull();
            expect(info!.version).toBe('v1.0');
            expect(info!.roundNumber).toBe(1);
            expect(info!.parameters).toEqual([0.1, 0.2, 0.3]);
        });
    });

    describe('computeGradients', () => {
        it('returns null when no model received', async () => {
            const result = await client.computeGradients('p1');
            expect(result).toBeNull();
        });

        it('computes gradients when model and data available', async () => {
            client.receiveModel('v1.0', 1, [0.1, 0.2, 0.3]);
            const result = await client.computeGradients('p1');

            expect(result).not.toBeNull();
            expect(result!.roundNumber).toBe(1);
            expect(result!.modelVersion).toBe('v1.0');
            expect(result!.sampleCount).toBe(15);
            expect(result!.gradients).toHaveLength(3);
            expect(result!.noiseScale).toBe(0.1);
        });

        it('returned gradients are finite numbers', async () => {
            client.receiveModel('v1.0', 1, [0.5, 0.5, 0.5, 0.5, 0.5]);
            const result = await client.computeGradients('p1');

            expect(result).not.toBeNull();
            for (const g of result!.gradients) {
                expect(isFinite(g)).toBe(true);
            }
        });

        it('gradient norms are clipped', async () => {
            client.receiveModel('v1.0', 1, [100, 200, 300]);
            const result = await client.computeGradients('p1');

            if (result) {
                const norm = Math.sqrt(
                    result.gradients.reduce((sum, g) => sum + g * g, 0)
                );
                // Norm should be close to or below maxGradientNorm + noise
                // With noise, it may slightly exceed, but raw norm is clipped
                expect(norm).toBeLessThan(5); // Generous bound accounting for noise
            }
        });

        it('returns null when participation is disabled', async () => {
            const disabledClient = new FederatedLearningClient({
                minLocalSamples: 10,
                noiseScale: 0.1,
                maxGradientNorm: 1.0,
                participationEnabled: false,
            });

            disabledClient.receiveModel('v1.0', 1, [0.1, 0.2, 0.3]);
            const result = await disabledClient.computeGradients('p1');
            expect(result).toBeNull();
        });
    });

    describe('submitGradients', () => {
        it('queues gradient for sync', async () => {
            const { syncManager } = require('../../database/SyncManager');

            client.receiveModel('v1.0', 1, [0.1, 0.2, 0.3]);
            const payload = await client.computeGradients('p1');
            expect(payload).not.toBeNull();

            await client.submitGradients(payload!);

            expect(syncManager.queueForSync).toHaveBeenCalledWith(
                expect.objectContaining({
                    dataType: 'federated_gradient',
                    dataId: payload!.submissionId,
                })
            );
        });
    });

    describe('isReady', () => {
        it('returns false before model received', () => {
            expect(client.isReady()).toBe(false);
        });

        it('returns true after model received', () => {
            client.receiveModel('v1.0', 1, [0.1]);
            expect(client.isReady()).toBe(true);
        });

        it('returns false when participation disabled', () => {
            const disabledClient = new FederatedLearningClient({
                minLocalSamples: 10,
                noiseScale: 0.1,
                maxGradientNorm: 1.0,
                participationEnabled: false,
            });
            disabledClient.receiveModel('v1.0', 1, [0.1]);
            expect(disabledClient.isReady()).toBe(false);
        });
    });
});
