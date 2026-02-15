/**
 * FacialAsymmetryDetector - Detects facial asymmetry using MediaPipe Face Mesh
 * 
 * This module uses MediaPipe Face Mesh to detect 468 facial landmarks and compute
 * symmetry scores for neurological monitoring. All processing is done on-device
 * to maintain privacy.
 * 
 * Requirements: 2.5, 6.2
 */

import { FaceLandmarker, FilesetResolver, FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import { FacialMetrics, FacialLandmarks } from '@neurotrace/types';

/**
 * Error thrown when face is not visible in the image
 */
export class FaceNotVisibleError extends Error {
  constructor(message: string = 'No face detected in image') {
    super(message);
    this.name = 'FaceNotVisibleError';
  }
}

/**
 * Error thrown when MediaPipe initialization fails
 */
export class MediaPipeInitializationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MediaPipeInitializationError';
  }
}

/**
 * Interface for facial asymmetry detection
 */
export interface FacialAsymmetryDetector {
  /**
   * Initialize the MediaPipe Face Mesh model
   */
  initialize(): Promise<void>;
  
  /**
   * Detect facial asymmetry from an image
   * @throws {FaceNotVisibleError} When no face is detected
   * @throws {MediaPipeInitializationError} When detector is not initialized
   */
  detectAsymmetry(imageData: ImageData): Promise<FacialMetrics>;
  
  /**
   * Extract facial landmarks from an image
   * @throws {FaceNotVisibleError} When no face is detected
   */
  extractFacialLandmarks(image: ImageData): Promise<FacialLandmarks>;
  
  /**
   * Compute symmetry score from landmarks
   */
  computeSymmetryScore(landmarks: FacialLandmarks): number;
  
  /**
   * Clean up resources
   */
  dispose(): void;
}

/**
 * MediaPipe-based implementation of FacialAsymmetryDetector
 */
export class MediaPipeFacialAsymmetryDetector implements FacialAsymmetryDetector {
  private faceLandmarker: FaceLandmarker | null = null;
  private initialized: boolean = false;

  /**
   * Initialize MediaPipe Face Mesh with 468 landmarks
   */
  async initialize(): Promise<void> {
    try {
      // Load MediaPipe vision tasks
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      // Create Face Landmarker with 468 landmarks
      this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU' // Use GPU acceleration if available
        },
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
        runningMode: 'IMAGE',
        numFaces: 1 // Only detect one face for patient assessments
      });

      this.initialized = true;
    } catch (error) {
      throw new MediaPipeInitializationError(
        `Failed to initialize MediaPipe Face Mesh: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Detect facial asymmetry from an image
   */
  async detectAsymmetry(imageData: ImageData): Promise<FacialMetrics> {
    if (!this.initialized || !this.faceLandmarker) {
      throw new MediaPipeInitializationError('FacialAsymmetryDetector not initialized. Call initialize() first.');
    }

    // Extract landmarks
    const landmarks = await this.extractFacialLandmarks(imageData);

    // Compute symmetry score
    const symmetryScore = this.computeSymmetryScore(landmarks);

    // Compute eye openness (landmarks 159, 145 for left eye; 386, 374 for right eye)
    const leftEyeOpenness = this.computeEyeOpenness(landmarks, 'left');
    const rightEyeOpenness = this.computeEyeOpenness(landmarks, 'right');

    // Compute mouth symmetry (landmarks 61, 291 for mouth corners)
    const mouthSymmetry = this.computeMouthSymmetry(landmarks);

    // Compute eyebrow symmetry (landmarks 70, 300 for eyebrows)
    const eyebrowSymmetry = this.computeEyebrowSymmetry(landmarks);

    return {
      symmetryScore,
      leftEyeOpenness,
      rightEyeOpenness,
      mouthSymmetry,
      eyebrowSymmetry,
      timestamp: new Date()
    };
  }

  /**
   * Extract 468 facial landmarks from an image
   */
  async extractFacialLandmarks(image: ImageData): Promise<FacialLandmarks> {
    if (!this.initialized || !this.faceLandmarker) {
      throw new MediaPipeInitializationError('FacialAsymmetryDetector not initialized. Call initialize() first.');
    }

    // Convert ImageData to HTMLImageElement for MediaPipe
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to create canvas context');
    }
    ctx.putImageData(image, 0, 0);

    // Detect face landmarks
    const result: FaceLandmarkerResult = this.faceLandmarker.detect(canvas);

    // Check if face was detected
    if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
      throw new FaceNotVisibleError('No face detected in image. Please ensure your face is visible and well-lit.');
    }

    // Get the first face's landmarks (468 landmarks)
    const faceLandmarks = result.faceLandmarks[0];

    // Convert to our FacialLandmarks format
    return {
      landmarks: faceLandmarks.map(landmark => ({
        x: landmark.x,
        y: landmark.y,
        z: landmark.z || 0
      })),
      imageWidth: image.width,
      imageHeight: image.height
    };
  }

  /**
   * Compute overall facial symmetry score (0-1, higher is more symmetric)
   * 
   * Compares left and right sides of the face by measuring distances
   * between corresponding landmarks.
   */
  computeSymmetryScore(landmarks: FacialLandmarks): number {
    const points = landmarks.landmarks;

    // Key landmark pairs for symmetry comparison (left, right)
    const symmetryPairs = [
      // Eyes
      [33, 263], [133, 362], [159, 386], [145, 374],
      // Eyebrows
      [70, 300], [63, 293], [105, 334], [66, 296],
      // Nose
      [129, 358], [98, 327], [2, 2], // Nose tip is center
      // Mouth
      [61, 291], [78, 308], [95, 325], [88, 318],
      // Cheeks
      [123, 352], [116, 345], [117, 346]
    ];

    let totalAsymmetry = 0;
    let validPairs = 0;

    // Center line (nose tip landmark 1)
    const centerX = points[1].x;

    for (const [leftIdx, rightIdx] of symmetryPairs) {
      if (leftIdx >= points.length || rightIdx >= points.length) continue;

      const leftPoint = points[leftIdx];
      const rightPoint = points[rightIdx];

      // Calculate distance from center for each point
      const leftDist = Math.abs(leftPoint.x - centerX);
      const rightDist = Math.abs(rightPoint.x - centerX);

      // Calculate vertical difference
      const verticalDiff = Math.abs(leftPoint.y - rightPoint.y);

      // Asymmetry is the combination of horizontal and vertical differences
      const asymmetry = Math.abs(leftDist - rightDist) + verticalDiff;
      totalAsymmetry += asymmetry;
      validPairs++;
    }

    if (validPairs === 0) {
      return 0;
    }

    // Normalize to 0-1 range (lower asymmetry = higher score)
    const avgAsymmetry = totalAsymmetry / validPairs;
    const symmetryScore = Math.max(0, 1 - avgAsymmetry * 10); // Scale factor of 10

    return Math.min(1, Math.max(0, symmetryScore));
  }

  /**
   * Compute eye openness (0-1, higher is more open)
   */
  private computeEyeOpenness(landmarks: FacialLandmarks, eye: 'left' | 'right'): number {
    const points = landmarks.landmarks;

    // Eye landmarks: left eye (159, 145), right eye (386, 374)
    const topIdx = eye === 'left' ? 159 : 386;
    const bottomIdx = eye === 'left' ? 145 : 374;

    if (topIdx >= points.length || bottomIdx >= points.length) {
      return 0;
    }

    const topPoint = points[topIdx];
    const bottomPoint = points[bottomIdx];

    // Calculate vertical distance
    const openness = Math.abs(topPoint.y - bottomPoint.y);

    // Normalize to 0-1 range (typical eye openness is ~0.02-0.05 in normalized coordinates)
    return Math.min(1, openness * 20);
  }

  /**
   * Compute mouth symmetry (0-1, higher is more symmetric)
   */
  private computeMouthSymmetry(landmarks: FacialLandmarks): number {
    const points = landmarks.landmarks;

    // Mouth corner landmarks: left (61), right (291)
    const leftCornerIdx = 61;
    const rightCornerIdx = 291;
    const centerIdx = 1; // Nose tip as center reference

    if (leftCornerIdx >= points.length || rightCornerIdx >= points.length || centerIdx >= points.length) {
      return 0;
    }

    const leftCorner = points[leftCornerIdx];
    const rightCorner = points[rightCornerIdx];
    const center = points[centerIdx];

    // Calculate distances from center
    const leftDist = Math.abs(leftCorner.x - center.x);
    const rightDist = Math.abs(rightCorner.x - center.x);

    // Calculate vertical difference
    const verticalDiff = Math.abs(leftCorner.y - rightCorner.y);

    // Asymmetry is combination of horizontal and vertical differences
    const asymmetry = Math.abs(leftDist - rightDist) + verticalDiff;

    // Normalize to 0-1 range
    const symmetry = Math.max(0, 1 - asymmetry * 10);

    return Math.min(1, Math.max(0, symmetry));
  }

  /**
   * Compute eyebrow symmetry (0-1, higher is more symmetric)
   */
  private computeEyebrowSymmetry(landmarks: FacialLandmarks): number {
    const points = landmarks.landmarks;

    // Eyebrow landmarks: left (70), right (300)
    const leftBrowIdx = 70;
    const rightBrowIdx = 300;
    const centerIdx = 1; // Nose tip as center reference

    if (leftBrowIdx >= points.length || rightBrowIdx >= points.length || centerIdx >= points.length) {
      return 0;
    }

    const leftBrow = points[leftBrowIdx];
    const rightBrow = points[rightBrowIdx];
    const center = points[centerIdx];

    // Calculate distances from center
    const leftDist = Math.abs(leftBrow.x - center.x);
    const rightDist = Math.abs(rightBrow.x - center.x);

    // Calculate vertical difference
    const verticalDiff = Math.abs(leftBrow.y - rightBrow.y);

    // Asymmetry is combination of horizontal and vertical differences
    const asymmetry = Math.abs(leftDist - rightDist) + verticalDiff;

    // Normalize to 0-1 range
    const symmetry = Math.max(0, 1 - asymmetry * 10);

    return Math.min(1, Math.max(0, symmetry));
  }

  /**
   * Clean up MediaPipe resources
   */
  dispose(): void {
    if (this.faceLandmarker) {
      this.faceLandmarker.close();
      this.faceLandmarker = null;
    }
    this.initialized = false;
  }
}

/**
 * Factory function to create and initialize a FacialAsymmetryDetector
 */
export async function createFacialAsymmetryDetector(): Promise<FacialAsymmetryDetector> {
  const detector = new MediaPipeFacialAsymmetryDetector();
  await detector.initialize();
  return detector;
}
