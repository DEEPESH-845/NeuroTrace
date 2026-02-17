import { DeviationAnalysisService } from '../DeviationAnalysisService';
import { localStorageManager } from '../../database/LocalStorageManager';
import { AssessmentResult, Baseline, Deviation, TrendAnalysis } from '@neurotrace/types';

// Mock localStorageManager
jest.mock('../../database/LocalStorageManager', () => ({
    localStorageManager: {
        getBaseline: jest.fn(),
        getRecentAssessments: jest.fn(),
    },
}));

describe('DeviationAnalysisService', () => {
    let service: DeviationAnalysisService;
    const mockDate = new Date('2025-01-01T12:00:00Z');

    const mockBaseline: Baseline = {
        patientId: 'p1',
        createdAt: new Date('2024-01-01'),
        assessmentCount: 10,
        speechMetrics: { mean: 100, standardDeviation: 10, min: 80, max: 120 },
        facialMetrics: { mean: 90, standardDeviation: 5, min: 80, max: 100 },
        reactionMetrics: { mean: 300, standardDeviation: 30, min: 250, max: 400 },
    };

    const mockAssessment: AssessmentResult = {
        assessmentId: 'a1',
        patientId: 'p1',
        timestamp: mockDate,
        dayNumber: 15,
        isBaselinePeriod: false,
        speechMetrics: { articulationRate: 100, meanPauseDuration: 0.5, pauseFrequency: 2, phoneticPrecision: 0.9, voiceQuality: 0.9, timestamp: mockDate },
        facialMetrics: { symmetryScore: 90, leftEyeOpenness: 0.9, rightEyeOpenness: 0.9, mouthSymmetry: 0.9, eyebrowSymmetry: 0.9, timestamp: mockDate },
        reactionMetrics: { meanReactionTime: 300, reactionTimeVariability: 20, correctResponses: 10, totalTrials: 10, timestamp: mockDate },
        completionTime: 45,
        deviceInfo: { deviceId: 'd1', platform: 'ios', appVersion: '1.0', modelVersion: '1.0' },
    };

    beforeEach(() => {
        jest.clearAllMocks();
        service = new DeviationAnalysisService();
    });

    it('should return empty result if no baseline found', async () => {
        (localStorageManager.getBaseline as jest.Mock).mockResolvedValue(null);

        const result = await service.analyze(mockAssessment);

        expect(result).toEqual({ deviations: [], trend: null });
        expect(localStorageManager.getBaseline).toHaveBeenCalledWith('p1');
    });

    it('should detect deviation when metric exceeds threshold (speech)', async () => {
        (localStorageManager.getBaseline as jest.Mock).mockResolvedValue(mockBaseline);
        (localStorageManager.getRecentAssessments as jest.Mock).mockResolvedValue([]);

        // Create assessment with significant drop in articulation rate (mean 100, std 10 -> 70 is 3 std dev down)
        const deviantAssessment = {
            ...mockAssessment,
            speechMetrics: { ...mockAssessment.speechMetrics, articulationRate: 70 }, // 3 SD drop
        };

        const result = await service.analyze(deviantAssessment);

        expect(result.deviations).toHaveLength(1);
        expect(result.deviations[0].metricName).toBe('speech');
        expect(result.deviations[0].standardDeviations).toBe(3);
        expect(result.trend).toBeNull();
    });

    it('should detect facial deviation (symmetry drop)', async () => {
        (localStorageManager.getBaseline as jest.Mock).mockResolvedValue(mockBaseline);
        (localStorageManager.getRecentAssessments as jest.Mock).mockResolvedValue([]);

        // Facial symmetry drop (mean 90, std 5 -> 75 is 3 std dev down)
        const deviantAssessment = {
            ...mockAssessment,
            facialMetrics: { ...mockAssessment.facialMetrics, symmetryScore: 75 },
        };

        const result = await service.analyze(deviantAssessment);

        expect(result.deviations).toHaveLength(1);
        expect(result.deviations[0].metricName).toBe('facial');
    });

    it('should detect reaction time deviation (increase = bad)', async () => {
        (localStorageManager.getBaseline as jest.Mock).mockResolvedValue(mockBaseline);
        (localStorageManager.getRecentAssessments as jest.Mock).mockResolvedValue([]);

        // Reaction time increase (mean 300, std 30 -> 390 is 3 std dev up)
        const deviantAssessment = {
            ...mockAssessment,
            reactionMetrics: { ...mockAssessment.reactionMetrics, meanReactionTime: 390 },
        };

        const result = await service.analyze(deviantAssessment);

        expect(result.deviations).toHaveLength(1);
        expect(result.deviations[0].metricName).toBe('reaction');
    });

    it('should detect trends across multiple days', async () => {
        (localStorageManager.getBaseline as jest.Mock).mockResolvedValue(mockBaseline);

        // History: Days 13, 14 both deviating
        const history = [
            {
                ...mockAssessment,
                assessmentId: 'prev1',
                dayNumber: 13,
                speechMetrics: { ...mockAssessment.speechMetrics, articulationRate: 70 }, // Dev
            },
            {
                ...mockAssessment,
                assessmentId: 'prev2',
                dayNumber: 14,
                speechMetrics: { ...mockAssessment.speechMetrics, articulationRate: 70 }, // Dev
            },
        ];
        (localStorageManager.getRecentAssessments as jest.Mock).mockResolvedValue(history);

        // Current: Day 15 deviating
        const current = {
            ...mockAssessment,
            dayNumber: 15,
            speechMetrics: { ...mockAssessment.speechMetrics, articulationRate: 70 }, // Dev
        };

        const result = await service.analyze(current);

        expect(result.deviations).toHaveLength(1); // Current has deviation
        expect(result.trend).not.toBeNull();
        expect(result.trend?.sustainedDeviations.length).toBeGreaterThanOrEqual(3);
        expect(result.trend?.consecutiveDays).toBe(3);
    });
});
