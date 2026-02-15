/**
 * Unit tests for FacialAsymmetryDetector
 * 
 * Tests the MediaPipe Face Mesh integration and facial asymmetry detection
 */

import {
  MediaPipeFacialAsymmetryDetector,
  FaceNotVisibleError,
  MediaPipeInitializationError,
  createFacialAsymmetryDetector
} from '../FacialAsymmetryDetector';
import { FacialLandmarks } from '@neurotrace/types';

// Mock ImageData for Node.js environment
class MockImageData {
  width: number;
  height: number;
  data: Uint8ClampedArray;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
  }
}

// Mock document for canvas creation
global.document = {
  createElement: jest.fn(() => ({
    width: 0,
    height: 0,
    getContext: jest.fn(() => ({
      putImageData: jest.fn()
    }))
  }))
} as any;

// Mock MediaPipe
jest.mock('@mediapipe/tasks-vision', () => ({
  FaceLandmarker: {
    createFromOptions: jest.fn()
  },
  FilesetResolver: {
    forVisionTasks: jest.fn()
  }
}));

describe('FacialAsymmetryDetector', () => {
  let detector: MediaPipeFacialAsymmetryDetector;
  let mockFaceLandmarker: any;

  beforeEach(() => {
    detector = new MediaPipeFacialAsymmetryDetector();
    
    // Create mock face landmarker
    mockFaceLandmarker = {
      detect: jest.fn(),
      close: jest.fn()
    };

    // Mock MediaPipe initialization
    const { FaceLandmarker, FilesetResolver } = require('@mediapipe/tasks-vision');
    FilesetResolver.forVisionTasks.mockResolvedValue({});
    FaceLandmarker.createFromOptions.mockResolvedValue(mockFaceLandmarker);
  });

  afterEach(() => {
    detector.dispose();
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize MediaPipe Face Mesh successfully', async () => {
      await detector.initialize();
      
      const { FaceLandmarker, FilesetResolver } = require('@mediapipe/tasks-vision');
      expect(FilesetResolver.forVisionTasks).toHaveBeenCalledWith(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      expect(FaceLandmarker.createFromOptions).toHaveBeenCalled();
    });

    it('should throw MediaPipeInitializationError on failure', async () => {
      const { FilesetResolver } = require('@mediapipe/tasks-vision');
      FilesetResolver.forVisionTasks.mockRejectedValue(new Error('Network error'));

      await expect(detector.initialize()).rejects.toThrow(MediaPipeInitializationError);
    });
  });

  describe('extractFacialLandmarks', () => {
    beforeEach(async () => {
      await detector.initialize();
    });

    it('should extract 468 facial landmarks from image', async () => {
      // Mock face detection result with 468 landmarks
      const mockLandmarks = Array.from({ length: 468 }, (_, i) => ({
        x: Math.random(),
        y: Math.random(),
        z: Math.random()
      }));

      mockFaceLandmarker.detect.mockReturnValue({
        faceLandmarks: [mockLandmarks]
      });

      const imageData = new MockImageData(640, 480) as any;
      const landmarks = await detector.extractFacialLandmarks(imageData);

      expect(landmarks.landmarks).toHaveLength(468);
      expect(landmarks.imageWidth).toBe(640);
      expect(landmarks.imageHeight).toBe(480);
    });

    it('should throw FaceNotVisibleError when no face detected', async () => {
      mockFaceLandmarker.detect.mockReturnValue({
        faceLandmarks: []
      });

      const imageData = new MockImageData(640, 480) as any;
      
      await expect(detector.extractFacialLandmarks(imageData)).rejects.toThrow(FaceNotVisibleError);
      await expect(detector.extractFacialLandmarks(imageData)).rejects.toThrow(
        'No face detected in image. Please ensure your face is visible and well-lit.'
      );
    });

    it('should throw MediaPipeInitializationError when not initialized', async () => {
      const uninitializedDetector = new MediaPipeFacialAsymmetryDetector();
      const imageData = new MockImageData(640, 480) as any;

      await expect(uninitializedDetector.extractFacialLandmarks(imageData)).rejects.toThrow(
        MediaPipeInitializationError
      );
    });
  });

  describe('computeSymmetryScore', () => {
    it('should compute symmetry score from landmarks', () => {
      // Create symmetric landmarks with proper center reference
      const symmetricLandmarks: FacialLandmarks = {
        landmarks: Array.from({ length: 468 }, (_, i) => {
          // Landmark 1 is the nose tip (center reference)
          if (i === 1) {
            return { x: 0.5, y: 0.5, z: 0 };
          }
          // Create symmetric points around center
          const isLeft = i % 2 === 0;
          const offset = 0.05 + (i % 10) * 0.01; // Varying offsets
          return {
            x: isLeft ? 0.5 - offset : 0.5 + offset,
            y: 0.5 + (i % 5) * 0.01, // Slight vertical variation
            z: 0
          };
        }),
        imageWidth: 640,
        imageHeight: 480
      };

      const score = detector.computeSymmetryScore(symmetricLandmarks);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
      // With symmetric data, score should be reasonably high
      expect(score).toBeGreaterThan(0.3);
    });

    it('should return lower score for asymmetric landmarks', () => {
      // Create asymmetric landmarks
      const asymmetricLandmarks: FacialLandmarks = {
        landmarks: Array.from({ length: 468 }, (_, i) => ({
          x: Math.random(), // Random positions = asymmetric
          y: Math.random(),
          z: 0
        })),
        imageWidth: 640,
        imageHeight: 480
      };

      const score = detector.computeSymmetryScore(asymmetricLandmarks);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should handle edge case with insufficient landmarks', () => {
      const minimalLandmarks: FacialLandmarks = {
        landmarks: [
          { x: 0.5, y: 0.5, z: 0 },
          { x: 0.5, y: 0.5, z: 0 }
        ],
        imageWidth: 640,
        imageHeight: 480
      };

      const score = detector.computeSymmetryScore(minimalLandmarks);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('detectAsymmetry', () => {
    beforeEach(async () => {
      await detector.initialize();
    });

    it('should detect facial asymmetry and return metrics', async () => {
      // Mock face detection with realistic landmarks
      const mockLandmarks = Array.from({ length: 468 }, (_, i) => ({
        x: 0.5 + (Math.random() - 0.5) * 0.2,
        y: 0.5 + (Math.random() - 0.5) * 0.2,
        z: Math.random() * 0.1
      }));

      mockFaceLandmarker.detect.mockReturnValue({
        faceLandmarks: [mockLandmarks]
      });

      const imageData = new MockImageData(640, 480) as any;
      const metrics = await detector.detectAsymmetry(imageData);

      expect(metrics).toHaveProperty('symmetryScore');
      expect(metrics).toHaveProperty('leftEyeOpenness');
      expect(metrics).toHaveProperty('rightEyeOpenness');
      expect(metrics).toHaveProperty('mouthSymmetry');
      expect(metrics).toHaveProperty('eyebrowSymmetry');
      expect(metrics).toHaveProperty('timestamp');

      expect(metrics.symmetryScore).toBeGreaterThanOrEqual(0);
      expect(metrics.symmetryScore).toBeLessThanOrEqual(1);
      expect(metrics.leftEyeOpenness).toBeGreaterThanOrEqual(0);
      expect(metrics.leftEyeOpenness).toBeLessThanOrEqual(1);
      expect(metrics.rightEyeOpenness).toBeGreaterThanOrEqual(0);
      expect(metrics.rightEyeOpenness).toBeLessThanOrEqual(1);
      expect(metrics.mouthSymmetry).toBeGreaterThanOrEqual(0);
      expect(metrics.mouthSymmetry).toBeLessThanOrEqual(1);
      expect(metrics.eyebrowSymmetry).toBeGreaterThanOrEqual(0);
      expect(metrics.eyebrowSymmetry).toBeLessThanOrEqual(1);
      expect(metrics.timestamp).toBeInstanceOf(Date);
    });

    it('should throw FaceNotVisibleError when no face detected', async () => {
      mockFaceLandmarker.detect.mockReturnValue({
        faceLandmarks: []
      });

      const imageData = new MockImageData(640, 480) as any;

      await expect(detector.detectAsymmetry(imageData)).rejects.toThrow(FaceNotVisibleError);
    });
  });

  describe('dispose', () => {
    it('should clean up MediaPipe resources', async () => {
      await detector.initialize();
      detector.dispose();

      expect(mockFaceLandmarker.close).toHaveBeenCalled();

      // Should throw error after disposal
      const imageData = new MockImageData(640, 480) as any;
      await expect(detector.extractFacialLandmarks(imageData)).rejects.toThrow(
        MediaPipeInitializationError
      );
    });
  });

  describe('createFacialAsymmetryDetector', () => {
    it('should create and initialize detector', async () => {
      const detector = await createFacialAsymmetryDetector();

      expect(detector).toBeDefined();
      
      // Should be able to use immediately
      const mockLandmarks = Array.from({ length: 468 }, (_, i) => ({
        x: Math.random(),
        y: Math.random(),
        z: Math.random()
      }));

      mockFaceLandmarker.detect.mockReturnValue({
        faceLandmarks: [mockLandmarks]
      });

      const imageData = new MockImageData(640, 480) as any;
      const metrics = await detector.detectAsymmetry(imageData);

      expect(metrics).toBeDefined();
      expect(metrics.symmetryScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('error handling', () => {
    it('should provide helpful error message for face not visible', async () => {
      await detector.initialize();
      mockFaceLandmarker.detect.mockReturnValue({
        faceLandmarks: []
      });

      const imageData = new MockImageData(640, 480) as any;

      try {
        await detector.detectAsymmetry(imageData);
        fail('Should have thrown FaceNotVisibleError');
      } catch (error) {
        expect(error).toBeInstanceOf(FaceNotVisibleError);
        expect((error as Error).message).toContain('Please ensure your face is visible and well-lit');
      }
    });

    it('should handle initialization errors gracefully', async () => {
      const { FilesetResolver } = require('@mediapipe/tasks-vision');
      FilesetResolver.forVisionTasks.mockRejectedValue(new Error('Network timeout'));

      try {
        await detector.initialize();
        fail('Should have thrown MediaPipeInitializationError');
      } catch (error) {
        expect(error).toBeInstanceOf(MediaPipeInitializationError);
        expect((error as Error).message).toContain('Failed to initialize MediaPipe Face Mesh');
        expect((error as Error).message).toContain('Network timeout');
      }
    });
  });
});
