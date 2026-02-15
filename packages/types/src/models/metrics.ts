// Speech biomarker metrics
export interface SpeechMetrics {
  articulationRate: number; // words per minute
  meanPauseDuration: number; // milliseconds
  pauseFrequency: number; // pauses per minute
  phoneticPrecision: number; // 0-1 score
  voiceQuality: number; // 0-1 score
  timestamp: Date;
}

// Facial asymmetry metrics
export interface FacialMetrics {
  symmetryScore: number; // 0-1, higher is more symmetric
  leftEyeOpenness: number; // 0-1
  rightEyeOpenness: number; // 0-1
  mouthSymmetry: number; // 0-1
  eyebrowSymmetry: number; // 0-1
  timestamp: Date;
}

// Reaction time metrics
export interface ReactionMetrics {
  meanReactionTime: number; // milliseconds
  reactionTimeVariability: number; // standard deviation
  correctResponses: number;
  totalTrials: number;
  timestamp: Date;
}

// Derived metrics (transmitted to cloud)
export interface DerivedMetrics {
  speechMetrics: SpeechMetrics;
  facialMetrics: FacialMetrics;
  reactionMetrics: ReactionMetrics;
  deviceId: string;
  timestamp: Date;
}
