// Baseline statistical measures
export interface MetricBaseline {
  mean: number;
  standardDeviation: number;
  min: number;
  max: number;
}

// Patient baseline profile
export interface Baseline {
  patientId: string;
  createdAt: Date;
  assessmentCount: number;
  speechMetrics: MetricBaseline;
  facialMetrics: MetricBaseline;
  reactionMetrics: MetricBaseline;
}
