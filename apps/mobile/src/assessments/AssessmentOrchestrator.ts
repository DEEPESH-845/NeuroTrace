/**
 * AssessmentOrchestrator - Coordinates multimodal assessment execution
 * 
 * This module orchestrates the complete assessment flow:
 * 1. Creates assessment session
 * 2. Executes voice, facial, and reaction time tasks
 * 3. Aggregates results and tracks completion time
 * 4. Ensures raw biometric data is deleted after processing
 * 5. Saves derived metrics to local storage
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.7, 6.8
 */

import {
  AssessmentSession,
  AssessmentResult,
  SpeechMetrics,
  FacialMetrics,
  ReactionMetrics,
} from '@neurotrace/types';
import { ISpeechBiomarkerExtractor, createSpeechBiomarkerExtractor } from '../ai/SpeechBiomarkerExtractor';
import { IFacialAsymmetryDetector, createFacialAsymmetryDetector } from '../ai/FacialAsymmetryDetector';
import { localStorageManager } from '../database/LocalStorageManager';
import { Platform } from 'react-native';

/**
 * Error thrown when assessment session is invalid
 */
export class InvalidSessionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidSessionError';
  }
}

/**
 * Error thrown when assessment execution fails
 */
export class AssessmentExecutionError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'AssessmentExecutionError';
  }
}

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get device ID (placeholder - in production would use react-native-device-info)
 */
function getDeviceId(): string {
  // In production, use react-native-device-info to get unique device ID
  return 'device-' + Math.random().toString(36).substring(7);
}

/**
 * Get app version (placeholder)
 */
function getAppVersion(): string {
  return '1.0.0';
}

/**
 * Get model version (placeholder)
 */
function getModelVersion(): string {
  return 'phi-3-mini-v1.0';
}

/**
 * Interface for assessment orchestrator
 */
export interface IAssessmentOrchestrator {
  /**
   * Start a new assessment session
   * @param patientId - Patient ID
   * @returns Assessment session
   */
  startAssessment(patientId: string): Promise<AssessmentSession>;

  /**
   * Execute voice task with audio recording
   * @param session - Assessment session
   * @param audioBuffer - Recorded audio samples
   * @returns Speech metrics
   */
  executeVoiceTask(session: AssessmentSession, audioBuffer: Float32Array): Promise<SpeechMetrics>;

  /**
   * Execute facial task with camera capture
   * @param session - Assessment session
   * @param imageData - Captured image data
   * @returns Facial metrics
   */
  executeFacialTask(session: AssessmentSession, imageData: any): Promise<FacialMetrics>;

  /**
   * Execute reaction time task
   * @param session - Assessment session
   * @param reactionMetrics - Reaction metrics from UI component
   * @returns Reaction metrics
   */
  executeReactionTask(session: AssessmentSession, reactionMetrics: ReactionMetrics): Promise<ReactionMetrics>;

  /**
   * Complete assessment and aggregate results
   * @param session - Assessment session
   * @param speechMetrics - Speech metrics from voice task
   * @param facialMetrics - Facial metrics from facial task
   * @param reactionMetrics - Reaction metrics from reaction task
   * @returns Complete assessment result
   */
  completeAssessment(
    session: AssessmentSession,
    speechMetrics: SpeechMetrics,
    facialMetrics: FacialMetrics,
    reactionMetrics: ReactionMetrics
  ): Promise<AssessmentResult>;
}

/**
 * Implementation of AssessmentOrchestrator
 */
export class AssessmentOrchestrator implements IAssessmentOrchestrator {
  private speechExtractor: ISpeechBiomarkerExtractor;
  private facialDetector: IFacialAsymmetryDetector | null = null;
  private activeSessions: Map<string, AssessmentSession> = new Map();
  private sessionStartTimes: Map<string, number> = new Map();
  private rawDataCleanupTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    speechExtractor?: ISpeechBiomarkerExtractor,
    facialDetector?: IFacialAsymmetryDetector
  ) {
    this.speechExtractor = speechExtractor || createSpeechBiomarkerExtractor();
    this.facialDetector = facialDetector || null;
  }

  /**
   * Initialize the orchestrator (lazy initialization of facial detector)
   */
  private async ensureFacialDetectorInitialized(): Promise<void> {
    if (!this.facialDetector) {
      this.facialDetector = await createFacialAsymmetryDetector();
    }
  }

  /**
   * Start a new assessment session
   */
  async startAssessment(patientId: string): Promise<AssessmentSession> {
    const sessionId = generateUUID();
    const startTime = new Date();

    const session: AssessmentSession = {
      sessionId,
      patientId,
      startTime,
      status: 'IN_PROGRESS',
    };

    // Track session
    this.activeSessions.set(sessionId, session);
    this.sessionStartTimes.set(sessionId, Date.now());

    console.log(`Assessment session ${sessionId} started for patient ${patientId}`);

    return session;
  }

  /**
   * Execute voice task with audio recording
   * 
   * Requirement 2.7: Raw audio data is deleted after processing (≤5 seconds retention)
   * Requirement 6.8: Delete raw biometric data after processing
   */
  async executeVoiceTask(
    session: AssessmentSession,
    audioBuffer: Float32Array
  ): Promise<SpeechMetrics> {
    this.validateSession(session);

    try {
      console.log(`Executing voice task for session ${session.sessionId}`);

      // Extract speech biomarkers (on-device processing)
      const speechMetrics = await this.speechExtractor.extractBiomarkers(audioBuffer);

      // Schedule raw audio data deletion after 5 seconds (Requirement 6.8)
      this.scheduleRawDataCleanup(session.sessionId, audioBuffer);

      console.log(`Voice task completed for session ${session.sessionId}`);
      return speechMetrics;
    } catch (error) {
      throw new AssessmentExecutionError(
        `Voice task failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Execute facial task with camera capture
   * 
   * Requirement 2.7: Raw image data is deleted after processing (≤5 seconds retention)
   * Requirement 6.8: Delete raw biometric data after processing
   */
  async executeFacialTask(
    session: AssessmentSession,
    imageData: any
  ): Promise<FacialMetrics> {
    this.validateSession(session);

    try {
      console.log(`Executing facial task for session ${session.sessionId}`);

      // Ensure facial detector is initialized
      await this.ensureFacialDetectorInitialized();

      if (!this.facialDetector) {
        throw new Error('Facial detector not initialized');
      }

      // Detect facial asymmetry (on-device processing)
      const facialMetrics = await this.facialDetector.detectAsymmetry(imageData);

      // Schedule raw image data deletion after 5 seconds (Requirement 6.8)
      this.scheduleRawDataCleanup(session.sessionId, imageData);

      console.log(`Facial task completed for session ${session.sessionId}`);
      return facialMetrics;
    } catch (error) {
      throw new AssessmentExecutionError(
        `Facial task failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Execute reaction time task
   * 
   * Note: Reaction time task doesn't involve raw biometric data,
   * so no cleanup is needed. The ReactionTimeTask component
   * handles the UI and returns the metrics directly.
   */
  async executeReactionTask(
    session: AssessmentSession,
    reactionMetrics: ReactionMetrics
  ): Promise<ReactionMetrics> {
    this.validateSession(session);

    console.log(`Reaction task completed for session ${session.sessionId}`);
    return reactionMetrics;
  }

  /**
   * Complete assessment and aggregate results
   * 
   * Requirement 2.3: Track completion time (must be ≤60 seconds active time)
   * Requirement 2.7: Save only derived metrics, no raw biometric data
   */
  async completeAssessment(
    session: AssessmentSession,
    speechMetrics: SpeechMetrics,
    facialMetrics: FacialMetrics,
    reactionMetrics: ReactionMetrics
  ): Promise<AssessmentResult> {
    this.validateSession(session);

    try {
      // Calculate completion time
      const startTime = this.sessionStartTimes.get(session.sessionId);
      if (!startTime) {
        throw new Error('Session start time not found');
      }

      const completionTimeMs = Date.now() - startTime;
      const completionTimeSec = Math.round(completionTimeMs / 1000);

      // Warn if completion time exceeds 60 seconds (Requirement 2.3)
      if (completionTimeSec > 60) {
        console.warn(
          `Assessment completion time ${completionTimeSec}s exceeds 60s target for session ${session.sessionId}`
        );
      }

      // Get patient info to determine day number and baseline period
      const { dayNumber, isBaselinePeriod } = await this.getPatientAssessmentInfo(session.patientId);

      // Create assessment result with derived metrics only
      const assessmentResult: AssessmentResult = {
        assessmentId: generateUUID(),
        patientId: session.patientId,
        timestamp: new Date(),
        dayNumber,
        isBaselinePeriod,
        speechMetrics,
        facialMetrics,
        reactionMetrics,
        completionTime: completionTimeSec,
        deviceInfo: {
          deviceId: getDeviceId(),
          platform: Platform.OS,
          appVersion: getAppVersion(),
          modelVersion: getModelVersion(),
        },
      };

      // Save assessment to local storage (only derived metrics)
      await localStorageManager.saveAssessment(assessmentResult);

      // Update session status
      session.status = 'COMPLETED';
      this.activeSessions.delete(session.sessionId);
      this.sessionStartTimes.delete(session.sessionId);

      console.log(
        `Assessment ${assessmentResult.assessmentId} completed in ${completionTimeSec}s for session ${session.sessionId}`
      );

      return assessmentResult;
    } catch (error) {
      // Mark session as failed
      session.status = 'FAILED';
      this.activeSessions.delete(session.sessionId);
      this.sessionStartTimes.delete(session.sessionId);

      throw new AssessmentExecutionError(
        `Failed to complete assessment: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Validate that session is active and in progress
   */
  private validateSession(session: AssessmentSession): void {
    if (!this.activeSessions.has(session.sessionId)) {
      throw new InvalidSessionError(`Session ${session.sessionId} is not active`);
    }

    if (session.status !== 'IN_PROGRESS') {
      throw new InvalidSessionError(`Session ${session.sessionId} is not in progress (status: ${session.status})`);
    }
  }

  /**
   * Schedule raw biometric data cleanup after 5 seconds
   * 
   * Requirement 6.8: Delete raw biometric data after processing (≤5 seconds retention)
   */
  private scheduleRawDataCleanup(sessionId: string, data: any): void {
    // Clear any existing cleanup timer for this session
    const existingTimer = this.rawDataCleanupTimers.get(sessionId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule cleanup after 5 seconds
    const timer = setTimeout(() => {
      // In JavaScript, we can't truly "delete" the data from memory,
      // but we can clear references and let garbage collection handle it
      
      // Clear the data reference
      if (data instanceof Float32Array) {
        // For typed arrays, we can fill with zeros
        data.fill(0);
      } else if (typeof data === 'object' && data !== null) {
        // For objects, clear all properties
        Object.keys(data).forEach(key => {
          delete data[key];
        });
      }

      // Remove timer reference
      this.rawDataCleanupTimers.delete(sessionId);

      console.log(`Raw biometric data cleaned up for session ${sessionId} (5 second retention limit)`);
    }, 5000); // 5 seconds

    this.rawDataCleanupTimers.set(sessionId, timer);
  }

  /**
   * Get patient assessment info (day number and baseline period status)
   */
  private async getPatientAssessmentInfo(
    patientId: string
  ): Promise<{ dayNumber: number; isBaselinePeriod: boolean }> {
    // Get recent assessments to determine day number
    const recentAssessments = await localStorageManager.getRecentAssessments(patientId, 90);

    // Day number is the count of assessments + 1
    const dayNumber = recentAssessments.length + 1;

    // Baseline period is first 7 days
    const isBaselinePeriod = dayNumber <= 7;

    return { dayNumber, isBaselinePeriod };
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    // Clear all active sessions
    this.activeSessions.clear();
    this.sessionStartTimes.clear();

    // Clear all cleanup timers
    this.rawDataCleanupTimers.forEach(timer => clearTimeout(timer));
    this.rawDataCleanupTimers.clear();

    // Dispose facial detector
    if (this.facialDetector) {
      this.facialDetector.dispose();
      this.facialDetector = null;
    }
  }
}

/**
 * Create a singleton instance of AssessmentOrchestrator
 */
let orchestratorInstance: AssessmentOrchestrator | null = null;

export function getAssessmentOrchestrator(): AssessmentOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new AssessmentOrchestrator();
  }
  return orchestratorInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetAssessmentOrchestrator(): void {
  if (orchestratorInstance) {
    orchestratorInstance.dispose();
    orchestratorInstance = null;
  }
}
