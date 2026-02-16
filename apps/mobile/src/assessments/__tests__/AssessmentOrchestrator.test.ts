/**
 * Tests for AssessmentOrchestrator
 * 
 * Tests cover:
 * - Session creation and management
 * - Voice task execution with audio recording
 * - Facial task execution with camera capture
 * - Reaction task execution
 * - Assessment completion and aggregation
 * - Completion time tracking (≤60 seconds)
 * - Raw biometric data deletion (≤5 seconds retention)
 */

import {
  AssessmentOrchestrator,
  InvalidSessionError,
  AssessmentExecutionError,
} from '../AssessmentOrchestrator';
import {
  AssessmentSession,
  SpeechMetrics,
  FacialMetrics,
  ReactionMetrics,
} from '@neurotrace/types';
import { ISpeechBiomarkerExtractor } from '../../ai/SpeechBiomarkerExtractor';
import { IFacialAsymmetryDetector } from '../../ai/FacialAsymmetryDetector';
import { localStorageManager } from '../../database/LocalStorageManager';

// Mock dependencies
jest.mock('../../database/LocalStorageManager');
jest.mock('onnxruntime-react-native');
jest.mock('react-native-quick-sqlite');
jest.mock('@mediapipe/tasks-vision', () => ({
  FaceLandmarker: {
    createFromOptions: jest.fn(),
  },
  FilesetResolver: {
    forVisionTasks: jest.fn(),
  },
}));
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

describe('AssessmentOrchestrator', () => {
  let orchestrator: AssessmentOrchestrator;
  let mockSpeechExtractor: jest.Mocked<ISpeechBiomarkerExtractor>;
  let mockFacialDetector: jest.Mocked<IFacialAsymmetryDetector>;

  const mockSpeechMetrics: SpeechMetrics = {
    articulationRate: 150,
    meanPauseDuration: 200,
    pauseFrequency: 5,
    phoneticPrecision: 0.85,
    voiceQuality: 0.9,
    timestamp: new Date(),
  };

  const mockFacialMetrics: FacialMetrics = {
    symmetryScore: 0.92,
    leftEyeOpenness: 0.8,
    rightEyeOpenness: 0.82,
    mouthSymmetry: 0.88,
    eyebrowSymmetry: 0.9,
    timestamp: new Date(),
  };

  const mockReactionMetrics: ReactionMetrics = {
    meanReactionTime: 350,
    reactionTimeVariability: 50,
    correctResponses: 9,
    totalTrials: 10,
    timestamp: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock speech extractor
    mockSpeechExtractor = {
      extractBiomarkers: jest.fn().mockResolvedValue(mockSpeechMetrics),
      computeArticulationRate: jest.fn(),
      detectPauseDuration: jest.fn(),
      analyzePhoneticPrecision: jest.fn(),
    };

    // Create mock facial detector
    mockFacialDetector = {
      initialize: jest.fn().mockResolvedValue(undefined),
      detectAsymmetry: jest.fn().mockResolvedValue(mockFacialMetrics),
      extractFacialLandmarks: jest.fn(),
      computeSymmetryScore: jest.fn(),
      dispose: jest.fn(),
    };

    // Mock local storage manager
    (localStorageManager.saveAssessment as jest.Mock) = jest.fn().mockResolvedValue(undefined);
    (localStorageManager.getRecentAssessments as jest.Mock) = jest.fn().mockResolvedValue([]);

    // Create orchestrator with mocks
    orchestrator = new AssessmentOrchestrator(mockSpeechExtractor, mockFacialDetector);
  });

  afterEach(() => {
    orchestrator.dispose();
  });

  describe('startAssessment', () => {
    it('should create a new assessment session', async () => {
      const patientId = 'patient-123';
      const session = await orchestrator.startAssessment(patientId);

      expect(session).toBeDefined();
      expect(session.sessionId).toBeDefined();
      expect(session.patientId).toBe(patientId);
      expect(session.startTime).toBeInstanceOf(Date);
      expect(session.status).toBe('IN_PROGRESS');
    });

    it('should generate unique session IDs', async () => {
      const session1 = await orchestrator.startAssessment('patient-1');
      const session2 = await orchestrator.startAssessment('patient-2');

      expect(session1.sessionId).not.toBe(session2.sessionId);
    });
  });

  describe('executeVoiceTask', () => {
    let session: AssessmentSession;
    let audioBuffer: Float32Array;

    beforeEach(async () => {
      session = await orchestrator.startAssessment('patient-123');
      audioBuffer = new Float32Array(16000); // 1 second of audio at 16kHz
      // Fill with some sample data
      for (let i = 0; i < audioBuffer.length; i++) {
        audioBuffer[i] = Math.sin(2 * Math.PI * 440 * i / 16000); // 440 Hz sine wave
      }
    });

    it('should execute voice task and return speech metrics', async () => {
      const metrics = await orchestrator.executeVoiceTask(session, audioBuffer);

      expect(metrics).toEqual(mockSpeechMetrics);
      expect(mockSpeechExtractor.extractBiomarkers).toHaveBeenCalledWith(audioBuffer);
    });

    it('should throw error for invalid session', async () => {
      const invalidSession: AssessmentSession = {
        sessionId: 'invalid-session',
        patientId: 'patient-123',
        startTime: new Date(),
        status: 'IN_PROGRESS',
      };

      await expect(orchestrator.executeVoiceTask(invalidSession, audioBuffer)).rejects.toThrow(
        InvalidSessionError
      );
    });

    it('should throw error if session is not in progress', async () => {
      session.status = 'COMPLETED';

      await expect(orchestrator.executeVoiceTask(session, audioBuffer)).rejects.toThrow(
        InvalidSessionError
      );
    });

    it('should schedule raw audio data cleanup after 5 seconds', async () => {
      jest.useFakeTimers();

      // Create audio buffer with non-zero values
      const audioBuffer = new Float32Array(100);
      for (let i = 0; i < audioBuffer.length; i++) {
        audioBuffer[i] = Math.sin(i) + 1; // Add 1 to ensure all values are non-zero
      }

      // Verify buffer has non-zero values
      expect(audioBuffer[0]).not.toBe(0);

      await orchestrator.executeVoiceTask(session, audioBuffer);

      // Audio buffer should still have data immediately
      expect(audioBuffer[0]).not.toBe(0);

      // Fast-forward 5 seconds
      jest.advanceTimersByTime(5000);

      // Audio buffer should be cleared (filled with zeros)
      expect(audioBuffer.every(sample => sample === 0)).toBe(true);

      jest.useRealTimers();
    });

    it('should wrap extraction errors in AssessmentExecutionError', async () => {
      const error = new Error('Extraction failed');
      mockSpeechExtractor.extractBiomarkers.mockRejectedValue(error);

      await expect(orchestrator.executeVoiceTask(session, audioBuffer)).rejects.toThrow(
        AssessmentExecutionError
      );
    });
  });

  describe('executeFacialTask', () => {
    let session: AssessmentSession;
    let imageData: ImageData;

    beforeEach(async () => {
      session = await orchestrator.startAssessment('patient-123');
      imageData = {
        width: 640,
        height: 480,
        data: new Uint8Array(640 * 480 * 4), // RGBA image data
      } as unknown as ImageData;
    });

    it('should execute facial task and return facial metrics', async () => {
      const metrics = await orchestrator.executeFacialTask(session, imageData);

      expect(metrics).toEqual(mockFacialMetrics);
      expect(mockFacialDetector.detectAsymmetry).toHaveBeenCalledWith(imageData);
    });

    it('should throw error for invalid session', async () => {
      const invalidSession: AssessmentSession = {
        sessionId: 'invalid-session',
        patientId: 'patient-123',
        startTime: new Date(),
        status: 'IN_PROGRESS',
      };

      await expect(orchestrator.executeFacialTask(invalidSession, imageData)).rejects.toThrow(
        InvalidSessionError
      );
    });

    it('should schedule raw image data cleanup after 5 seconds', async () => {
      jest.useFakeTimers();

      await orchestrator.executeFacialTask(session, imageData);

      // Image data should still exist immediately
      expect(imageData.width).toBe(640);

      // Fast-forward 5 seconds
      jest.advanceTimersByTime(5000);

      // Image data properties should be deleted
      expect(imageData.width).toBeUndefined();
      expect(imageData.height).toBeUndefined();
      expect(imageData.data).toBeUndefined();

      jest.useRealTimers();
    });

    it('should wrap detection errors in AssessmentExecutionError', async () => {
      const error = new Error('Detection failed');
      mockFacialDetector.detectAsymmetry.mockRejectedValue(error);

      await expect(orchestrator.executeFacialTask(session, imageData)).rejects.toThrow(
        AssessmentExecutionError
      );
    });
  });

  describe('executeReactionTask', () => {
    let session: AssessmentSession;

    beforeEach(async () => {
      session = await orchestrator.startAssessment('patient-123');
    });

    it('should execute reaction task and return reaction metrics', async () => {
      const metrics = await orchestrator.executeReactionTask(session, mockReactionMetrics);

      expect(metrics).toEqual(mockReactionMetrics);
    });

    it('should throw error for invalid session', async () => {
      const invalidSession: AssessmentSession = {
        sessionId: 'invalid-session',
        patientId: 'patient-123',
        startTime: new Date(),
        status: 'IN_PROGRESS',
      };

      await expect(orchestrator.executeReactionTask(invalidSession, mockReactionMetrics)).rejects.toThrow(
        InvalidSessionError
      );
    });
  });

  describe('completeAssessment', () => {
    let session: AssessmentSession;

    beforeEach(async () => {
      session = await orchestrator.startAssessment('patient-123');
    });

    it('should complete assessment and return assessment result', async () => {
      // Add a small delay to ensure completion time > 0
      await new Promise(resolve => setTimeout(resolve, 10));

      const result = await orchestrator.completeAssessment(
        session,
        mockSpeechMetrics,
        mockFacialMetrics,
        mockReactionMetrics
      );

      expect(result).toBeDefined();
      expect(result.assessmentId).toBeDefined();
      expect(result.patientId).toBe('patient-123');
      expect(result.speechMetrics).toEqual(mockSpeechMetrics);
      expect(result.facialMetrics).toEqual(mockFacialMetrics);
      expect(result.reactionMetrics).toEqual(mockReactionMetrics);
      expect(result.completionTime).toBeGreaterThanOrEqual(0);
      expect(result.deviceInfo).toBeDefined();
      expect(result.deviceInfo.platform).toBe('ios');
    });

    it('should save assessment to local storage', async () => {
      await orchestrator.completeAssessment(
        session,
        mockSpeechMetrics,
        mockFacialMetrics,
        mockReactionMetrics
      );

      expect(localStorageManager.saveAssessment).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: 'patient-123',
          speechMetrics: mockSpeechMetrics,
          facialMetrics: mockFacialMetrics,
          reactionMetrics: mockReactionMetrics,
        })
      );
    });

    it('should track completion time', async () => {
      // Wait 2 seconds before completing
      await new Promise(resolve => setTimeout(resolve, 2000));

      const result = await orchestrator.completeAssessment(
        session,
        mockSpeechMetrics,
        mockFacialMetrics,
        mockReactionMetrics
      );

      expect(result.completionTime).toBeGreaterThanOrEqual(2);
      expect(result.completionTime).toBeLessThan(3);
    });

    it('should warn if completion time exceeds 60 seconds', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Manually set start time to 61 seconds ago
      const startTime = Date.now() - 61000;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (orchestrator as any).sessionStartTimes.set(session.sessionId, startTime);

      await orchestrator.completeAssessment(
        session,
        mockSpeechMetrics,
        mockFacialMetrics,
        mockReactionMetrics
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('exceeds 60s target')
      );

      consoleSpy.mockRestore();
    });

    it('should determine day number from previous assessments', async () => {
      // Mock 3 previous assessments
      (localStorageManager.getRecentAssessments as jest.Mock).mockResolvedValue([
        { dayNumber: 1 },
        { dayNumber: 2 },
        { dayNumber: 3 },
      ]);

      const result = await orchestrator.completeAssessment(
        session,
        mockSpeechMetrics,
        mockFacialMetrics,
        mockReactionMetrics
      );

      expect(result.dayNumber).toBe(4);
    });

    it('should mark assessment as baseline period for first 7 days', async () => {
      // Mock 5 previous assessments (day 6)
      (localStorageManager.getRecentAssessments as jest.Mock).mockResolvedValue(
        Array(5).fill({ dayNumber: 1 })
      );

      const result = await orchestrator.completeAssessment(
        session,
        mockSpeechMetrics,
        mockFacialMetrics,
        mockReactionMetrics
      );

      expect(result.dayNumber).toBe(6);
      expect(result.isBaselinePeriod).toBe(true);
    });

    it('should not mark assessment as baseline period after day 7', async () => {
      // Mock 7 previous assessments (day 8)
      (localStorageManager.getRecentAssessments as jest.Mock).mockResolvedValue(
        Array(7).fill({ dayNumber: 1 })
      );

      const result = await orchestrator.completeAssessment(
        session,
        mockSpeechMetrics,
        mockFacialMetrics,
        mockReactionMetrics
      );

      expect(result.dayNumber).toBe(8);
      expect(result.isBaselinePeriod).toBe(false);
    });

    it('should update session status to COMPLETED', async () => {
      await orchestrator.completeAssessment(
        session,
        mockSpeechMetrics,
        mockFacialMetrics,
        mockReactionMetrics
      );

      expect(session.status).toBe('COMPLETED');
    });

    it('should throw error for invalid session', async () => {
      const invalidSession: AssessmentSession = {
        sessionId: 'invalid-session',
        patientId: 'patient-123',
        startTime: new Date(),
        status: 'IN_PROGRESS',
      };

      await expect(
        orchestrator.completeAssessment(
          invalidSession,
          mockSpeechMetrics,
          mockFacialMetrics,
          mockReactionMetrics
        )
      ).rejects.toThrow(InvalidSessionError);
    });

    it('should mark session as FAILED on error', async () => {
      (localStorageManager.saveAssessment as jest.Mock).mockRejectedValue(
        new Error('Storage error')
      );

      await expect(
        orchestrator.completeAssessment(
          session,
          mockSpeechMetrics,
          mockFacialMetrics,
          mockReactionMetrics
        )
      ).rejects.toThrow(AssessmentExecutionError);

      expect(session.status).toBe('FAILED');
    });
  });

  describe('Full assessment flow', () => {
    it('should execute complete assessment flow', async () => {
      // Start assessment
      const session = await orchestrator.startAssessment('patient-123');
      expect(session.status).toBe('IN_PROGRESS');

      // Execute voice task
      const audioBuffer = new Float32Array(16000);
      const speechMetrics = await orchestrator.executeVoiceTask(session, audioBuffer);
      expect(speechMetrics).toEqual(mockSpeechMetrics);

      // Execute facial task
      const imageData = { width: 640, height: 480, data: new Uint8Array(640 * 480 * 4) } as unknown as ImageData;
      const facialMetrics = await orchestrator.executeFacialTask(session, imageData);
      expect(facialMetrics).toEqual(mockFacialMetrics);

      // Execute reaction task
      const reactionMetrics = await orchestrator.executeReactionTask(session, mockReactionMetrics);
      expect(reactionMetrics).toEqual(mockReactionMetrics);

      // Complete assessment
      const result = await orchestrator.completeAssessment(
        session,
        speechMetrics,
        facialMetrics,
        reactionMetrics
      );

      expect(result).toBeDefined();
      expect(result.assessmentId).toBeDefined();
      expect(result.patientId).toBe('patient-123');
      expect(result.speechMetrics).toEqual(speechMetrics);
      expect(result.facialMetrics).toEqual(facialMetrics);
      expect(result.reactionMetrics).toEqual(reactionMetrics);
      expect(session.status).toBe('COMPLETED');
    });
  });

  describe('dispose', () => {
    it('should cleanup resources', () => {
      orchestrator.dispose();

      expect(mockFacialDetector.dispose).toHaveBeenCalled();
    });

    it('should clear all active sessions', async () => {
      const session = await orchestrator.startAssessment('patient-123');

      orchestrator.dispose();

      // Session should no longer be valid
      const audioBuffer = new Float32Array(16000);
      await expect(orchestrator.executeVoiceTask(session, audioBuffer)).rejects.toThrow(
        InvalidSessionError
      );
    });
  });
});
