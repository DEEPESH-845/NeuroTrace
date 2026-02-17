import { FederatedLearningClient } from '../FederatedLearningClient';
import { localStorageManager } from '../../database/LocalStorageManager';
import { syncManager } from '../../database/SyncManager';
import { offlineManager } from '../../database/OfflineManager';
import { FederatedModel } from '../../database/LocalStorageManager';

// Mock dependencies
jest.mock('../../database/LocalStorageManager', () => ({
    localStorageManager: {
        getLatestModel: jest.fn(),
        saveModel: jest.fn(),
        getRecentAssessments: jest.fn(),
    },
}));

jest.mock('../../database/SyncManager', () => ({
    syncManager: {
        queueForSync: jest.fn(),
    },
}));

jest.mock('../../database/OfflineManager', () => ({
    offlineManager: {
        getStatus: jest.fn().mockReturnValue({ isOnline: true }),
    },
}));

// Mock global fetch
global.fetch = jest.fn();

describe('FederatedLearningClient', () => {
    let client: FederatedLearningClient;

    const mockModel: FederatedModel = {
        version: '1.0.0',
        roundNumber: 1,
        parameters: [0.1, 0.2, 0.3], // number[]
    };

    beforeEach(() => {
        jest.clearAllMocks();
        client = new FederatedLearningClient();
        (offlineManager.getStatus as jest.Mock).mockReturnValue({ isOnline: true });
    });

    describe('initialize', () => {
        it('should be online', () => {
            expect(offlineManager.getStatus().isOnline).toBe(true);
        });

        it('should load model from storage on initialization', async () => {
            (localStorageManager.getLatestModel as jest.Mock).mockResolvedValue(mockModel);

            await client.initialize();

            expect(localStorageManager.getLatestModel).toHaveBeenCalled();
            expect(client.getModelInfo()).toEqual(mockModel);
        });

        it('should handle no stored model', async () => {
            (localStorageManager.getLatestModel as jest.Mock).mockResolvedValue(null);

            await client.initialize();

            expect(client.getModelInfo()).toBeNull();
        });
    });

    describe('checkForModelUpdates', () => {
        it('should fetch new model and save it if valid', async () => {
            const newModelParams = [0.4, 0.5, 0.6];
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    version: '1.1.0',
                    roundNumber: 2,
                    parameters: newModelParams,
                }),
            };
            (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

            await client.checkForModelUpdates();

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/federated/model/latest')
            );
            expect(localStorageManager.saveModel).toHaveBeenCalledWith(
                expect.objectContaining({
                    version: '1.1.0',
                    roundNumber: 2,
                })
            );
        });

        it('should handle fetch errors gracefully', async () => {
            (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
            await client.checkForModelUpdates();
            // Should not throw
            expect(localStorageManager.saveModel).not.toHaveBeenCalled();
        });
    });

    describe('computeGradients', () => {
        it('should return null if no model is loaded', async () => {
            // client not initialized with model
            const result = await client.computeGradients('patient-123');
            expect(result).toBeNull();
        });

        it('should compute gradients if model loaded and sufficient data', async () => {
            // Initialize with model
            (localStorageManager.getLatestModel as jest.Mock).mockResolvedValue(mockModel);
            await client.initialize();

            // Mock recent assessments
            const mockAssessments = Array(30).fill({
                assessmentId: 'assessment-1',
                metrics: {
                    reactionTimeVariability: 0.1,
                    voiceTremor: 0.2,
                    facialAsymmetry: 0.3,
                    cognitiveScore: 0.8,
                }
            });
            (localStorageManager.getRecentAssessments as jest.Mock).mockResolvedValue(mockAssessments);

            const gradients = await client.computeGradients('patient-123');

            expect(gradients).toBeDefined();
            expect(gradients?.gradients).toHaveLength(mockModel.parameters.length);
            expect(gradients?.modelVersion).toBe(mockModel.version);
        });

        it('should return null if insufficient data', async () => {
            (localStorageManager.getLatestModel as jest.Mock).mockResolvedValue(mockModel);
            await client.initialize();

            // Only 5 assessments
            (localStorageManager.getRecentAssessments as jest.Mock).mockResolvedValue(Array(5).fill({}));

            const result = await client.computeGradients('patient-123');
            expect(result).toBeNull();
        });
    });

    describe('submitGradients', () => {
        it('should queue gradients for sync', async () => {
            const gradientsPayload = {
                modelVersion: '1.0.0',
                roundNumber: 1,
                gradients: [0.01, -0.01, 0.0],
                sampleCount: 30,
                submissionId: 'submission-123',
                noiseScale: 0.1,
                computedAt: new Date().toISOString(),
            };

            await client.submitGradients(gradientsPayload);

            expect(syncManager.queueForSync).toHaveBeenCalledWith(expect.objectContaining({
                type: 'GRADIENT',
                retryCount: 0,
                data: expect.objectContaining({
                    modelVersion: gradientsPayload.modelVersion,
                    roundNumber: gradientsPayload.roundNumber,
                    // We accept other properties like noiseScale
                })
            }));
        });
    });
});
