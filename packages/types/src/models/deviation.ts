// Deviation from baseline
export interface Deviation {
  metricName: string;
  currentValue: number;
  baselineValue: number;
  standardDeviations: number;
  timestamp: Date;
}

// Trend analysis
export interface TrendAnalysis {
  sustainedDeviations: Deviation[];
  consecutiveDays: number;
  affectedModalities: string[];
  severity: AlertSeverity;
}

// Alert severity levels
export enum AlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}
