# Design Document: NeuroTrace Monitoring System

## Overview

NeuroTrace is a privacy-first, AI-powered neurological monitoring system that detects silent deterioration in post-stroke patients through daily multimodal assessments. The system architecture prioritizes on-device processing, federated learning, and HIPAA compliance while maintaining clinical-grade accuracy and scalability.

### Core Design Principles

1. **Privacy by Design**: All sensitive biometric data (voice, facial images) processed on-device; only derived metrics transmitted
2. **Federated Learning**: AI models improve across the patient population without centralizing PHI
3. **Clinical Accuracy**: 94% sensitivity, 97% specificity through personalized baselines and 3-day trend filtering
4. **Scalability**: Serverless architecture supporting 500 to 50,000+ patients
5. **Offline-First**: Full assessment and detection capabilities without internet connectivity

### Technology Stack

- **Mobile App**: React Native (iOS/Android) with TypeScript
- **On-Device AI**: ONNX Runtime with Phi-3-Mini (3.8B parameters), MediaPipe Face Mesh
- **Backend**: Azure Functions (Node.js/TypeScript), Azure Cosmos DB (NoSQL)
- **Federated Learning**: Azure ML + PySyft for gradient aggregation
- **Security**: SQLCipher (local encryption), Azure Key Vault, TLS 1.3
- **Integration**: FHIR R4 API, OAuth 2.0
- **Monitoring**: Azure Application Insights, Azure Monitor

## Architecture

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     PATIENT DEVICE (Edge)                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  React Native Mobile App                               │ │
│  │  ├─ Assessment UI (Voice, Facial, Reaction Time)       │ │
│  │  ├─ Local SQLCipher Database (Encrypted)               │ │
│  │  └─ Offline Sync Queue                                 │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  On-Device AI Engine (ONNX Runtime)                    │ │
│  │  ├─ Speech Biomarker Extraction (Phi-3-Mini)           │ │
│  │  ├─ Facial Asymmetry Detection (MediaPipe)             │ │
│  │  ├─ Baseline Computation Module                        │ │
│  │  ├─ Deviation Detection Algorithm                      │ │
│  │  └─ Federated Learning Client (PySyft)                 │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS/TLS 1.3
                            │ (Derived Metrics Only)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   AZURE CLOUD SERVICES                       │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  API Gateway (Azure API Management)                    │ │
│  │  ├─ OAuth 2.0 Authentication                           │ │
│  │  ├─ Rate Limiting & Throttling                         │ │
│  │  └─ Request Logging                                    │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Serverless Functions (Azure Functions)                │ │
│  │  ├─ Assessment Ingestion Service                       │ │
│  │  ├─ Alert Generation Service                           │ │
│  │  ├─ Notification Service (Push, SMS)                   │ │
│  │  ├─ FHIR Integration Service                           │ │
│  │  └─ Federated Learning Aggregator                      │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Data Layer                                            │ │
│  │  ├─ Cosmos DB (Patient Profiles, Assessments, Alerts)  │ │
│  │  ├─ Azure Blob Storage (Model Artifacts)               │ │
│  │  └─ Azure Key Vault (Secrets, Encryption Keys)         │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  ML Services                                           │ │
│  │  ├─ Azure ML (Federated Learning Orchestration)        │ │
│  │  └─ Model Registry (Versioned AI Models)               │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    WEB APPLICATIONS                          │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │ Clinician Dashboard  │  │  Admin Dashboard     │        │
│  │ (React + TypeScript) │  │  (React + TypeScript)│        │
│  └──────────────────────┘  └──────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Assessment Execution**: Patient completes 60-second assessment on mobile device
2. **On-Device Processing**: Raw biometric data processed locally, only derived metrics extracted
3. **Baseline Comparison**: Metrics compared against personalized baseline (stored locally)
4. **Deviation Detection**: Algorithm identifies deviations exceeding 2 standard deviations
5. **Trend Analysis**: System tracks deviations over 3 consecutive days
6. **Alert Generation**: Sustained trends trigger alerts sent to cloud
7. **Notification Delivery**: Cloud services send push notifications and SMS to caregivers
8. **Dashboard Update**: Clinician and admin dashboards reflect new data in real-time

## Components and Interfaces

### 1. Mobile Application (React Native)

**Responsibilities**:
- User interface for patient assessments
- Local data storage and encryption
- Offline functionality and sync queue
- Push notification handling

**Key Modules**:

```typescript
// Assessment Orchestrator
interface AssessmentOrchestrator {
  startAssessment(): Promise<AssessmentSession>;
  executeVoiceTask(session: AssessmentSession): Promise<VoiceMetrics>;
  executeFacialTask(session: AssessmentSession): Promise<FacialMetrics>;
  executeReactionTask(session: AssessmentSession): Promise<ReactionMetrics>;
  completeAssessment(session: AssessmentSession): Promise<AssessmentResult>;
}

// Local Storage Manager
interface LocalStorageManager {
  saveAssessment(result: AssessmentResult): Promise<void>;
  getBaseline(patientId: string): Promise<Baseline | null>;
  saveBaseline(baseline: Baseline): Promise<void>;
  getRecentAssessments(patientId: string, days: number): Promise<AssessmentResult[]>;
  encryptData(data: any): Promise<EncryptedData>;
  decryptData(encrypted: EncryptedData): Promise<any>;
}

// Sync Manager
interface SyncManager {
  queueForSync(data: SyncableData): Promise<void>;
  syncWhenOnline(): Promise<SyncResult>;
  getQueuedItems(): Promise<SyncableData[]>;
  clearQueue(): Promise<void>;
}
```

### 2. On-Device AI Engine (ONNX Runtime)

**Responsibilities**:
- Speech biomarker extraction from voice recordings
- Facial asymmetry detection from camera images
- Baseline computation from first 7 days of data
- Deviation detection and trend analysis
- Federated learning gradient computation

**Key Modules**:

```typescript
// Speech Biomarker Extractor
interface SpeechBiomarkerExtractor {
  extractBiomarkers(audioBuffer: Float32Array): Promise<SpeechMetrics>;
  computeArticulationRate(audio: Float32Array): number;
  detectPauseDuration(audio: Float32Array): number[];
  analyzePhoneticPrecision(audio: Float32Array): number;
}

interface SpeechMetrics {
  articulationRate: number;        // words per minute
  meanPauseDuration: number;        // milliseconds
  pauseFrequency: number;           // pauses per minute
  phoneticPrecision: number;        // 0-1 score
  voiceQuality: number;             // 0-1 score
  timestamp: Date;
}

// Facial Asymmetry Detector
interface FacialAsymmetryDetector {
  detectAsymmetry(imageData: ImageData): Promise<FacialMetrics>;
  extractFacialLandmarks(image: ImageData): FacialLandmarks;
  computeSymmetryScore(landmarks: FacialLandmarks): number;
}

interface FacialMetrics {
  symmetryScore: number;            // 0-1, higher is more symmetric
  leftEyeOpenness: number;          // 0-1
  rightEyeOpenness: number;         // 0-1
  mouthSymmetry: number;            // 0-1
  eyebrowSymmetry: number;          // 0-1
  timestamp: Date;
}

// Baseline Computer
interface BaselineComputer {
  computeBaseline(assessments: AssessmentResult[]): Promise<Baseline>;
  validateBaselineQuality(baseline: Baseline): boolean;
  updateBaseline(current: Baseline, newAssessment: AssessmentResult): Promise<Baseline>;
}

interface Baseline {
  patientId: string;
  createdAt: Date;
  assessmentCount: number;
  speechMetrics: MetricBaseline;
  facialMetrics: MetricBaseline;
  reactionMetrics: MetricBaseline;
}

interface MetricBaseline {
  mean: number;
  standardDeviation: number;
  min: number;
  max: number;
}

// Deviation Detector
interface DeviationDetector {
  detectDeviations(current: AssessmentResult, baseline: Baseline): Promise<Deviation[]>;
  analyzeTrends(recentAssessments: AssessmentResult[], baseline: Baseline): Promise<TrendAnalysis>;
  computeSeverity(trends: TrendAnalysis): AlertSeverity;
}

interface Deviation {
  metricName: string;
  currentValue: number;
  baselineValue: number;
  standardDeviations: number;
  timestamp: Date;
}

interface TrendAnalysis {
  sustainedDeviations: Deviation[];
  consecutiveDays: number;
  affectedModalities: string[];
  severity: AlertSeverity;
}

enum AlertSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH"
}
```

### 3. Backend Services (Azure Functions)

**Responsibilities**:
- Assessment data ingestion and storage
- Alert generation and notification delivery
- FHIR integration with EHR systems
- Federated learning model aggregation
- User authentication and authorization

**Key Services**:

```typescript
// Assessment Ingestion Service
interface AssessmentIngestionService {
  ingestAssessment(patientId: string, metrics: DerivedMetrics): Promise<void>;
  validateMetrics(metrics: DerivedMetrics): boolean;
  storeAssessment(assessment: StoredAssessment): Promise<void>;
}

interface DerivedMetrics {
  speechMetrics: SpeechMetrics;
  facialMetrics: FacialMetrics;
  reactionMetrics: ReactionMetrics;
  deviceId: string;
  timestamp: Date;
}

// Alert Generation Service
interface AlertGenerationService {
  generateAlert(trend: TrendAnalysis, patientId: string): Promise<Alert>;
  determineRecipients(alert: Alert): Promise<Recipient[]>;
  createAlertMessage(alert: Alert): AlertMessage;
}

interface Alert {
  alertId: string;
  patientId: string;
  severity: AlertSeverity;
  trends: TrendAnalysis;
  message: string;
  recommendedActions: string[];
  createdAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
}

// Notification Service
interface NotificationService {
  sendPushNotification(recipient: Recipient, alert: Alert): Promise<void>;
  sendSMS(phoneNumber: string, message: string): Promise<void>;
  sendEmail(email: string, subject: string, body: string): Promise<void>;
}

// FHIR Integration Service
interface FHIRIntegrationService {
  exportPatientData(patientId: string): Promise<FHIRBundle>;
  createObservationResource(assessment: StoredAssessment): FHIRObservation;
  createCommunicationResource(alert: Alert): FHIRCommunication;
  authenticateWithEHR(credentials: OAuth2Credentials): Promise<AccessToken>;
}
```

### 4. Federated Learning System

**Responsibilities**:
- Aggregate model gradients from patient devices
- Train global models without accessing raw patient data
- Distribute updated models to devices
- Validate gradient privacy

**Architecture**:

```typescript
// Federated Learning Coordinator
interface FederatedLearningCoordinator {
  collectGradients(deviceId: string, gradients: ModelGradients): Promise<void>;
  aggregateGradients(gradients: ModelGradients[]): Promise<GlobalModel>;
  validatePrivacy(gradients: ModelGradients): boolean;
  distributeModel(model: GlobalModel): Promise<void>;
}

interface ModelGradients {
  deviceId: string;
  modelVersion: string;
  gradients: Float32Array;
  sampleCount: number;
  timestamp: Date;
}

interface GlobalModel {
  modelVersion: string;
  weights: Float32Array;
  accuracy: number;
  createdAt: Date;
}
```

### 5. Clinician Dashboard (React Web App)

**Responsibilities**:
- Display patient list and status
- Visualize assessment trends over time
- Show alerts and allow acknowledgment
- Export FHIR-compliant reports

**Key Components**:

```typescript
// Patient List Component
interface PatientListComponent {
  fetchPatients(clinicianId: string): Promise<PatientSummary[]>;
  filterByStatus(status: PatientStatus): PatientSummary[];
  sortByPriority(): PatientSummary[];
}

interface PatientSummary {
  patientId: string;
  name: string;
  status: PatientStatus;
  lastAssessment: Date;
  activeAlerts: number;
  daysInProgram: number;
}

enum PatientStatus {
  ON_TRACK = "ON_TRACK",
  NEEDS_ATTENTION = "NEEDS_ATTENTION",
  ALERT = "ALERT"
}

// Time Series Visualization Component
interface TimeSeriesVisualization {
  renderMetricChart(patientId: string, metric: string, dateRange: DateRange): void;
  highlightDeviations(deviations: Deviation[]): void;
  showBaseline(baseline: Baseline): void;
}

// Alert Management Component
interface AlertManagementComponent {
  fetchAlerts(patientId: string): Promise<Alert[]>;
  acknowledgeAlert(alertId: string, clinicianId: string): Promise<void>;
  exportAlertReport(alertId: string): Promise<FHIRCommunication>;
}
```

## Data Models

### Patient Profile

```typescript
interface PatientProfile {
  patientId: string;
  demographics: {
    dateOfBirth: Date;
    gender: string;
  };
  clinicalInfo: {
    strokeDate: Date;
    strokeType: string;
    dischargeDate: Date;
    assignedClinician: string;
    assignedHospital: string;
  };
  programInfo: {
    enrollmentDate: Date;
    programEndDate: Date;
    baselineEstablished: boolean;
    baselineCompletionDate?: Date;
  };
  preferences: {
    assessmentTime: string;        // HH:MM format
    timezone: string;
    language: string;
  };
  caregivers: CaregiverInfo[];
  createdAt: Date;
  updatedAt: Date;
}

interface CaregiverInfo {
  caregiverId: string;
  name: string;
  relationship: string;
  phoneNumber: string;
  email: string;
  notificationPreferences: {
    pushEnabled: boolean;
    smsEnabled: boolean;
    emailEnabled: boolean;
  };
}
```

### Assessment Result

```typescript
interface AssessmentResult {
  assessmentId: string;
  patientId: string;
  timestamp: Date;
  dayNumber: number;                // Day since enrollment
  isBaselinePeriod: boolean;
  
  speechMetrics: SpeechMetrics;
  facialMetrics: FacialMetrics;
  reactionMetrics: ReactionMetrics;
  
  deviations?: Deviation[];
  trendAnalysis?: TrendAnalysis;
  
  completionTime: number;           // seconds
  deviceInfo: {
    deviceId: string;
    platform: string;
    appVersion: string;
    modelVersion: string;
  };
}

interface ReactionMetrics {
  meanReactionTime: number;         // milliseconds
  reactionTimeVariability: number;  // standard deviation
  correctResponses: number;
  totalTrials: number;
  timestamp: Date;
}
```

### Stored Assessment (Cloud)

```typescript
interface StoredAssessment {
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
```

### Alert Record

```typescript
interface AlertRecord {
  alertId: string;
  patientId: string;
  severity: AlertSeverity;
  
  triggeringAssessments: string[];  // Assessment IDs
  sustainedDeviations: Deviation[];
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

enum AlertStatus {
  ACTIVE = "ACTIVE",
  ACKNOWLEDGED = "ACKNOWLEDGED",
  RESOLVED = "RESOLVED",
  FALSE_POSITIVE = "FALSE_POSITIVE"
}

interface NotificationRecord {
  notificationId: string;
  recipientId: string;
  recipientType: "CAREGIVER" | "CLINICIAN";
  channel: "PUSH" | "SMS" | "EMAIL";
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
}
```

## API Design

### REST API Endpoints

```typescript
// Assessment Endpoints
POST   /api/v1/assessments
  Body: { patientId: string, derivedMetrics: DerivedMetrics }
  Response: { assessmentId: string, alertGenerated: boolean }

GET    /api/v1/patients/:patientId/assessments
  Query: { startDate?: string, endDate?: string, limit?: number }
  Response: { assessments: StoredAssessment[] }

// Alert Endpoints
GET    /api/v1/patients/:patientId/alerts
  Query: { status?: AlertStatus, limit?: number }
  Response: { alerts: AlertRecord[] }

POST   /api/v1/alerts/:alertId/acknowledge
  Body: { clinicianId: string, notes?: string }
  Response: { alert: AlertRecord }

// Patient Endpoints
GET    /api/v1/patients/:patientId
  Response: { patient: PatientProfile }

PUT    /api/v1/patients/:patientId
  Body: Partial<PatientProfile>
  Response: { patient: PatientProfile }

GET    /api/v1/patients/:patientId/baseline
  Response: { baseline: Baseline | null }

// Clinician Dashboard Endpoints
GET    /api/v1/clinicians/:clinicianId/patients
  Query: { status?: PatientStatus }
  Response: { patients: PatientSummary[] }

// FHIR Endpoints
GET    /fhir/Patient/:patientId
  Response: FHIR Patient Resource

GET    /fhir/Observation
  Query: { patient: string, category: string, date: string }
  Response: FHIR Bundle of Observation Resources

POST   /fhir/Communication
  Body: FHIR Communication Resource
  Response: FHIR Communication Resource with ID

// Federated Learning Endpoints
POST   /api/v1/federated/gradients
  Body: { deviceId: string, gradients: ModelGradients }
  Response: { accepted: boolean }

GET    /api/v1/federated/model/:version
  Response: { model: GlobalModel }
```

### Authentication

All API endpoints require OAuth 2.0 Bearer tokens:

```
Authorization: Bearer <access_token>
```

Token scopes:
- `patient:read` - Read patient data
- `patient:write` - Write patient data
- `assessment:write` - Submit assessments
- `alert:read` - Read alerts
- `alert:write` - Acknowledge alerts
- `fhir:read` - Read FHIR resources
- `fhir:write` - Write FHIR resources

## Security Design

### HIPAA Compliance

1. **Encryption at Rest**:
   - Mobile: SQLCipher with AES-256
   - Cloud: Azure Cosmos DB encryption, Azure Blob Storage encryption
   - Keys managed in Azure Key Vault

2. **Encryption in Transit**:
   - TLS 1.3 for all network communication
   - Certificate pinning in mobile app

3. **Access Control**:
   - Role-Based Access Control (RBAC)
   - Roles: Patient, Caregiver, Clinician, Admin
   - Principle of least privilege

4. **Audit Logging**:
   - All PHI access logged with timestamp, user, action
   - Logs stored for 6 years
   - Automated log analysis for suspicious activity

5. **Data Minimization**:
   - Raw biometric data never leaves device
   - Only derived metrics transmitted
   - Automatic data retention policies

### Privacy-Preserving Architecture

1. **On-Device Processing**:
   - All voice recordings processed locally
   - All facial images processed locally
   - Raw data deleted after metric extraction

2. **Federated Learning**:
   - Model gradients computed on-device
   - Differential privacy applied to gradients
   - Secure aggregation prevents individual gradient inspection

3. **Anonymization**:
   - Device IDs rotated periodically
   - No direct identifiers in assessment data
   - Patient ID encrypted in transit

### Security Measures

```typescript
// Encryption Service
interface EncryptionService {
  encryptData(data: any, key: string): Promise<EncryptedData>;
  decryptData(encrypted: EncryptedData, key: string): Promise<any>;
  generateKey(): Promise<string>;
  rotateKeys(): Promise<void>;
}

// Audit Logger
interface AuditLogger {
  logAccess(userId: string, resource: string, action: string): Promise<void>;
  logDataExport(userId: string, patientId: string, dataType: string): Promise<void>;
  logSecurityEvent(event: SecurityEvent): Promise<void>;
  queryLogs(filter: LogFilter): Promise<AuditLog[]>;
}

interface SecurityEvent {
  eventType: "UNAUTHORIZED_ACCESS" | "FAILED_LOGIN" | "DATA_BREACH" | "SUSPICIOUS_ACTIVITY";
  userId?: string;
  ipAddress: string;
  timestamp: Date;
  details: any;
}
```

## Error Handling

### Error Categories

1. **Network Errors**: Handled by offline queue and retry logic
2. **Validation Errors**: User-friendly messages, guidance to correct
3. **AI Processing Errors**: Fallback to previous model version, alert development team
4. **Data Integrity Errors**: Automatic rollback, alert administrators
5. **Security Errors**: Immediate lockout, audit log entry, security team notification

### Error Response Format

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: Date;
    requestId: string;
  };
}

// Example error codes
enum ErrorCode {
  INVALID_INPUT = "INVALID_INPUT",
  UNAUTHORIZED = "UNAUTHORIZED",
  RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
}
```

### Retry Logic

```typescript
interface RetryPolicy {
  maxAttempts: number;
  backoffStrategy: "EXPONENTIAL" | "LINEAR";
  initialDelay: number;
  maxDelay: number;
  retryableErrors: ErrorCode[];
}

// Default retry policy for network requests
const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  backoffStrategy: "EXPONENTIAL",
  initialDelay: 1000,      // 1 second
  maxDelay: 30000,         // 30 seconds
  retryableErrors: [
    ErrorCode.SERVICE_UNAVAILABLE,
    ErrorCode.RATE_LIMIT_EXCEEDED
  ]
};
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Baseline Establishment from Valid Assessments

*For any* sequence of at least 5 assessments completed during days 1-7, when the system computes a baseline, the resulting baseline should contain valid statistical measures (mean, standard deviation, min, max) for all three modalities (speech, facial, reaction), and the baseline should only be marked as established after the required minimum assessments are completed.

**Validates: Requirements 1.3, 1.4, 1.6**

### Property 2: Baseline Extension on Missed Assessments

*For any* baseline period where more than 2 assessments are missed, the baseline completion date should be extended by exactly the number of missed days beyond the initial 7-day period.

**Validates: Requirements 1.5**

### Property 3: Assessment Reminder Scheduling

*For any* valid time preference (HH:MM format) and timezone, when a patient completes onboarding, a daily reminder should be scheduled at that exact time in the patient's timezone.

**Validates: Requirements 1.2**

### Property 4: Assessment Completion Time Bound

*For any* completed assessment, the total active interaction time (excluding wait times) should not exceed 60 seconds.

**Validates: Requirements 2.3**

### Property 5: Multimodal Biomarker Extraction

*For any* completed assessment, the system should extract all required biomarkers: speech metrics (articulation rate, pause duration, pause frequency, phonetic precision, voice quality), facial metrics (symmetry score, eye openness ratio, mouth symmetry), and reaction metrics (mean reaction time, variability, accuracy).

**Validates: Requirements 2.4, 2.5, 2.6**

### Property 6: On-Device Processing Privacy

*For any* assessment, after processing is complete, the local storage should contain only derived metrics (numerical values), and network traffic monitoring should show zero transmission of raw voice recordings, facial images, or video data to cloud services.

**Validates: Requirements 2.7, 2.9, 6.1, 6.2, 6.3, 6.4**

### Property 7: Assessment Rescheduling Window

*For any* incomplete assessment, rescheduling should be permitted if requested within 4 hours of the original scheduled time, and should be rejected if requested after 4 hours.

**Validates: Requirements 2.8**

### Property 8: Deviation Detection Threshold

*For any* post-baseline assessment (day 8+), when a metric value differs from the baseline mean by more than 2 standard deviations, the system should flag it as a deviation.

**Validates: Requirements 3.1, 3.2**

### Property 9: Sustained Trend Detection

*For any* sequence of 3 consecutive days where the same metric shows a deviation, the system should classify it as a sustained trend and generate an alert with appropriate severity (Low, Medium, or High).

**Validates: Requirements 3.3, 3.4**

### Property 10: Multi-Modality Severity Escalation

*For any* alert, if sustained trends are detected in multiple modalities simultaneously (e.g., both speech and facial), the severity level should be higher than if only a single modality showed trends.

**Validates: Requirements 3.5, 3.6**

### Property 11: Single-Day Anomaly Filtering

*For any* single-day deviation that does not persist for 3 consecutive days, no alert should be generated, ensuring that transient anomalies are filtered out.

**Validates: Requirements 3.7**

### Property 12: Alert Notification Delivery

*For any* generated alert, a push notification should be sent to all linked caregivers' devices, and if the alert severity is High, an SMS should also be sent to the caregiver's phone number.

**Validates: Requirements 4.1, 4.3, 11.4**

### Property 13: Alert Content Completeness

*For any* generated alert, the alert message should include: a plain-language summary of which metrics changed, recommended actions, and time-series data for visualization.

**Validates: Requirements 4.2, 4.4, 4.5**

### Property 14: Alert Acknowledgment Tracking

*For any* alert that is acknowledged by a caregiver or clinician, the system should record the acknowledgment timestamp and the acknowledging user's identity, and this information should be visible on both the caregiver app and clinician dashboard.

**Validates: Requirements 4.7, 11.6**

### Property 15: Clinician Dashboard Data Completeness

*For any* patient selected in the clinician dashboard, the displayed data should include: time-series visualizations of all assessment metrics, baseline values alongside current metrics, alert history with acknowledgment status, and visual indicators for sustained trends.

**Validates: Requirements 5.2, 5.3, 5.4, 5.7**

### Property 16: Dashboard Filtering Correctness

*For any* date range filter and metric type filter applied to patient data, the returned results should include only assessments within the specified date range and only the specified metric types.

**Validates: Requirements 5.5**

### Property 17: Patient Prioritization by Alert Severity

*For any* clinician dashboard view showing multiple patients with active alerts, the patients should be ordered with High severity alerts first, then Medium, then Low.

**Validates: Requirements 5.8**

### Property 18: FHIR Compliance

*For any* patient data export or alert, the generated FHIR resources (Observation for assessments, Communication for alerts) should validate successfully against the FHIR R4 schema.

**Validates: Requirements 5.6, 9.1, 9.3**

### Property 19: LOINC Code Mapping

*For any* assessment metric that has a standard LOINC code mapping, the FHIR Observation resource should include the correct LOINC code in the coding field.

**Validates: Requirements 9.6**

### Property 20: Data Encryption at Rest and in Transit

*For any* data stored locally on the device, it should be encrypted using AES-256 (via SQLCipher), and for any data transmitted over the network, the connection should use TLS 1.3.

**Validates: Requirements 6.5, 6.6, 6.7**

### Property 21: Biometric Data Retention Limit

*For any* assessment, raw biometric data (voice recordings, facial images) should not exist in local storage more than 5 seconds after the assessment processing is complete.

**Validates: Requirements 6.8**

### Property 22: Federated Learning Gradient Transmission

*For any* device that has completed 30 assessments, the system should compute model gradients and transmit only the gradients (not raw patient data) to the cloud federated learning service.

**Validates: Requirements 7.1, 7.2**

### Property 23: Federated Learning Opt-Out

*For any* patient who opts out of model improvement, the system should not transmit gradients to the cloud, but all monitoring functionality (assessments, deviation detection, alerts) should continue to work normally.

**Validates: Requirements 7.6**

### Property 24: Global Model Distribution

*For any* new global model published by the federated learning service, all active patient devices should download and deploy the new model within 24 hours.

**Validates: Requirements 7.4**

### Property 25: PHI Access Audit Logging

*For any* access to protected health information (patient data, assessments, alerts), the system should create an audit log entry containing: timestamp, user identity, resource accessed, and action performed.

**Validates: Requirements 8.2**

### Property 26: Role-Based Access Control

*For any* user attempting to access a resource, the system should permit access only if the user's role has the required permissions for that resource type and action.

**Validates: Requirements 8.3**

### Property 27: Data Deletion Completeness

*For any* patient who requests data deletion, after the deletion process completes, no PHI for that patient should remain in any database, storage system, or log (except audit logs required for compliance).

**Validates: Requirements 8.5**

### Property 28: Audit Log Retention

*For any* audit log entry, it should be retained in the system for at least 6 years from the creation date and should not be deleted before that time.

**Validates: Requirements 8.7**

### Property 29: Security Incident Notification Timing

*For any* detected security incident, a notification should be sent to the security team within 1 hour of detection.

**Validates: Requirements 8.8**

### Property 30: On-Device Processing Performance

*For any* completed assessment, the on-device AI processing time (from raw data to derived metrics) should not exceed 5 seconds.

**Validates: Requirements 10.2**

### Property 31: Slow Query Logging

*For any* database query that takes longer than 100 milliseconds to execute, a performance warning should be logged with the query details and execution time.

**Validates: Requirements 10.6**

### Property 32: Caregiver Account Linking

*For any* valid invitation code, a caregiver should be able to link their account to the patient, and for any invalid or expired invitation code, the linking should be rejected with an appropriate error message.

**Validates: Requirements 11.1**

### Property 33: Caregiver Status Display

*For any* patient, the caregiver app should display the correct status (On Track, Needs Attention, Alert) based on the patient's recent assessment data and any active alerts.

**Validates: Requirements 11.3**

### Property 34: Accuracy Metrics Reporting

*For any* time period, the system should calculate and report detection accuracy metrics (sensitivity, specificity, false positive rate) to hospital administrators.

**Validates: Requirements 12.5**

### Property 35: Accuracy Threshold Alerting

*For any* time period where detection accuracy falls below the defined thresholds (94% sensitivity, 97% specificity, 3% false positive rate), the system should send an alert to the development team.

**Validates: Requirements 12.6**

### Property 36: Voice Command Navigation

*For any* supported voice command, when spoken by the patient, the system should navigate to the correct screen or perform the correct action.

**Validates: Requirements 13.1**

### Property 37: Minimum Font Size Compliance

*For any* text element in the user interface, the font size should be at least 18 points to ensure readability for patients with visual impairments.

**Validates: Requirements 13.2**

### Property 38: Reading Level Compliance

*For any* assessment instruction text, when analyzed with a readability algorithm (e.g., Flesch-Kincaid), the reading level should be at or below 6th grade.

**Validates: Requirements 13.4**

### Property 39: Audio Instruction Availability

*For any* assessment task, there should be an associated audio instruction file that can be played to guide the patient.

**Validates: Requirements 13.5**

### Property 40: Assessment Error Guidance

*For any* error made by the patient during an assessment (e.g., speaking too quietly, face not visible), the system should display a gentle guidance message and allow the patient to retry.

**Validates: Requirements 13.6**

### Property 41: Offline Assessment Completion

*For any* assessment started when the device has no internet connection, the assessment should complete successfully, with all processing happening on-device using locally stored models.

**Validates: Requirements 14.1, 14.2**

### Property 42: Assessment Data Synchronization

*For any* assessment completed while offline, when internet connectivity is restored, the assessment results should be transmitted to the cloud within 5 minutes.

**Validates: Requirements 14.3**

### Property 43: Local Storage Capacity

*For any* device, the system should be able to store at least 30 days worth of assessment data locally (approximately 30 assessment records with derived metrics).

**Validates: Requirements 14.4**

### Property 44: Prolonged Offline Notification

*For any* device that has been offline for more than 7 consecutive days, the system should display a notification to the patient requesting them to connect to the internet.

**Validates: Requirements 14.5**

### Property 45: Offline Deviation Detection

*For any* assessment completed offline (after baseline is established), the deviation detection algorithm should function correctly using the locally stored baseline, without requiring cloud connectivity.

**Validates: Requirements 14.6**

### Property 46: Aggregate Metrics Calculation

*For any* set of enrolled patients, the admin dashboard should correctly calculate aggregate metrics including: total enrolled patients, average assessment completion rate, total alerts generated, and alert distribution by severity.

**Validates: Requirements 15.1**

### Property 47: Readmission Rate Calculation

*For any* 30-day period, the admin dashboard should calculate the readmission rate as: (number of patients readmitted within 30 days) / (total patients discharged in that period) × 100.

**Validates: Requirements 15.2**

### Property 48: Engagement Rate Calculation

*For any* patient, the engagement rate should be calculated as: (number of completed assessments) / (number of scheduled assessments) × 100.

**Validates: Requirements 15.3**

### Property 49: Cost Savings Calculation

*For any* reporting period, the cost savings should be calculated as: (number of prevented readmissions) × (average cost per readmission) - (program cost per patient × number of patients).

**Validates: Requirements 15.4**

### Property 50: Clinician Response Time Tracking

*For any* alert, the response time should be calculated as the duration between alert creation timestamp and acknowledgment timestamp, and these times should be aggregated by clinician for reporting.

**Validates: Requirements 15.5**

### Property 51: CSV Export Validity

*For any* aggregate data export, the generated CSV file should be valid (proper escaping, consistent column count, valid UTF-8 encoding) and should open correctly in standard spreadsheet applications.

**Validates: Requirements 15.6**

### Property 52: Trend Calculation Across Time Periods

*For any* metric and time period (monthly, quarterly, yearly), the admin dashboard should calculate trends by comparing the average value in the current period to the average value in the previous period.

**Validates: Requirements 15.7**


## Testing Strategy

### Overview

NeuroTrace requires a comprehensive testing approach that balances clinical accuracy, privacy compliance, and system reliability. We will employ a dual testing strategy combining property-based testing for universal correctness properties and unit testing for specific examples and edge cases.

### Property-Based Testing

**Framework Selection**:
- **Mobile (React Native/TypeScript)**: fast-check
- **Backend (Node.js/TypeScript)**: fast-check
- **Python Components**: Hypothesis

**Configuration**:
- Minimum 100 iterations per property test (due to randomization)
- Each test tagged with: **Feature: neurotrace-monitoring-system, Property {N}: {property_text}**
- Shrinking enabled to find minimal failing examples
- Seed-based reproducibility for CI/CD

**Property Test Coverage**:

All 52 correctness properties defined above should be implemented as property-based tests. Key areas include:

1. **Baseline Computation** (Properties 1-2): Generate random assessment sequences, verify baseline statistics
2. **Deviation Detection** (Properties 8-11): Generate random metrics and baselines, verify detection logic
3. **Alert Generation** (Properties 9-14): Generate random trend patterns, verify alert creation and delivery
4. **Privacy Guarantees** (Properties 6, 20-21): Monitor data flows, verify no PHI leakage
5. **FHIR Compliance** (Properties 18-19): Generate random patient data, verify FHIR validation
6. **Offline Functionality** (Properties 41-45): Simulate offline conditions, verify full functionality
7. **Access Control** (Property 26): Generate random user/resource combinations, verify RBAC
8. **Calculations** (Properties 46-52): Generate random datasets, verify mathematical correctness

**Example Property Test Structure**:

```typescript
// Property 1: Baseline Establishment
import fc from 'fast-check';

describe('Feature: neurotrace-monitoring-system, Property 1: Baseline Establishment from Valid Assessments', () => {
  it('should compute valid baseline from 5-7 assessments', () => {
    fc.assert(
      fc.property(
        fc.array(assessmentArbitrary(), { minLength: 5, maxLength: 7 }),
        (assessments) => {
          const baseline = computeBaseline(assessments);
          
          // Verify baseline has all required fields
          expect(baseline.speechMetrics).toBeDefined();
          expect(baseline.facialMetrics).toBeDefined();
          expect(baseline.reactionMetrics).toBeDefined();
          
          // Verify statistical measures are valid
          expect(baseline.speechMetrics.mean).toBeGreaterThan(0);
          expect(baseline.speechMetrics.standardDeviation).toBeGreaterThanOrEqual(0);
          expect(baseline.speechMetrics.min).toBeLessThanOrEqual(baseline.speechMetrics.mean);
          expect(baseline.speechMetrics.max).toBeGreaterThanOrEqual(baseline.speechMetrics.mean);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Unit Testing

**Framework Selection**:
- **Mobile**: Jest + React Native Testing Library
- **Backend**: Jest + Supertest (API testing)
- **Python**: pytest

**Unit Test Focus Areas**:

Unit tests complement property tests by covering:

1. **Specific Examples**:
   - Onboarding flow displays correct screens (Requirement 1.1)
   - FHIR API endpoints return expected responses (Requirement 9.2)
   - OAuth 2.0 authentication flow works (Requirement 9.4)
   - SQLCipher database initialization (Requirement 6.6)

2. **Edge Cases**:
   - Empty assessment data handling
   - Boundary conditions (exactly 2 missed assessments, exactly 3 consecutive deviations)
   - Maximum local storage capacity (30 days of data)
   - Timezone edge cases (DST transitions, UTC boundaries)

3. **Error Conditions**:
   - Invalid invitation codes rejected
   - Malformed FHIR resources rejected
   - Network timeouts handled gracefully
   - Insufficient permissions denied

4. **Integration Points**:
   - Mobile app to backend API integration
   - Backend to Azure Cosmos DB integration
   - FHIR API to EHR system integration
   - Push notification service integration

**Example Unit Test Structure**:

```typescript
// Unit test for specific example
describe('Onboarding Flow', () => {
  it('should display welcome screen on first launch', async () => {
    const { getByText } = render(<OnboardingFlow />);
    
    expect(getByText('Welcome to NeuroTrace')).toBeTruthy();
    expect(getByText('Get Started')).toBeTruthy();
  });
  
  it('should reject invalid invitation codes', async () => {
    const result = await linkCaregiverAccount('INVALID123');
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid or expired invitation code');
  });
});
```

### Integration Testing

**Scope**:
- End-to-end assessment flow (mobile app → on-device AI → backend → dashboard)
- Alert generation and notification delivery pipeline
- FHIR integration with mock EHR systems
- Federated learning gradient aggregation

**Tools**:
- Detox (React Native E2E testing)
- Postman/Newman (API integration testing)
- Azure DevTest Labs (cloud integration testing)

### Performance Testing

**Load Testing**:
- Simulate 500, 5,000, and 50,000 concurrent patients
- Verify backend maintains <2s response times at scale
- Verify 99.5% uptime under load

**Tools**:
- Apache JMeter for backend load testing
- Azure Load Testing for cloud services

**Performance Benchmarks**:
- On-device AI processing: <5 seconds per assessment
- Dashboard load time: <2 seconds for 95% of requests
- API response time: <500ms for 95% of requests
- Database query time: <100ms for 95% of queries

### Security Testing

**Automated Security Scans**:
- SAST (Static Application Security Testing): SonarQube
- DAST (Dynamic Application Security Testing): OWASP ZAP
- Dependency vulnerability scanning: npm audit, Snyk
- Container scanning: Azure Defender for Containers

**Manual Security Testing**:
- Penetration testing (annual)
- HIPAA compliance audit (annual)
- Privacy impact assessment (before major releases)

**Security Test Cases**:
- SQL injection attempts
- XSS (Cross-Site Scripting) attempts
- CSRF (Cross-Site Request Forgery) protection
- Authentication bypass attempts
- Authorization escalation attempts
- PHI leakage detection

### Clinical Validation Testing

**Validation Dataset**:
- 200 patients, 6-month monitoring period
- Ground truth: Clinical assessments by neurologists
- Metrics: Sensitivity, specificity, false positive rate, false negative rate

**Validation Process**:
1. Collect assessment data from validation cohort
2. Run deviation detection algorithm
3. Compare system alerts to clinical ground truth
4. Calculate accuracy metrics
5. Iterate on algorithm parameters to meet targets (94% sensitivity, 97% specificity)

**Note**: Clinical validation is separate from automated testing and requires IRB approval and clinical trial infrastructure.

### Accessibility Testing

**Automated Tools**:
- axe-core for WCAG 2.1 Level AA compliance
- React Native Accessibility Inspector

**Manual Testing**:
- Screen reader testing (VoiceOver on iOS, TalkBack on Android)
- Voice command testing
- High contrast mode testing
- Large font size testing

**Test Cases**:
- All interactive elements have accessible labels
- Color contrast ratios meet WCAG standards
- Voice commands work for all navigation
- Audio instructions play correctly
- Error messages are announced by screen readers

### Continuous Integration/Continuous Deployment (CI/CD)

**Pipeline Stages**:

1. **Code Quality**:
   - Linting (ESLint, Prettier)
   - Type checking (TypeScript)
   - Code coverage (minimum 80%)

2. **Automated Testing**:
   - Unit tests (all must pass)
   - Property tests (all must pass)
   - Integration tests (all must pass)

3. **Security Scanning**:
   - SAST scan
   - Dependency vulnerability scan
   - Container scan

4. **Build**:
   - Mobile app builds (iOS, Android)
   - Backend deployment packages
   - Docker container images

5. **Deployment**:
   - Dev environment (automatic on merge to develop)
   - Staging environment (automatic on merge to main)
   - Production environment (manual approval required)

**Tools**:
- GitHub Actions for CI/CD orchestration
- Azure DevOps for deployment pipelines
- Azure App Center for mobile app distribution

### Test Data Management

**Synthetic Data Generation**:
- Use fast-check and Hypothesis to generate realistic test data
- Create patient profiles with varied demographics
- Generate assessment sequences with realistic patterns
- Simulate various deterioration scenarios

**Test Data Privacy**:
- Never use real patient data in testing
- All test data is synthetic and anonymized
- Test databases are separate from production
- Test data is automatically purged after test runs

### Monitoring and Observability

**Application Monitoring**:
- Azure Application Insights for telemetry
- Custom metrics: assessment completion rate, alert generation rate, API latency
- Error tracking and alerting

**Performance Monitoring**:
- Database query performance
- API endpoint response times
- On-device AI processing times
- Mobile app crash rates

**Security Monitoring**:
- Failed authentication attempts
- Unauthorized access attempts
- Unusual data access patterns
- Security incident detection and alerting

**Dashboards**:
- Real-time system health dashboard
- Performance metrics dashboard
- Security events dashboard
- Clinical accuracy metrics dashboard

### Test Coverage Goals

**Code Coverage Targets**:
- Overall: 80% minimum
- Critical paths (assessment, deviation detection, alerts): 95% minimum
- Security-critical code (authentication, authorization, encryption): 100%

**Property Coverage**:
- All 52 correctness properties implemented as property tests
- Each property test runs minimum 100 iterations
- Property tests cover all major system behaviors

**Integration Coverage**:
- All API endpoints tested
- All user flows tested end-to-end
- All third-party integrations tested with mocks

### Testing Timeline

**Pre-Development**:
- Set up testing infrastructure
- Create test data generators
- Define property test arbitraries

**During Development**:
- Write unit tests alongside implementation (TDD where appropriate)
- Write property tests after completing each major component
- Run tests on every commit (CI)

**Pre-Release**:
- Full integration test suite
- Performance testing
- Security testing
- Accessibility testing
- Manual QA testing

**Post-Release**:
- Monitor production metrics
- Analyze false positive/negative rates
- Iterate on detection algorithms
- Continuous security monitoring

