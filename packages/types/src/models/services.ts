// Backend service interfaces

import { DerivedMetrics } from './metrics';
import { StoredAssessment } from './assessment';
import { AlertRecord, AlertMessage, Recipient } from './alert';
import { TrendAnalysis } from './deviation';
import { FHIRBundle, FHIRObservation, FHIRCommunication, OAuth2Credentials, AccessToken } from './fhir';

// Assessment ingestion service interface
export interface AssessmentIngestionService {
  ingestAssessment(patientId: string, metrics: DerivedMetrics): Promise<void>;
  validateMetrics(metrics: DerivedMetrics): boolean;
  storeAssessment(assessment: StoredAssessment): Promise<void>;
}

// Alert generation service interface
export interface AlertGenerationService {
  generateAlert(trend: TrendAnalysis, patientId: string): Promise<AlertRecord>;
  determineRecipients(alert: AlertRecord): Promise<Recipient[]>;
  createAlertMessage(alert: AlertRecord): AlertMessage;
}

// Notification service interface
export interface NotificationService {
  sendPushNotification(recipient: Recipient, alert: AlertRecord): Promise<void>;
  sendSMS(phoneNumber: string, message: string): Promise<void>;
  sendEmail(email: string, subject: string, body: string): Promise<void>;
}

// FHIR integration service interface
export interface FHIRIntegrationService {
  exportPatientData(patientId: string): Promise<FHIRBundle>;
  createObservationResource(assessment: StoredAssessment): FHIRObservation;
  createCommunicationResource(alert: AlertRecord): FHIRCommunication;
  authenticateWithEHR(credentials: OAuth2Credentials): Promise<AccessToken>;
}

// Encryption service interface
export interface EncryptionService {
  encryptData(data: any, key: string): Promise<import('./storage').EncryptedData>;
  decryptData(encrypted: import('./storage').EncryptedData, key: string): Promise<any>;
  generateKey(): Promise<string>;
  rotateKeys(): Promise<void>;
}

// Audit log filter
export interface LogFilter {
  userId?: string;
  resource?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
}

// Audit log entry
export interface AuditLog {
  logId: string;
  userId: string;
  resource: string;
  action: string;
  timestamp: Date;
  ipAddress: string;
  details?: any;
}

// Audit logger interface
export interface AuditLogger {
  logAccess(userId: string, resource: string, action: string): Promise<void>;
  logDataExport(userId: string, patientId: string, dataType: string): Promise<void>;
  logSecurityEvent(event: import('./error').SecurityEvent): Promise<void>;
  queryLogs(filter: LogFilter): Promise<AuditLog[]>;
}
