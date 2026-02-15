import { SpeechMetrics, FacialMetrics, ReactionMetrics } from './metrics';
import { Deviation, TrendAnalysis } from './deviation';

// Assessment result (on-device)
export interface AssessmentResult {
  assessmentId: string;
  patientId: string;
  timestamp: Date;
  dayNumber: number; // Day since enrollment
  isBaselinePeriod: boolean;

  speechMetrics: SpeechMetrics;
  facialMetrics: FacialMetrics;
  reactionMetrics: ReactionMetrics;

  deviations?: Deviation[];
  trendAnalysis?: TrendAnalysis;

  completionTime: number; // seconds
  deviceInfo: {
    deviceId: string;
    platform: string;
    appVersion: string;
    modelVersion: string;
  };
}

// Stored assessment (cloud)
export interface StoredAssessment {
  assessmentId: string;
  patientId: string;
  timestamp: Date;
  dayNumber: number;

  // Only derived metrics, no raw biometric data
  derivedMetrics: {
    speech: {
      articulationRate: number;
      meanPauseDuration: number;
      pauseFrequency: number;
      phoneticPrecision: number;
      voiceQuality: number;
    };
    facial: {
      symmetryScore: number;
      eyeOpennessRatio: number;
      mouthSymmetry: number;
    };
    reaction: {
      meanReactionTime: number;
      reactionTimeVariability: number;
      accuracy: number;
    };
  };

  deviations?: Deviation[];
  alertGenerated: boolean;

  metadata: {
    deviceId: string;
    platform: string;
    appVersion: string;
    modelVersion: string;
    processingTime: number;
  };
}

// Assessment session
export interface AssessmentSession {
  sessionId: string;
  patientId: string;
  startTime: Date;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
}
