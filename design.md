# Design Document: NeuroTrace Monitoring System (Cost-Optimized)

## Executive Summary of Cost Optimizations

This design has been optimized to minimize operational costs while maintaining production-grade quality, security, and scalability. Key changes from the original Azure-centric architecture:

### Major Replacements & Cost Impact

1. **Backend Infrastructure**: Azure Functions → Railway.app (free tier) + Node.js/Express
   - **Savings**: $0-50/month vs $200-500/month Azure Functions
   - **Trade-off**: Manual scaling vs auto-scaling; 500GB bandwidth limit on free tier

2. **Database**: Azure Cosmos DB → PostgreSQL on Railway.app (free tier)
   - **Savings**: $0-25/month vs $400+/month Cosmos DB
   - **Trade-off**: Traditional SQL vs NoSQL; 1GB storage limit on free tier

3. **Object Storage**: Azure Blob Storage → Cloudflare R2 (free tier 10GB)
   - **Savings**: $0/month vs $20-50/month Azure Blob
   - **Trade-off**: 10GB limit vs unlimited; 1M requests/month limit

4. **Frontend Hosting**: Custom hosting → Vercel (free tier)
   - **Savings**: $0/month vs $50-100/month
   - **Trade-off**: 100GB bandwidth/month limit

5. **Monitoring**: Azure Application Insights → Grafana Cloud (free tier) + Prometheus
   - **Savings**: $0-10/month vs $100-200/month
   - **Trade-off**: 10K series limit vs unlimited

6. **CI/CD**: Azure DevOps → GitHub Actions (free tier 2000 min/month)
   - **Savings**: $0/month vs $30-50/month
   - **Trade-off**: 2000 minutes/month limit

7. **Authentication**: Azure AD → Supabase Auth (free tier)
   - **Savings**: $0/month vs $50-100/month
   - **Trade-off**: 50K MAU limit vs unlimited

8. **Notifications**: Azure Notification Hubs → Firebase Cloud Messaging (free)
   - **Savings**: $0/month vs $10-30/month
   - **Trade-off**: None significant

**Total Estimated Savings**: $800-1,400/month → $0-100/month for first 500 patients

### Upgrade Path Strategy

When free tiers are exceeded (typically at 1,000-2,000 patients):
- Railway → AWS EC2 t3.medium ($30/month) or DigitalOcean Droplet ($24/month)
- PostgreSQL → Managed PostgreSQL on DigitalOcean ($15/month) or AWS RDS
- Cloudflare R2 → Upgrade to paid tier ($0.015/GB)
- Vercel → Upgrade to Pro ($20/month)
- Monitoring → Grafana Cloud paid tier ($49/month)

**Estimated cost at 2,000 patients**: $150-250/month (still 70% cheaper than original Azure architecture)

## Overview

NeuroTrace is a privacy-first, AI-powered neurological monitoring system that detects silent deterioration in post-stroke patients through daily multimodal assessments. The system architecture prioritizes on-device processing, federated learning, and HIPAA compliance while maintaining clinical-grade accuracy and scalability.

This cost-optimized design leverages free-tier services and open-source tools to minimize operational expenses during early stages while maintaining a clear upgrade path for scaling.

### Core Design Principles

1. **Privacy by Design**: All sensitive biometric data (voice, facial images) processed on-device; only derived metrics transmitted
2. **Federated Learning**: AI models improve across the patient population without centralizing PHI
3. **Clinical Accuracy**: 94% sensitivity, 97% specificity through personalized baselines and 3-day trend filtering
4. **Cost Efficiency**: Free-tier and open-source first, with clear upgrade paths
5. **Scalability**: Start simple, scale incrementally as revenue grows
6. **Offline-First**: Full assessment and detection capabilities without internet connectivity

### Technology Stack (Cost-Optimized)

- **Mobile App**: React Native (iOS/Android) with TypeScript (free, open-source)
- **On-Device AI**: ONNX Runtime with Phi-3-Mini (3.8B parameters), MediaPipe Face Mesh (free, open-source)
- **Backend**: Node.js/Express on Railway.app free tier (500GB bandwidth, $0/month)
- **Database**: PostgreSQL 15 on Railway.app free tier (1GB storage, $0/month)
- **Object Storage**: Cloudflare R2 free tier (10GB storage, 1M requests/month, $0/month)
- **Frontend Hosting**: Vercel free tier (100GB bandwidth/month, $0/month)
- **Authentication**: Supabase Auth free tier (50K MAU, $0/month)
- **Notifications**: Firebase Cloud Messaging (free, unlimited)
- **CDN**: Cloudflare free tier (unlimited bandwidth, $0/month)
- **Monitoring**: Grafana Cloud free tier + Prometheus (10K series, $0/month)
- **CI/CD**: GitHub Actions free tier (2000 minutes/month, $0/month)
- **Security**: Let's Encrypt SSL (free), SQLCipher (open-source)
- **Integration**: FHIR R4 API (open-source libraries), OAuth 2.0 (open-source)

## Architecture

### High-Level System Architecture (Cost-Optimized)

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
                            │ HTTPS/TLS 1.3 (Let's Encrypt)
                            │ (Derived Metrics Only)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   CLOUDFLARE (Free Tier)                     │
│  ├─ CDN (Unlimited Bandwidth)                               │
│  ├─ DDoS Protection                                         │
│  ├─ SSL/TLS Termination                                     │
│  └─ Rate Limiting                                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              RAILWAY.APP (Free Tier Backend)                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Node.js/Express API Server                            │ │
│  │  ├─ Assessment Ingestion Service                       │ │
│  │  ├─ Alert Generation Service                           │ │
│  │  ├─ Notification Service (FCM Integration)             │ │
│  │  ├─ FHIR Integration Service                           │ │
│  │  └─ Federated Learning Aggregator                      │ │
│  │  Limits: 500GB bandwidth/month, 512MB RAM              │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  PostgreSQL 15 Database                                │ │
│  │  ├─ Patient Profiles                                   │ │
│  │  ├─ Assessments (derived metrics only)                 │ │
│  │  ├─ Alerts                                             │ │
│  │  └─ Audit Logs                                         │ │
│  │  Limits: 1GB storage, 100 concurrent connections       │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 EXTERNAL FREE SERVICES                       │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │ Cloudflare R2        │  │ Firebase Cloud       │        │
│  │ (Object Storage)     │  │ Messaging (Push)     │        │
│  │ 10GB free            │  │ Unlimited free       │        │
│  └──────────────────────┘  └──────────────────────┘        │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │ Supabase Auth        │  │ Twilio (SMS)         │        │
│  │ 50K MAU free         │  │ Pay-as-you-go        │        │
│  └──────────────────────┘  └──────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    WEB APPLICATIONS                          │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │ Clinician Dashboard  │  │  Admin Dashboard     │        │
│  │ (React + TypeScript) │  │  (React + TypeScript)│        │
│  │ Hosted on Vercel     │  │  Hosted on Vercel    │        │
│  │ (Free Tier)          │  │  (Free Tier)         │        │
│  └──────────────────────┘  └──────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              MONITORING & OBSERVABILITY                      │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │ Grafana Cloud        │  │ Prometheus           │        │
│  │ (Free Tier)          │  │ (Self-hosted)        │        │
│  │ 10K series           │  │ Open-source          │        │
│  └──────────────────────┘  └──────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Architecture Justification

**Why Railway.app over Azure Functions?**
- Free tier provides 500GB bandwidth and 512MB RAM (sufficient for 500-1000 patients)
- Simple deployment with Git integration
- Built-in PostgreSQL database (no separate service needed)
- Easy upgrade path to paid tier ($5/month for 8GB bandwidth)
- Trade-off: Manual scaling vs auto-scaling, but acceptable for early stage

**Why PostgreSQL over Cosmos DB?**
- Free 1GB storage on Railway (sufficient for ~10,000 assessment records)
- ACID compliance ensures data integrity
- Mature ecosystem with excellent TypeScript support (Prisma ORM)
- Lower learning curve than NoSQL
- Trade-off: Less flexible schema, but our data model is well-defined

**Why Cloudflare R2 over Azure Blob?**
- 10GB free storage (sufficient for ~1000 AI model versions)
- No egress fees (unlike AWS S3)
- S3-compatible API (easy migration if needed)
- Trade-off: 1M requests/month limit, but model updates are infrequent

**Why Vercel over custom hosting?**
- 100GB bandwidth/month free (sufficient for dashboard traffic)
- Automatic HTTPS, CDN, and deployments
- Excellent Next.js/React support
- Trade-off: Bandwidth limit, but dashboards are low-traffic

**Why Supabase Auth over Azure AD?**
- 50K MAU free (sufficient for early stage)
- Built-in OAuth 2.0, JWT, and RBAC
- Open-source (can self-host if needed)
- Trade-off: Less enterprise features, but sufficient for our needs

**Why Firebase Cloud Messaging over Azure Notification Hubs?**
- Completely free, unlimited notifications
- Excellent mobile SDK support
- Reliable delivery
- Trade-off: None significant

### Data Flow

1. **Assessment Execution**: Patient completes 60-second assessment on mobile device
2. **On-Device Processing**: Raw biometric data processed locally, only derived metrics extracted
3. **Baseline Comparison**: Metrics compared against personalized baseline (stored locally)
4. **Deviation Detection**: Algorithm identifies deviations exceeding 2 standard deviations
5. **Trend Analysis**: System tracks deviations over 3 consecutive days
6. **Alert Generation**: Sustained trends trigger alerts sent to Railway backend via Cloudflare CDN
7. **Notification Delivery**: Backend sends push notifications via Firebase Cloud Messaging and SMS via Twilio
8. **Dashboard Update**: Clinician and admin dashboards (hosted on Vercel) fetch data from Railway API in real-time

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

### 3. Backend Services (Node.js/Express on Railway)

**Responsibilities**:
- Assessment data ingestion and storage
- Alert generation and notification delivery
- FHIR integration with EHR systems
- Federated learning model aggregation
- User authentication and authorization

**Why Node.js/Express over Serverless?**
- Simpler deployment model (single process vs multiple functions)
- Lower cold-start latency
- Easier local development and debugging
- Free tier on Railway provides sufficient resources
- Trade-off: Manual scaling vs auto-scaling, but acceptable for early stage

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

**Database Access Layer (Prisma ORM)**:

```typescript
// Prisma schema for PostgreSQL
model Patient {
  id                String   @id @default(uuid())
  dateOfBirth       DateTime
  gender            String
  strokeDate        DateTime
  strokeType        String
  dischargeDate     DateTime
  assignedClinician String
  assignedHospital  String
  enrollmentDate    DateTime
  assessmentTime    String
  timezone          String
  language          String
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  assessments       Assessment[]
  alerts            Alert[]
  caregivers        Caregiver[]
  baseline          Baseline?
}

model Assessment {
  id                String   @id @default(uuid())
  patientId         String
  timestamp         DateTime
  dayNumber         Int
  
  // Derived metrics stored as JSONB
  derivedMetrics    Json
  
  deviations        Json?
  alertGenerated    Boolean  @default(false)
  
  patient           Patient  @relation(fields: [patientId], references: [id])
  
  @@index([patientId, timestamp])
}

model Alert {
  id                    String   @id @default(uuid())
  patientId             String
  severity              String
  triggeringAssessments String[]
  sustainedDeviations   Json
  affectedModalities    String[]
  consecutiveDays       Int
  message               String
  recommendedActions    String[]
  status                String   @default("ACTIVE")
  createdAt             DateTime @default(now())
  acknowledgedAt        DateTime?
  acknowledgedBy        String?
  clinicianNotes        String?
  
  patient               Patient  @relation(fields: [patientId], references: [id])
  notifications         Notification[]
  
  @@index([patientId, status])
}
```

### 4. Federated Learning System (Cost-Optimized)

**Responsibilities**:
- Aggregate model gradients from patient devices
- Train global models without accessing raw patient data
- Distribute updated models to devices
- Validate gradient privacy

**Why Simple Aggregation over Azure ML?**
- Azure ML costs $0.50-2.00 per compute hour
- For early stage, simple gradient averaging is sufficient
- Can implement secure aggregation with open-source libraries (PySyft)
- Upgrade to managed ML platform when dataset grows beyond 10,000 patients

**Architecture**:

```typescript
// Federated Learning Coordinator (runs on Railway backend)
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

// Simple gradient aggregation (Federated Averaging)
async function aggregateGradients(gradients: ModelGradients[]): Promise<GlobalModel> {
  const totalSamples = gradients.reduce((sum, g) => sum + g.sampleCount, 0);
  
  // Weighted average of gradients
  const aggregatedWeights = new Float32Array(gradients[0].gradients.length);
  for (const gradient of gradients) {
    const weight = gradient.sampleCount / totalSamples;
    for (let i = 0; i < aggregatedWeights.length; i++) {
      aggregatedWeights[i] += gradient.gradients[i] * weight;
    }
  }
  
  return {
    modelVersion: `v${Date.now()}`,
    weights: aggregatedWeights,
    accuracy: 0, // Calculated separately
    createdAt: new Date()
  };
}
```

**Model Storage**:
- Store model artifacts in Cloudflare R2 (10GB free)
- Each model version ~2-3GB (Phi-3-Mini quantized)
- Can store ~3-4 model versions in free tier
- Upgrade to paid tier ($0.015/GB/month) when needed

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

### Authentication (Supabase Auth)

All API endpoints require JWT Bearer tokens from Supabase Auth:

```
Authorization: Bearer <jwt_token>
```

**Token Scopes** (implemented via Supabase Row Level Security):
- `patient:read` - Read patient data
- `patient:write` - Write patient data
- `assessment:write` - Submit assessments
- `alert:read` - Read alerts
- `alert:write` - Acknowledge alerts
- `fhir:read` - Read FHIR resources
- `fhir:write` - Write FHIR resources

**Supabase Auth Setup**:
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Middleware for JWT verification
async function authenticateRequest(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  req.user = user;
  next();
}
```

### Rate Limiting (Cloudflare)

Cloudflare free tier provides basic rate limiting:
- 10,000 requests per minute per IP
- Configurable via Cloudflare dashboard
- Upgrade to paid tier for advanced rate limiting rules

## Security Design (Cost-Optimized)

### HIPAA Compliance

1. **Encryption at Rest**:
   - Mobile: SQLCipher with AES-256 (open-source)
   - Cloud: PostgreSQL with encryption at rest (Railway provides this)
   - Cloudflare R2: Server-side encryption enabled by default
   - Secrets: Environment variables in Railway (encrypted)

2. **Encryption in Transit**:
   - TLS 1.3 for all network communication (Let's Encrypt SSL via Cloudflare)
   - Certificate pinning in mobile app (free, implemented in code)

3. **Access Control**:
   - Role-Based Access Control (RBAC) via Supabase Auth
   - Roles: Patient, Caregiver, Clinician, Admin
   - Row Level Security (RLS) in PostgreSQL
   - Principle of least privilege

4. **Audit Logging**:
   - All PHI access logged with timestamp, user, action
   - Stored in PostgreSQL with 6-year retention
   - Automated log analysis using open-source tools (Grafana Loki)

5. **Data Minimization**:
   - Raw biometric data never leaves device
   - Only derived metrics transmitted
   - Automatic data retention policies via PostgreSQL triggers

### Privacy-Preserving Architecture

1. **On-Device Processing**:
   - All voice recordings processed locally
   - All facial images processed locally
   - Raw data deleted after metric extraction

2. **Federated Learning**:
   - Model gradients computed on-device
   - Differential privacy applied to gradients (open-source library: Opacus)
   - Secure aggregation prevents individual gradient inspection

3. **Anonymization**:
   - Device IDs rotated periodically
   - No direct identifiers in assessment data
   - Patient ID encrypted in transit

### Security Measures (Open-Source)

```typescript
// Encryption Service (using Node.js crypto)
import crypto from 'crypto';

interface EncryptionService {
  encryptData(data: any, key: string): Promise<EncryptedData>;
  decryptData(encrypted: EncryptedData, key: string): Promise<any>;
  generateKey(): Promise<string>;
  rotateKeys(): Promise<void>;
}

// Implementation using AES-256-GCM
class EncryptionServiceImpl implements EncryptionService {
  async encryptData(data: any, key: string): Promise<EncryptedData> {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }
  
  async decryptData(encrypted: EncryptedData, key: string): Promise<any> {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      Buffer.from(key, 'hex'),
      Buffer.from(encrypted.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(encrypted.authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }
}

// Audit Logger (using PostgreSQL)
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

// Implementation using Prisma
class AuditLoggerImpl implements AuditLogger {
  async logAccess(userId: string, resource: string, action: string): Promise<void> {
    await prisma.auditLog.create({
      data: {
        userId,
        resource,
        action,
        timestamp: new Date(),
        ipAddress: req.ip
      }
    });
  }
}
```

### Secrets Management (Cost-Optimized)

**Railway Environment Variables** (free):
- Store all secrets as environment variables
- Encrypted at rest by Railway
- Access via `process.env.SECRET_NAME`
- No need for Azure Key Vault ($0.03 per 10,000 operations)

**Example**:
```bash
# Railway environment variables
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
CLOUDFLARE_R2_ACCESS_KEY=...
CLOUDFLARE_R2_SECRET_KEY=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
ENCRYPTION_KEY=...
```

### Security Scanning (Free Tools)

1. **SAST (Static Application Security Testing)**:
   - SonarQube Community Edition (free, self-hosted)
   - ESLint security plugins (free)
   - npm audit (free)

2. **DAST (Dynamic Application Security Testing)**:
   - OWASP ZAP (free, open-source)
   - Nikto (free, open-source)

3. **Dependency Scanning**:
   - Snyk free tier (200 tests/month)
   - GitHub Dependabot (free)
   - npm audit (free)

4. **Container Scanning**:
   - Trivy (free, open-source)
   - Clair (free, open-source)

### Penetration Testing

**Cost-Effective Approach**:
- Use bug bounty platforms (HackerOne, Bugcrowd) - pay only for valid findings
- Start with small bounties ($50-500 per finding)
- Upgrade to professional pen testing when revenue allows ($5,000-15,000 annually)

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

## Cost Analysis

### Free Tier Limits & Costs

| Service | Free Tier Limits | Cost at 500 Patients | Cost at 2,000 Patients | Upgrade Path |
|---------|------------------|---------------------|----------------------|--------------|
| **Railway (Backend + DB)** | 500GB bandwidth, 512MB RAM, 1GB storage | $0/month | $20/month (Pro plan) | $20/month for 8GB bandwidth |
| **PostgreSQL** | 1GB storage, 100 connections | $0/month | $15/month (managed) | DigitalOcean Managed DB $15/month |
| **Cloudflare R2** | 10GB storage, 1M requests/month | $0/month | $5/month | $0.015/GB + $0.36/million requests |
| **Vercel (Frontend)** | 100GB bandwidth/month | $0/month | $20/month (Pro) | $20/month for 1TB bandwidth |
| **Supabase Auth** | 50K MAU | $0/month | $25/month (Pro) | $25/month for 100K MAU |
| **Firebase Cloud Messaging** | Unlimited | $0/month | $0/month | Always free |
| **Cloudflare CDN** | Unlimited bandwidth | $0/month | $0/month | Always free |
| **Twilio SMS** | Pay-as-you-go | $10/month (~100 SMS) | $40/month (~400 SMS) | $0.0075 per SMS |
| **Grafana Cloud** | 10K series, 50GB logs | $0/month | $49/month (Pro) | $49/month for 100K series |
| **GitHub Actions** | 2000 minutes/month | $0/month | $0/month | $0.008/minute after free tier |
| **Let's Encrypt SSL** | Unlimited certificates | $0/month | $0/month | Always free |
| **Domain Name** | N/A | $12/year | $12/year | $12/year |
| **TOTAL** | | **$11/month** | **$175/month** | |

### Cost Breakdown by Patient Count

| Patients | Monthly Cost | Cost per Patient | Notes |
|----------|-------------|------------------|-------|
| 100 | $10 | $0.10 | All free tiers |
| 500 | $11 | $0.02 | Twilio SMS only |
| 1,000 | $50 | $0.05 | Railway Pro, Twilio |
| 2,000 | $175 | $0.09 | All services upgraded |
| 5,000 | $400 | $0.08 | Dedicated infrastructure |
| 10,000 | $800 | $0.08 | Multi-region deployment |

### Revenue vs Cost Analysis

Assuming $200/patient/month revenue (hospital B2B model):

| Patients | Monthly Revenue | Monthly Cost | Gross Margin | Net Margin |
|----------|----------------|--------------|--------------|------------|
| 100 | $20,000 | $10 | 99.95% | ~$19,990 |
| 500 | $100,000 | $11 | 99.99% | ~$99,989 |
| 1,000 | $200,000 | $50 | 99.98% | ~$199,950 |
| 2,000 | $400,000 | $175 | 99.96% | ~$399,825 |
| 5,000 | $1,000,000 | $400 | 99.96% | ~$999,600 |

**Key Insight**: Even at 100 patients, the system is highly profitable with 99.95% gross margin.

## Scalability & Performance (Cost-Optimized)

### Caching Strategy

**Redis on Railway** (free tier: 25MB):
- Cache frequently accessed patient profiles
- Cache baseline data
- Cache dashboard queries
- Upgrade to paid tier ($5/month for 256MB) when needed

**Cloudflare CDN** (free, unlimited):
- Cache static assets (dashboard, mobile app updates)
- Cache API responses with short TTL (60 seconds)
- Automatic edge caching worldwide

### Load Balancing

**Cloudflare Load Balancing** (free tier):
- Geographic load balancing
- Health checks
- Failover to backup Railway instance
- Upgrade to paid tier ($5/month) for advanced features

### Horizontal Scaling

**Railway Scaling Strategy**:
1. **0-500 patients**: Single Railway instance (free tier)
2. **500-2,000 patients**: Railway Pro plan ($20/month)
3. **2,000-5,000 patients**: Multiple Railway instances + load balancer
4. **5,000+ patients**: Migrate to AWS EC2 or DigitalOcean Droplets

**Database Scaling**:
1. **0-1,000 patients**: Single PostgreSQL instance (1GB)
2. **1,000-5,000 patients**: Upgrade to 10GB storage ($15/month)
3. **5,000-10,000 patients**: Read replicas for dashboard queries
4. **10,000+ patients**: Sharding by hospital or geographic region

### Performance Targets

| Metric | Target | Free Tier Performance | Paid Tier Performance |
|--------|--------|----------------------|----------------------|
| API Response Time | <500ms (95th percentile) | 300-400ms | 200-300ms |
| Dashboard Load Time | <2s (95th percentile) | 1.5-2s | 1-1.5s |
| On-Device AI Processing | <5s | 3-4s | 3-4s (same) |
| Database Query Time | <100ms (95th percentile) | 50-80ms | 30-50ms |
| Uptime | 99.5% | 99.5% | 99.9% |

## Deployment Architecture (Cost-Optimized)

### Environments

1. **Development** (Local):
   - Docker Compose for local development
   - PostgreSQL in Docker
   - No cloud costs

2. **Staging** (Railway Free Tier):
   - Separate Railway project (free)
   - Separate PostgreSQL database
   - Separate Supabase project (free)
   - $0/month

3. **Production** (Railway + Free Services):
   - Railway Pro plan ($20/month at scale)
   - Production PostgreSQL
   - Production Supabase
   - Cloudflare CDN
   - $20-175/month depending on scale

### CI/CD Pipeline (GitHub Actions)

**Free Tier**: 2000 minutes/month (sufficient for ~200 deployments)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Railway

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Run security scan
        run: npm audit
      
      - name: Deploy to Railway
        uses: bervProject/railway-deploy@main
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: neurotrace-backend
```

### Monitoring & Logging (Cost-Optimized)

**Grafana Cloud Free Tier**:
- 10,000 series (metrics)
- 50GB logs per month
- 14-day retention
- Sufficient for 500-1,000 patients

**Prometheus** (self-hosted on Railway):
- Scrape metrics from backend
- Store in Grafana Cloud
- No additional cost

**Loki** (Grafana Cloud):
- Centralized log aggregation
- Query logs from dashboard
- 50GB/month free

**Example Grafana Dashboard**:
```yaml
# Metrics to track
- neurotrace_assessments_total (counter)
- neurotrace_alerts_generated_total (counter)
- neurotrace_api_request_duration_seconds (histogram)
- neurotrace_database_query_duration_seconds (histogram)
- neurotrace_active_patients (gauge)
- neurotrace_assessment_completion_rate (gauge)
```

### Backup Strategy (Cost-Optimized)

**PostgreSQL Backups**:
- Railway automatic daily backups (included in free tier)
- Manual backups to Cloudflare R2 (free, 10GB)
- 7-day retention on free tier
- Upgrade to 30-day retention on paid tier

**Backup Script**:
```bash
#!/bin/bash
# Daily backup to Cloudflare R2
pg_dump $DATABASE_URL | gzip | aws s3 cp - s3://neurotrace-backups/backup-$(date +%Y%m%d).sql.gz --endpoint-url https://[account-id].r2.cloudflarestorage.com
```

### Disaster Recovery

**RTO (Recovery Time Objective)**: 4 hours
**RPO (Recovery Point Objective)**: 24 hours

**Recovery Steps**:
1. Restore PostgreSQL from latest backup (30 minutes)
2. Deploy backend to new Railway instance (15 minutes)
3. Update DNS to point to new instance (5 minutes)
4. Verify system functionality (30 minutes)

**Cost**: $0 for recovery (using free tier backups)


## Risk & Trade-Off Analysis

### Performance Constraints

| Risk | Impact | Mitigation | Cost |
|------|--------|------------|------|
| **Railway 500GB bandwidth limit** | Service degradation at ~1,000 patients | Monitor bandwidth usage, upgrade to Pro ($20/month) | Low |
| **PostgreSQL 1GB storage limit** | Database full at ~10,000 assessments | Implement data archiving, upgrade storage ($15/month) | Low |
| **Cloudflare R2 10GB limit** | Cannot store more than 3-4 model versions | Upgrade to paid tier ($0.015/GB) or delete old models | Low |
| **Vercel 100GB bandwidth limit** | Dashboard unavailable at high traffic | Upgrade to Pro ($20/month) or use Cloudflare caching | Low |
| **Single Railway instance** | No redundancy, potential downtime | Deploy multiple instances with load balancer ($40/month) | Medium |

### Operational Overhead

| Task | Frequency | Time Required | Automation |
|------|-----------|---------------|------------|
| **Database backups** | Daily | 5 minutes | Automated via cron |
| **Security updates** | Weekly | 30 minutes | Automated via Dependabot |
| **Performance monitoring** | Daily | 10 minutes | Automated via Grafana alerts |
| **Cost monitoring** | Monthly | 15 minutes | Manual review of usage |
| **Scaling decisions** | Quarterly | 2 hours | Manual analysis |

**Total Operational Overhead**: ~5 hours/month (manageable for small team)

### Migration Complexity

**Difficulty Level**: Low to Medium

**Migration Paths**:

1. **Railway → AWS EC2** (Medium difficulty):
   - Export PostgreSQL database
   - Deploy Docker container to EC2
   - Update DNS records
   - Estimated time: 4-8 hours
   - Cost: $30-50/month for t3.medium

2. **PostgreSQL → AWS RDS** (Low difficulty):
   - Use pg_dump/pg_restore
   - Update connection string
   - Estimated time: 2-4 hours
   - Cost: $50-100/month for db.t3.small

3. **Cloudflare R2 → AWS S3** (Low difficulty):
   - S3-compatible API, minimal code changes
   - Use rclone for data migration
   - Estimated time: 1-2 hours
   - Cost: $23/month for 1TB storage

4. **Supabase Auth → Auth0** (High difficulty):
   - Requires user migration
   - Update authentication flow
   - Estimated time: 16-24 hours
   - Cost: $240/month for 1,000 MAU

**Recommendation**: Avoid migrating authentication provider unless absolutely necessary. Other migrations are straightforward.

### Vendor Lock-In Assessment

| Service | Lock-In Risk | Mitigation |
|---------|--------------|------------|
| **Railway** | Low | Standard Docker containers, easy to migrate |
| **PostgreSQL** | None | Standard SQL database, portable |
| **Cloudflare R2** | Low | S3-compatible API, easy migration |
| **Vercel** | Low | Static site hosting, can deploy anywhere |
| **Supabase Auth** | Medium | OAuth 2.0 standard, but user migration required |
| **Firebase Cloud Messaging** | Medium | Push notification standard, but token migration required |

**Overall Vendor Lock-In Risk**: Low to Medium (acceptable for early stage)

### Compliance Risks

| Risk | Impact | Mitigation | Cost |
|------|--------|------------|------|
| **HIPAA audit failure** | Cannot operate in US healthcare market | Annual third-party audit ($10,000-20,000) | High |
| **Data breach** | Regulatory fines, reputation damage | Security best practices, bug bounty program ($5,000/year) | Medium |
| **Insufficient audit logs** | Compliance violation | Automated audit logging, 6-year retention | Low |
| **Inadequate encryption** | PHI exposure | AES-256 encryption, TLS 1.3, regular security scans | Low |

**Recommendation**: Budget $15,000-25,000 annually for compliance and security audits once revenue reaches $500K/year.

### Scalability Risks

| Threshold | Risk | Mitigation | Timeline |
|-----------|------|------------|----------|
| **500 patients** | Railway bandwidth limit | Upgrade to Pro plan | Immediate |
| **1,000 patients** | PostgreSQL storage limit | Upgrade storage or implement archiving | 1-2 weeks |
| **2,000 patients** | Single instance bottleneck | Deploy multiple instances with load balancer | 2-4 weeks |
| **5,000 patients** | Free tier exhaustion | Migrate to paid infrastructure | 4-8 weeks |
| **10,000 patients** | Database performance | Implement read replicas and sharding | 8-12 weeks |

**Recommendation**: Monitor growth metrics weekly and plan infrastructure upgrades 2-3 months in advance.

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

### Security Testing (Cost-Optimized)

**Automated Security Scans** (Free Tools):
- **SAST**: SonarQube Community Edition (self-hosted on Railway, free)
- **DAST**: OWASP ZAP (free, open-source)
- **Dependency Scanning**: Snyk free tier (200 tests/month), npm audit (free)
- **Container Scanning**: Trivy (free, open-source)

**Manual Security Testing**:
- Bug bounty program (HackerOne free tier, pay only for valid findings)
- Start with small bounties ($50-500 per finding)
- Upgrade to professional pen testing when revenue allows ($5,000-15,000 annually)

**Security Test Cases**:
- SQL injection attempts
- XSS (Cross-Site Scripting) attempts
- CSRF (Cross-Site Request Forgery) protection
- Authentication bypass attempts
- Authorization escalation attempts
- PHI leakage detection

**Cost**: $0-500/month for bug bounty program (pay only for findings)

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

**Cost**: $600,000 (one-time, included in FDA 510(k) pathway budget)

### Accessibility Testing (Free Tools)

**Automated Tools**:
- axe-core for WCAG 2.1 Level AA compliance (free, open-source)
- React Native Accessibility Inspector (free, built-in)
- Lighthouse accessibility audit (free, built-in in Chrome)

**Manual Testing**:
- Screen reader testing (VoiceOver on iOS, TalkBack on Android) - free
- Voice command testing - free
- High contrast mode testing - free
- Large font size testing - free

**Test Cases**:
- All interactive elements have accessible labels
- Color contrast ratios meet WCAG standards
- Voice commands work for all navigation
- Audio instructions play correctly
- Error messages are announced by screen readers

**Cost**: $0 (all free tools)

### Continuous Integration/Continuous Deployment (CI/CD)

**GitHub Actions Free Tier**: 2000 minutes/month

**Pipeline Stages**:

1. **Code Quality** (~5 minutes per run):
   - Linting (ESLint, Prettier)
   - Type checking (TypeScript)
   - Code coverage (minimum 80%)

2. **Automated Testing** (~10 minutes per run):
   - Unit tests (all must pass)
   - Property tests (all must pass)
   - Integration tests (all must pass)

3. **Security Scanning** (~5 minutes per run):
   - SAST scan (SonarQube)
   - Dependency vulnerability scan (npm audit, Snyk)

4. **Build** (~10 minutes per run):
   - Backend Docker image
   - Frontend static build

5. **Deployment** (~5 minutes per run):
   - Deploy to Railway (staging/production)
   - Deploy to Vercel (frontend)

**Total per deployment**: ~35 minutes
**Deployments per month**: ~57 (within 2000 minute limit)

**Cost**: $0/month (within free tier)

### Test Data Management (Free)

**Synthetic Data Generation**:
- Use fast-check and Hypothesis to generate realistic test data (free, open-source)
- Create patient profiles with varied demographics
- Generate assessment sequences with realistic patterns
- Simulate various deterioration scenarios

**Test Data Privacy**:
- Never use real patient data in testing
- All test data is synthetic and anonymized
- Test databases are separate from production (Railway free tier for staging)
- Test data is automatically purged after test runs

**Cost**: $0 (all open-source tools)

### Monitoring and Observability (Cost-Optimized)

**Grafana Cloud Free Tier**:
- 10,000 series (metrics)
- 50GB logs per month
- 14-day retention
- Sufficient for 500-1,000 patients

**Prometheus** (self-hosted on Railway):
- Scrape metrics from backend
- Store in Grafana Cloud
- No additional cost

**Custom Metrics**:
- Assessment completion rate
- Alert generation rate
- API latency (p50, p95, p99)
- Database query performance
- Error rates by endpoint

**Alerting** (Grafana Cloud free tier):
- API response time > 1s
- Error rate > 1%
- Database query time > 200ms
- Assessment completion rate < 80%

**Cost**: $0/month (within free tier), upgrade to $49/month at 2,000+ patients

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

**Pre-Development** (1 week):
- Set up testing infrastructure (free tools)
- Create test data generators
- Define property test arbitraries

**During Development** (ongoing):
- Write unit tests alongside implementation (TDD where appropriate)
- Write property tests after completing each major component
- Run tests on every commit (CI via GitHub Actions)

**Pre-Release** (2 weeks):
- Full integration test suite
- Performance testing (Apache JMeter, free)
- Security testing (OWASP ZAP, free)
- Accessibility testing (axe-core, free)
- Manual QA testing

**Post-Release** (ongoing):
- Monitor production metrics (Grafana Cloud)
- Analyze false positive/negative rates
- Iterate on detection algorithms
- Continuous security monitoring

**Total Testing Cost**: $0-500/month (bug bounty only)

## Summary of Cost Optimizations

### Total Cost Comparison

| Scale | Original Azure Architecture | Cost-Optimized Architecture | Savings |
|-------|----------------------------|----------------------------|---------|
| **0-500 patients** | $800-1,200/month | $10-50/month | 95-98% |
| **500-1,000 patients** | $1,200-1,800/month | $50-100/month | 92-96% |
| **1,000-2,000 patients** | $1,800-2,500/month | $150-250/month | 88-92% |
| **2,000-5,000 patients** | $2,500-4,000/month | $300-500/month | 85-88% |
| **5,000-10,000 patients** | $4,000-8,000/month | $600-1,200/month | 80-85% |

### Key Success Factors

1. **Start Small**: Use free tiers to validate product-market fit
2. **Monitor Closely**: Track usage metrics weekly to anticipate upgrades
3. **Plan Ahead**: Budget for infrastructure upgrades 2-3 months in advance
4. **Automate Everything**: Minimize operational overhead with automation
5. **Security First**: Don't compromise on security despite cost constraints
6. **Compliance Ready**: Build HIPAA compliance from day one
7. **Scale Incrementally**: Upgrade services one at a time as needed

### When to Upgrade

**Immediate Upgrades** (when limits are reached):
- Railway bandwidth > 400GB/month → Upgrade to Pro ($20/month)
- PostgreSQL storage > 800MB → Upgrade storage ($15/month)
- Vercel bandwidth > 80GB/month → Upgrade to Pro ($20/month)

**Planned Upgrades** (when revenue supports):
- 1,000 patients → Monitoring upgrade ($49/month)
- 2,000 patients → Multiple backend instances ($40/month)
- 5,000 patients → Managed database ($100/month)
- 10,000 patients → Multi-region deployment ($500/month)

### Long-Term Infrastructure Strategy

**Year 1** (0-1,000 patients):
- Stay on free tiers as long as possible
- Focus on product development and clinical validation
- Estimated cost: $10-100/month

**Year 2** (1,000-5,000 patients):
- Upgrade to paid tiers as needed
- Invest in monitoring and observability
- Estimated cost: $150-500/month

**Year 3** (5,000-20,000 patients):
- Migrate to dedicated infrastructure (AWS/GCP)
- Implement multi-region deployment
- Hire DevOps engineer
- Estimated cost: $1,000-3,000/month

**Year 4+** (20,000+ patients):
- Enterprise-grade infrastructure
- 24/7 support and monitoring
- Dedicated security team
- Estimated cost: $5,000-15,000/month

**Key Insight**: The cost-optimized architecture provides 18-24 months of runway at minimal cost, allowing the team to focus on product-market fit and clinical validation before significant infrastructure investment.

