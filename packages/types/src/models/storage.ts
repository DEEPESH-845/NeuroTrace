// Local storage and encryption interfaces

import { AssessmentResult } from './assessment';
import { Baseline } from './baseline';

// Encrypted data
export interface EncryptedData {
  encrypted: string;
  iv: string;
  authTag: string;
}

// Syncable data for offline queue
export interface SyncableData {
  id: string;
  type: 'ASSESSMENT' | 'ALERT_ACKNOWLEDGMENT' | 'GRADIENT';
  data: any;
  timestamp: Date;
  retryCount: number;
}

// Sync result
export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors?: Array<{
    id: string;
    error: string;
  }>;
}

// Local storage manager interface
export interface LocalStorageManager {
  saveAssessment(result: AssessmentResult): Promise<void>;
  getBaseline(patientId: string): Promise<Baseline | null>;
  saveBaseline(baseline: Baseline): Promise<void>;
  getRecentAssessments(patientId: string, days: number): Promise<AssessmentResult[]>;
  encryptData(data: any): Promise<EncryptedData>;
  decryptData(encrypted: EncryptedData): Promise<any>;
}

// Sync manager interface
export interface SyncManager {
  queueForSync(data: SyncableData): Promise<void>;
  syncWhenOnline(): Promise<SyncResult>;
  getQueuedItems(): Promise<SyncableData[]>;
  clearQueue(): Promise<void>;
}
