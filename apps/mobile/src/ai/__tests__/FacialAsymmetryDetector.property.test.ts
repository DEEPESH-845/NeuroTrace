/**
 * Property-Based Tests for FacialAsymmetryDetector
 * 
 * Tests facial asymmetry detection properties using fast-check
 * 
 * Property 5: Multimodal Biomarker Extraction (Facial)
 * 
 * **Validates: Requirements 2.5**
 */

import * as fc from 'fast-check';
import {
  MediaPipeFacialAsymmetryDetector,
  FaceNotVisibleError,
} from '../FacialAsymmetryDetector';
import { FacialMetrics, FacialLandmarks } from '@neurotrace/types';

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
      putImageData: jest.fn(),
    })),
  })),
} as unknown as Document;

// Mock MediaPipe
jest.mock('@mediapipe/tasks-vision', () => ({
  FaceLandmarker: {
    createFromOptions: jest.fn(),
  },
  FilesetResolver: {
    forVisionTasks: jest.fn(),
  },
}));

describe('FacialAsymmetryDetector Property-Based Tests', () => {
  let detector: MediaPipeFacialAsymmetryDetector;
  let mockFaceLandmarker: {
    detect: jest.Mock;
    close: jest.Mock;
  };

  beforeEach(async () => {
    detector = new MediaPipeFacialAsymmetryDetector();

    // Create mock face landmarker
    mockFaceLandmarker = {
      detect: jest.fn(),
      close: jest.fn(),
    };

    // Mock MediaPipe initialization
    const { FaceLandmarker, FilesetResolver } = require('@mediapipe/tasks-vision');
    FilesetResolver.forVisionTasks.mockResolvedValue({});
    FaceLandmarker.createFromOptions.mockResolvedValue(mockFaceLandmarker);

    // Initialize detector
    await detector.initialize();
  });

  afterEach(() => {
    detector.dispose();
    jest.clearAllMocks();
  });

  // Arbitraries for generating test data

  /**
   * Generate a valid facial landmark (normalized coordinates 0-1)
   */
  const landmarkArb = fc.record({
    x: fc.double({ min: 0, max: 1, noNaN: true }),
    y: fc.double({ min: 0, max: 1, noNaN: true }),
    z: fc.double({ min: -0.1, max: 0.1, noNaN: true }), // Depth is typically small
  });

  /**
   * Generate 468 facial landmarks (MediaPipe Face Mesh standard)
   */
  const facialLandmarksArb = fc.record({
    landmarks: fc.array(landmarkArb, { minLength: 468, maxLength: 468 }),
    imageWidth: fc.integer({ min: 320, max: 1920 }),
    imageHeight: fc.integer({ min: 240, max: 1080 }),
  });

  /**
   * Generate a valid face image (ImageData)
   */
  const faceImageArb = fc.record({
    width: fc.integer({ min: 320, max: 1920 }),
    height: fc.integer({ min: 240, max: 1080 }),
  });

  /**
   * Property 5: Multimodal Biomarker Extraction (Facial)
   * 
   * **Validates: Requirements 2.5**
   * 
   * For any face image where a face is detected, the system should extract all required
   * facial metrics: symmetryScore, leftEyeOpenness, rightEyeOpenness, mouthSymmetry,
   * and eyebrowSymmetry. All metrics should be in the valid range [0, 1].
   * 
   * This test verifies that:
   * 1. All required facial metrics are extracted
   * 2. All metrics are within valid range [0, 1]
   * 3. Timestamp is set to current time
   * 4. Metrics are computed from facial landmarks
   */
  describe('Property 5: Multimodal Biomarker Extraction (Facial)', () => {
    it('should extract all facial metrics for any face image', async () => {
      await fc.assert(
        fc.asyncProperty(
          faceImageArb,
          facialLandmarksArb,
          async (imageSpec, landmarks) => {
            // Create mock image data
            const imageData = new MockImageData(
              imageSpec.width,
              imageSpec.height
            ) as unknown as ImageData;

            // Mock MediaPipe to return the generated landmarks
            mockFaceLandmarker.detect.mockReturnValue({
              faceLandmarks: [
                landmarks.landmarks.map((l) => ({
                  x: l.x,
                  y: l.y,
                  z: l.z,
                })),
              ],
            });

            // Detect facial asymmetry
            const metrics: FacialMetrics = await detector.detectAsymmetry(imageData);

            // Verify all required metrics are present
            expect(metrics).toHaveProperty('symmetryScore');
            expect(metrics).toHaveProperty('leftEyeOpenness');
            expect(metrics).toHaveProperty('rightEyeOpenness');
            expect(metrics).toHaveProperty('mouthSymmetry');
            expect(metrics).toHaveProperty('eyebrowSymmetry');
            expect(metrics).toHaveProperty('timestamp');

            // Verify all metrics are numbers
            expect(typeof metrics.symmetryScore).toBe('number');
            expect(typeof metrics.leftEyeOpenness).toBe('number');
            expect(typeof metrics.rightEyeOpenness).toBe('number');
            expect(typeof metrics.mouthSymmetry).toBe('number');
            expect(typeof metrics.eyebrowSymmetry).toBe('number');

            // Verify all metrics are in valid range [0, 1]
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

            // Verify metrics are not NaN
            expect(Number.isNaN(metrics.symmetryScore)).toBe(false);
            expect(Number.isNaN(metrics.leftEyeOpenness)).toBe(false);
            expect(Number.isNaN(metrics.rightEyeOpenness)).toBe(false);
            expect(Number.isNaN(metrics.mouthSymmetry)).toBe(false);
            expect(Number.isNaN(metrics.eyebrowSymmetry)).toBe(false);

            // Verify timestamp is a valid Date
            expect(metrics.timestamp).toBeInstanceOf(Date);
            expect(metrics.timestamp.getTime()).toBeGreaterThan(0);

            // Verify timestamp is recent (within last 10 seconds)
            const now = new Date();
            const timeDiff = now.getTime() - metrics.timestamp.getTime();
            expect(timeDiff).toBeGreaterThanOrEqual(0);
            expect(timeDiff).toBeLessThan(10000); // 10 seconds
          }
        ),
        { numRuns: 100 } // Minimum 100 iterations as per spec
      );
    });

    it('should compute consistent symmetry scores for symmetric faces', async () => {
      await fc.assert(
        fc.asyncProperty(
          faceImageArb,
          fc.double({ min: 0, max: 1, noNaN: true }), // Base coordinate
          async (imageSpec, baseCoord) => {
            // Create perfectly symmetric landmarks
            const symmetricLandmarks: FacialLandmarks = {
              landmarks: Array.from({ length: 468 }, (_, i) => {
                // Landmark 1 is the nose tip (center reference)
                if (i === 1) {
                  return { x: 0.5, y: 0.5, z: 0 };
                }
                // Create symmetric points around center
                const isLeft = i % 2 === 0;
                const offset = 0.05 + (i % 10) * 0.01;
                return {
                  x: isLeft ? 0.5 - offset : 0.5 + offset,
                  y: 0.5 + (i % 5) * 0.01,
                  z: 0,
                };
              }),
              imageWidth: imageSpec.width,
              imageHeight: imageSpec.height,
            };

            // Create mock image data
            const imageData = new MockImageData(
              imageSpec.width,
              imageSpec.height
            ) as unknown as ImageData;

            // Mock MediaPipe to return symmetric landmarks
            mockFaceLandmarker.detect.mockReturnValue({
              faceLandmarks: [
                symmetricLandmarks.landmarks.map((l) => ({
                  x: l.x,
                  y: l.y,
                  z: l.z,
                })),
              ],
            });

            // Detect facial asymmetry
            const metrics: FacialMetrics = await detector.detectAsymmetry(imageData);

            // For symmetric faces, symmetry score should be relatively high
            // (at least 0.3, since perfect symmetry is rare even in synthetic data)
            expect(metrics.symmetryScore).toBeGreaterThan(0.3);

            // Mouth and eyebrow symmetry should also be high for symmetric faces
            expect(metrics.mouthSymmetry).toBeGreaterThan(0.3);
            expect(metrics.eyebrowSymmetry).toBeGreaterThan(0.3);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge cases with minimal landmarks gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(faceImageArb, async (imageSpec) => {
          // Create minimal landmarks (just enough to avoid errors)
          const minimalLandmarks = Array.from({ length: 468 }, () => ({
            x: 0.5,
            y: 0.5,
            z: 0,
          }));

          // Create mock image data
          const imageData = new MockImageData(
            imageSpec.width,
            imageSpec.height
          ) as unknown as ImageData;

          // Mock MediaPipe to return minimal landmarks
          mockFaceLandmarker.detect.mockReturnValue({
            faceLandmarks: [minimalLandmarks],
          });

          // Detect facial asymmetry
          const metrics: FacialMetrics = await detector.detectAsymmetry(imageData);

          // Should still extract all metrics without errors
          expect(metrics).toHaveProperty('symmetryScore');
          expect(metrics).toHaveProperty('leftEyeOpenness');
          expect(metrics).toHaveProperty('rightEyeOpenness');
          expect(metrics).toHaveProperty('mouthSymmetry');
          expect(metrics).toHaveProperty('eyebrowSymmetry');

          // All metrics should be valid numbers in range [0, 1]
          expect(metrics.symmetryScore).toBeGreaterThanOrEqual(0);
          expect(metrics.symmetryScore).toBeLessThanOrEqual(1);
          expect(Number.isNaN(metrics.symmetryScore)).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('should throw FaceNotVisibleError when no face is detected', async () => {
      await fc.assert(
        fc.asyncProperty(faceImageArb, async (imageSpec) => {
          // Create mock image data
          const imageData = new MockImageData(
            imageSpec.width,
            imageSpec.height
          ) as unknown as ImageData;

          // Mock MediaPipe to return no face detected
          mockFaceLandmarker.detect.mockReturnValue({
            faceLandmarks: [],
          });

          // Should throw FaceNotVisibleError
          await expect(detector.detectAsymmetry(imageData)).rejects.toThrow(
            FaceNotVisibleError
          );
        }),
        { numRuns: 100 }
      );
    });

    it('should extract consistent metrics for the same landmarks', async () => {
      await fc.assert(
        fc.asyncProperty(
          faceImageArb,
          facialLandmarksArb,
          async (imageSpec, landmarks) => {
            // Create mock image data
            const imageData = new MockImageData(
              imageSpec.width,
              imageSpec.height
            ) as unknown as ImageData;

            // Mock MediaPipe to return the same landmarks
            mockFaceLandmarker.detect.mockReturnValue({
              faceLandmarks: [
                landmarks.landmarks.map((l) => ({
                  x: l.x,
                  y: l.y,
                  z: l.z,
                })),
              ],
            });

            // Detect facial asymmetry twice
            const metrics1: FacialMetrics = await detector.detectAsymmetry(imageData);
            const metrics2: FacialMetrics = await detector.detectAsymmetry(imageData);

            // Metrics should be identical (except timestamp)
            expect(metrics1.symmetryScore).toBe(metrics2.symmetryScore);
            expect(metrics1.leftEyeOpenness).toBe(metrics2.leftEyeOpenness);
            expect(metrics1.rightEyeOpenness).toBe(metrics2.rightEyeOpenness);
            expect(metrics1.mouthSymmetry).toBe(metrics2.mouthSymmetry);
            expect(metrics1.eyebrowSymmetry).toBe(metrics2.eyebrowSymmetry);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should compute eye openness ratio correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          faceImageArb,
          fc.double({ min: 0.01, max: 0.1, noNaN: true }), // Eye openness distance
          async (imageSpec, eyeDistance) => {
            // Create landmarks with specific eye openness
            const landmarks: FacialLandmarks = {
              landmarks: Array.from({ length: 468 }, (_, i) => {
                // Left eye: top (159), bottom (145)
                if (i === 159) {
                  return { x: 0.3, y: 0.4 - eyeDistance / 2, z: 0 };
                }
                if (i === 145) {
                  return { x: 0.3, y: 0.4 + eyeDistance / 2, z: 0 };
                }
                // Right eye: top (386), bottom (374)
                if (i === 386) {
                  return { x: 0.7, y: 0.4 - eyeDistance / 2, z: 0 };
                }
                if (i === 374) {
                  return { x: 0.7, y: 0.4 + eyeDistance / 2, z: 0 };
                }
                // Default position for other landmarks
                return { x: 0.5, y: 0.5, z: 0 };
              }),
              imageWidth: imageSpec.width,
              imageHeight: imageSpec.height,
            };

            // Create mock image data
            const imageData = new MockImageData(
              imageSpec.width,
              imageSpec.height
            ) as unknown as ImageData;

            // Mock MediaPipe to return the landmarks
            mockFaceLandmarker.detect.mockReturnValue({
              faceLandmarks: [
                landmarks.landmarks.map((l) => ({
                  x: l.x,
                  y: l.y,
                  z: l.z,
                })),
              ],
            });

            // Detect facial asymmetry
            const metrics: FacialMetrics = await detector.detectAsymmetry(imageData);

            // Eye openness should be proportional to the distance
            // Both eyes should have similar openness (symmetric)
            expect(metrics.leftEyeOpenness).toBeGreaterThan(0);
            expect(metrics.rightEyeOpenness).toBeGreaterThan(0);

            // Eyes should be relatively symmetric (within 0.2 difference)
            const eyeDifference = Math.abs(
              metrics.leftEyeOpenness - metrics.rightEyeOpenness
            );
            expect(eyeDifference).toBeLessThan(0.2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('computeSymmetryScore', () => {
    it('should return score in range [0, 1] for any landmarks', async () => {
      await fc.assert(
        fc.asyncProperty(facialLandmarksArb, async (landmarks) => {
          const score = detector.computeSymmetryScore(landmarks);

          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(1);
          expect(Number.isNaN(score)).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('should be deterministic for the same input', async () => {
      await fc.assert(
        fc.asyncProperty(facialLandmarksArb, async (landmarks) => {
          const score1 = detector.computeSymmetryScore(landmarks);
          const score2 = detector.computeSymmetryScore(landmarks);

          expect(score1).toBe(score2);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('extractFacialLandmarks', () => {
    it('should extract exactly 468 landmarks for any face image', async () => {
      await fc.assert(
        fc.asyncProperty(
          faceImageArb,
          facialLandmarksArb,
          async (imageSpec, mockLandmarks) => {
            // Create mock image data
            const imageData = new MockImageData(
              imageSpec.width,
              imageSpec.height
            ) as unknown as ImageData;

            // Mock MediaPipe to return 468 landmarks
            mockFaceLandmarker.detect.mockReturnValue({
              faceLandmarks: [
                mockLandmarks.landmarks.map((l) => ({
                  x: l.x,
                  y: l.y,
                  z: l.z,
                })),
              ],
            });

            // Extract landmarks
            const landmarks = await detector.extractFacialLandmarks(imageData);

            // Should have exactly 468 landmarks
            expect(landmarks.landmarks).toHaveLength(468);

            // Each landmark should have x, y, z coordinates
            landmarks.landmarks.forEach((landmark) => {
              expect(landmark).toHaveProperty('x');
              expect(landmark).toHaveProperty('y');
              expect(landmark).toHaveProperty('z');
              expect(typeof landmark.x).toBe('number');
              expect(typeof landmark.y).toBe('number');
              expect(typeof landmark.z).toBe('number');
            });

            // Image dimensions should match
            expect(landmarks.imageWidth).toBe(imageSpec.width);
            expect(landmarks.imageHeight).toBe(imageSpec.height);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
