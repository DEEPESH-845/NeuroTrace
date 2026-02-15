// On-device AI interfaces

import { SpeechMetrics, FacialMetrics, ReactionMetrics } from './metrics';
import { AssessmentResult, AssessmentSession } from './assessment';
import { Baseline } from './baseline';
import { Deviation, TrendAnalysis } from './deviation';

// Assessment orchestrator interface
export interface AssessmentOrchestrator {
  startAssessment(): Promise<AssessmentSession>;
  executeVoiceTask(session: AssessmentSession): Promise<SpeechMetrics>;
  executeFacialTask(session: AssessmentSession): Promise<FacialMetrics>;
  executeReactionTask(session: AssessmentSession): Promise<ReactionMetrics>;
  completeAssessment(session: AssessmentSession): Promise<AssessmentResult>;
}

// Speech biomarker extractor interface
export interface SpeechBiomarkerExtractor {
  extractBiomarkers(audioBuffer: Float32Array): Promise<SpeechMetrics>;
  computeArticulationRate(audio: Float32Array): number;
  detectPauseDuration(audio: Float32Array): number[];
  analyzePhoneticPrecision(audio: Float32Array): number;
}

// Facial landmarks (468 landmarks from MediaPipe Face Mesh)
export interface FacialLandmarks {
  landmarks: Array<{ x: number; y: number; z: number }>; // All 468 landmarks
  imageWidth: number;
  imageHeight: number;
}

// Facial asymmetry detector interface
export interface FacialAsymmetryDetector {
  initialize(): Promise<void>;
  detectAsymmetry(imageData: any): Promise<FacialMetrics>;
  extractFacialLandmarks(image: any): Promise<FacialLandmarks>;
  computeSymmetryScore(landmarks: FacialLandmarks): number;
  dispose(): void;
}

// Baseline computer interface
export interface BaselineComputer {
  computeBaseline(assessments: AssessmentResult[]): Promise<Baseline>;
  validateBaselineQuality(baseline: Baseline): boolean;
  updateBaseline(current: Baseline, newAssessment: AssessmentResult): Promise<Baseline>;
}

// Deviation detector interface
export interface DeviationDetector {
  detectDeviations(current: AssessmentResult, baseline: Baseline): Promise<Deviation[]>;
  analyzeTrends(recentAssessments: AssessmentResult[], baseline: Baseline): Promise<TrendAnalysis>;
  computeSeverity(trends: TrendAnalysis): import('./deviation').AlertSeverity;
}
