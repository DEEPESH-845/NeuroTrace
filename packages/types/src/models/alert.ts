import { AlertSeverity } from './deviation';

// Alert status
export enum AlertStatus {
  ACTIVE = 'ACTIVE',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  RESOLVED = 'RESOLVED',
  FALSE_POSITIVE = 'FALSE_POSITIVE',
}

// Alert record
export interface AlertRecord {
  alertId: string;
  patientId: string;
  severity: AlertSeverity;

  triggeringAssessments: string[]; // Assessment IDs
  sustainedDeviations: any[]; // Deviation[]
  affectedModalities: string[];
  consecutiveDays: number;

  message: string;
  recommendedActions: string[];

  status: AlertStatus;
  createdAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  clinicianNotes?: string;

  notifications: NotificationRecord[];
}

// Notification record
export interface NotificationRecord {
  notificationId: string;
  recipientId: string;
  recipientType: 'CAREGIVER' | 'CLINICIAN';
  channel: 'PUSH' | 'SMS' | 'EMAIL';
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
}

// Alert message
export interface AlertMessage {
  title: string;
  body: string;
  severity: AlertSeverity;
  patientId: string;
  alertId: string;
}

// Recipient for notifications
export interface Recipient {
  recipientId: string;
  recipientType: 'CAREGIVER' | 'CLINICIAN';
  pushToken?: string;
  phoneNumber?: string;
  email?: string;
}
