# Implementation Plan: NeuroTrace Monitoring System

## Overview

This implementation plan breaks down the NeuroTrace system into discrete, incremental coding tasks. The system uses a cost-optimized architecture with TypeScript for both the React Native mobile app and Node.js/Express backend on Railway.app. Each task builds on previous work, with property-based tests integrated throughout to validate correctness early.

The implementation follows a bottom-up approach: core data models and algorithms first, then API layer, then UI, and finally integration and deployment. The design document defines 52 correctness properties that must be validated through property-based testing using fast-check (TypeScript) with minimum 100 iterations per test.

**Key Technologies**:
- Mobile: React Native with TypeScript
- Backend: Node.js/Express on Railway.app (free tier)
- Database: PostgreSQL 15 on Railway.app (free tier)
- Storage: Cloudflare R2 (free tier)
- Auth: Supabase Auth (free tier)
- Notifications: Firebase Cloud Messaging (free)
- Frontend: React on Vercel (free tier)
- Monitoring: Grafana Cloud + Prometheus (free tier)
- Testing: Jest + fast-check for property-based testing

## Tasks

- [x] 1. Set up project structure and development environment
  - Initialize React Native project with TypeScript
  - Initialize Node.js/Express project with TypeScript for Railway deployment
  - Set up Prisma ORM for PostgreSQL
  - Configure SQLCipher for React Native
  - Set up ONNX Runtime for React Native
  - Configure testing frameworks (Jest for unit tests, fast-check for property-based tests)
  - Set up linting and code formatting (ESLint, Prettier)
  - Create shared TypeScript types package
  - Configure Railway.app deployment with environment variables
  - Set up GitHub Actions CI/CD pipeline (free tier: 2000 minutes/month)
  - _Requirements: All (foundational)_

- [ ] 2. Implement core data models and interfaces
  - [x] 2.1 Create TypeScript interfaces for all data models
    - Define PatientProfile, AssessmentResult, Baseline, Deviation, Alert interfaces
    - Define SpeechMetrics, FacialMetrics, ReactionMetrics interfaces
    - Define FHIR resource interfaces (Observation, Communication)
    - Define error response and retry policy interfaces
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 9.1_
  
  - [x] 2.2 Write property test for baseline establishment
    - **Property 1: Baseline Establishment from Valid Assessments**
    - Test that for any sequence of 5-7 assessments, baseline contains valid statistics
    - **Validates: Requirements 1.3, 1.4, 1.6**
  
  - [x] 2.3 Implement data validation functions using Zod
    - Create validators for all data models
    - Implement schema validation for API requests
    - Add validation for FHIR resources
    - _Requirements: 1.6, 2.1, 9.1_


- [ ] 3. Implement local storage and encryption layer
  - [x] 3.1 Create SQLCipher database schema for React Native
    - Define tables for patients, assessments, baselines, alerts, sync queue
    - Create indexes for common queries (patientId, timestamp)
    - Implement database migration scripts
    - _Requirements: 6.5, 6.6, 14.4_
  
  - [x] 3.2 Implement LocalStorageManager interface
    - Write functions for saving/retrieving assessments
    - Write functions for saving/retrieving baselines
    - Implement encryption/decryption using SQLCipher AES-256
    - Add automatic data pruning for 30-day retention
    - _Requirements: 6.5, 6.6, 6.8, 14.4_
  
  - [x] 3.3 Write property tests for storage and encryption
    - **Property 20: Data Encryption at Rest and in Transit**
    - **Property 21: Biometric Data Retention Limit**
    - **Property 43: Local Storage Capacity**
    - Test encryption/decryption round-trip for any data
    - Test that raw biometric data is deleted within 5 seconds
    - Test that 30 days of assessments can be stored
    - **Validates: Requirements 6.5, 6.6, 6.7, 6.8, 14.4**
  
  - [x] 3.4 Implement offline sync queue (SyncManager)
    - Create SyncManager interface implementation
    - Implement queue persistence in SQLCipher
    - Add retry logic with exponential backoff
    - _Requirements: 14.3_
  
  - [x] 3.5 Write property test for sync queue
    - **Property 42: Assessment Data Synchronization**
    - Test that any queued assessment syncs within 5 minutes of connectivity
    - **Validates: Requirements 14.3**

- [ ] 4. Implement on-device AI components
  - [x] 4.1 Integrate ONNX Runtime and load Phi-3-Mini model
    - Set up ONNX Runtime for React Native
    - Download and bundle quantized Phi-3-Mini model (3.8B parameters)
    - Create model loading and initialization code
    - Implement model caching for offline use
    - _Requirements: 2.4, 6.1, 14.2_
  
  - [x] 4.2 Implement SpeechBiomarkerExtractor
    - Extract articulation rate from audio (words per minute)
    - Detect pause duration and frequency
    - Analyze phonetic precision and voice quality using Phi-3-Mini
    - Return SpeechMetrics with all required fields
    - _Requirements: 2.4_
  
  - [x] 4.3 Write property test for speech biomarker extraction
    - **Property 5: Multimodal Biomarker Extraction (Speech)**
    - Test that for any audio input, all speech metrics are extracted
    - **Validates: Requirements 2.4**
  
  - [-] 4.4 Integrate MediaPipe Face Mesh
    - Set up MediaPipe for React Native
    - Implement facial landmark detection (468 landmarks)
    - Add error handling for face not visible
    - _Requirements: 2.5, 6.2_
  
  - [~] 4.5 Implement FacialAsymmetryDetector
    - Extract facial landmarks from images
    - Compute symmetry scores (left vs right comparison)
    - Calculate eye openness ratio and mouth symmetry
    - Return FacialMetrics with all required fields
    - _Requirements: 2.5_
  
  - [~] 4.6 Write property test for facial asymmetry detection
    - **Property 5: Multimodal Biomarker Extraction (Facial)**
    - Test that for any face image, all facial metrics are extracted
    - **Validates: Requirements 2.5**
  
  - [~] 4.7 Implement reaction time measurement
    - Create visual stimuli presentation (random shapes/colors)
    - Measure response latency with millisecond precision
    - Calculate accuracy and variability
    - Return ReactionMetrics with all required fields
    - _Requirements: 2.6_
  
  - [~] 4.8 Write property test for reaction time measurement
    - **Property 5: Multimodal Biomarker Extraction (Reaction)**
    - Test that for any reaction task, all reaction metrics are extracted
    - **Validates: Requirements 2.6**
  
  - [~] 4.9 Write property test for on-device processing performance
    - **Property 30: On-Device Processing Performance**
    - Test that for any assessment, processing completes within 5 seconds
    - **Validates: Requirements 10.2**

- [ ] 5. Implement baseline computation and deviation detection
  - [~] 5.1 Implement BaselineComputer
    - Compute mean, standard deviation, min, max for each metric
    - Validate baseline quality (minimum 5 assessments)
    - Handle baseline extension for missed assessments (>2 missed)
    - Store baseline in local SQLCipher database
    - _Requirements: 1.3, 1.4, 1.5, 1.6_
  
  - [~] 5.2 Write property tests for baseline computation
    - **Property 1: Baseline Establishment from Valid Assessments**
    - **Property 2: Baseline Extension on Missed Assessments**
    - Test that for any 5-7 assessments, baseline has valid statistics
    - Test that baseline extends by number of missed days beyond 2
    - **Validates: Requirements 1.3, 1.4, 1.5, 1.6**
  
  - [~] 5.3 Implement DeviationDetector
    - Compare current metrics against baseline (z-score calculation)
    - Flag deviations exceeding 2 standard deviations
    - Track consecutive days of deviations
    - Classify sustained trends (3+ consecutive days)
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [~] 5.4 Write property tests for deviation detection
    - **Property 8: Deviation Detection Threshold**
    - **Property 9: Sustained Trend Detection**
    - **Property 11: Single-Day Anomaly Filtering**
    - Test that deviations >2 SD are flagged
    - Test that 3 consecutive deviations create sustained trend
    - Test that single-day deviations don't generate alerts
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.7**
  
  - [~] 5.5 Implement alert severity calculation
    - Calculate severity based on deviation magnitude (z-score)
    - Escalate severity for multi-modality trends
    - Assign Low/Medium/High severity levels
    - _Requirements: 3.4, 3.5, 3.6_
  
  - [~] 5.6 Write property test for severity calculation
    - **Property 10: Multi-Modality Severity Escalation**
    - Test that multi-modality trends have higher severity
    - **Validates: Requirements 3.5, 3.6**
  
  - [~] 5.7 Write property test for offline deviation detection
    - **Property 45: Offline Deviation Detection**
    - Test that deviation detection works without network connectivity
    - **Validates: Requirements 14.6**

- [~] 6. Checkpoint - Ensure core AI and detection logic works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement assessment orchestration
  - [~] 7.1 Create AssessmentOrchestrator
    - Implement assessment session management
    - Coordinate voice, facial, and reaction tasks sequentially
    - Track assessment completion time
    - Handle task failures and retries
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [~] 7.2 Write property test for assessment timing
    - **Property 4: Assessment Completion Time Bound**
    - Test that for any assessment, active time ≤ 60 seconds
    - **Validates: Requirements 2.3**
  
  - [~] 7.3 Implement on-device processing pipeline
    - Process raw biometric data to derived metrics
    - Delete raw voice recordings after processing
    - Delete raw facial images after processing
    - Store only derived metrics locally
    - _Requirements: 2.7, 6.8_
  
  - [~] 7.4 Write property test for privacy guarantees
    - **Property 6: On-Device Processing Privacy**
    - **Property 21: Biometric Data Retention Limit**
    - Test that no raw biometric data is transmitted
    - Test that raw data is deleted within 5 seconds
    - **Validates: Requirements 2.7, 2.9, 6.1, 6.2, 6.3, 6.4, 6.8**
  
  - [~] 7.5 Implement assessment rescheduling logic
    - Allow rescheduling within 4-hour window
    - Reject rescheduling outside window
    - Update scheduled time in local database
    - _Requirements: 2.8_
  
  - [~] 7.6 Write property test for rescheduling
    - **Property 7: Assessment Rescheduling Window**
    - Test that rescheduling within 4 hours is accepted
    - Test that rescheduling after 4 hours is rejected
    - **Validates: Requirements 2.8**

- [ ] 8. Implement notification and scheduling
  - [~] 8.1 Create notification scheduler
    - Schedule daily assessment reminders at patient's preferred time
    - Handle timezone conversions correctly
    - Persist scheduled times in local database
    - Update schedules when preferences change
    - _Requirements: 1.2, 2.1_
  
  - [~] 8.2 Write property test for reminder scheduling
    - **Property 3: Assessment Reminder Scheduling**
    - Test that for any valid time and timezone, reminder is scheduled correctly
    - **Validates: Requirements 1.2**
  
  - [~] 8.3 Implement push notification handling
    - Set up React Native push notifications
    - Handle notification permissions (iOS and Android)
    - Integrate with Firebase Cloud Messaging
    - Handle notification tap events
    - _Requirements: 4.1, 11.4_
  
  - [~] 8.4 Write property test for prolonged offline notification
    - **Property 44: Prolonged Offline Notification**
    - Test that notification appears after 7 days offline
    - **Validates: Requirements 14.5**

- [ ] 9. Implement mobile app UI components
  - [~] 9.1 Create onboarding flow screens
    - Welcome screen with NeuroTrace introduction
    - Permission requests (camera, microphone, notifications)
    - Time preference selection with timezone picker
    - Caregiver invitation code entry
    - Onboarding completion confirmation
    - _Requirements: 1.1_
  
  - [~] 9.2 Create assessment UI screens
    - Voice task screen with recording interface and waveform visualization
    - Facial task screen with camera preview and face detection overlay
    - Reaction time task screen with visual stimuli and tap detection
    - Progress indicators showing task completion
    - Assessment completion summary screen
    - _Requirements: 2.2_
  
  - [~] 9.3 Implement accessibility features
    - Voice command navigation for all screens
    - Large fonts (minimum 18pt) with dynamic type support
    - High contrast mode toggle
    - Audio instructions for all assessment tasks
    - Screen reader support (VoiceOver/TalkBack)
    - Alternative input methods for touch difficulties
    - _Requirements: 13.1, 13.2, 13.3, 13.5, 13.7_
  
  - [~] 9.4 Write property tests for accessibility
    - **Property 36: Voice Command Navigation**
    - **Property 37: Minimum Font Size Compliance**
    - **Property 38: Reading Level Compliance**
    - **Property 39: Audio Instruction Availability**
    - Test voice commands work for all navigation
    - Test all text elements are ≥18pt
    - Test instructions are ≤6th grade reading level
    - Test audio files exist for all tasks
    - **Validates: Requirements 13.1, 13.2, 13.4, 13.5**
  
  - [~] 9.5 Implement error handling and guidance UI
    - Display gentle error messages (non-alarming language)
    - Provide retry options for failed tasks
    - Show helpful guidance for common errors
    - _Requirements: 13.6, 4.6_
  
  - [~] 9.6 Write property test for error guidance
    - **Property 40: Assessment Error Guidance**
    - Test that for any error, guidance message is displayed
    - **Validates: Requirements 13.6**

- [ ] 10. Implement backend API services (Node.js/Express on Railway)
  - [~] 10.1 Set up Node.js/Express project structure
    - Configure TypeScript and Express with proper types
    - Set up Prisma ORM for PostgreSQL connection
    - Configure Supabase Auth middleware for JWT verification
    - Set up CORS and security headers (helmet)
    - Configure rate limiting via Cloudflare
    - Set up error handling middleware
    - _Requirements: 8.3, 9.4, 10.1_
  
  - [~] 10.2 Implement Prisma schema and database migrations
    - Define Patient, Assessment, Alert, AuditLog models
    - Create database indexes for performance
    - Set up Row Level Security (RLS) policies
    - Create migration scripts
    - _Requirements: 8.3, 10.6_
  
  - [~] 10.3 Implement AssessmentIngestionService
    - Create POST /api/v1/assessments endpoint
    - Validate incoming derived metrics using Zod
    - Store assessments in PostgreSQL using Prisma
    - Verify no raw biometric data in payload
    - _Requirements: 2.7, 6.4_
  
  - [~] 10.4 Write property test for assessment ingestion
    - **Property 6: On-Device Processing Privacy (network validation)**
    - Test that no raw biometric data is in transmitted payload
    - **Validates: Requirements 2.9, 6.4**
  
  - [~] 10.5 Implement AlertGenerationService
    - Generate alerts from trend analysis
    - Determine alert recipients (caregivers, clinicians)
    - Create alert messages with plain-language summaries
    - Add recommended actions based on severity
    - Store alerts in PostgreSQL
    - _Requirements: 3.4, 4.2, 4.4_
  
  - [~] 10.6 Write property tests for alert generation
    - **Property 13: Alert Content Completeness**
    - Test that alerts contain summary, recommendations, and time-series data
    - **Validates: Requirements 4.2, 4.4, 4.5**
  
  - [~] 10.7 Implement NotificationService
    - Send push notifications via Firebase Cloud Messaging
    - Send SMS via Twilio for High severity alerts
    - Handle notification delivery tracking
    - Store notification records in database
    - _Requirements: 4.1, 4.3_
  
  - [~] 10.8 Write property test for notification delivery
    - **Property 12: Alert Notification Delivery**
    - Test that push notifications sent to all caregivers
    - Test that SMS sent for High severity alerts
    - **Validates: Requirements 4.1, 4.3, 11.4**
  
  - [~] 10.9 Write property test for slow query logging
    - **Property 31: Slow Query Logging**
    - Test that queries >100ms are logged
    - **Validates: Requirements 10.6**

- [~] 11. Checkpoint - Ensure backend services work correctly
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Implement FHIR integration
  - [~] 12.1 Create FHIR resource generators
    - Implement createObservationResource for assessments
    - Implement createCommunicationResource for alerts
    - Implement createPatientResource for patient demographics
    - Map assessment metrics to LOINC codes
    - Validate resources against FHIR R4 schema
    - _Requirements: 5.6, 9.1, 9.3, 9.6_
  
  - [~] 12.2 Write property tests for FHIR compliance
    - **Property 18: FHIR Compliance**
    - **Property 19: LOINC Code Mapping**
    - Test that generated resources validate against FHIR R4 schema
    - Test that metrics have correct LOINC codes
    - **Validates: Requirements 5.6, 9.1, 9.3, 9.6**
  
  - [~] 12.3 Implement FHIR API endpoints
    - GET /fhir/Patient/:patientId
    - GET /fhir/Observation (with query parameters: patient, category, date)
    - POST /fhir/Communication
    - Add FHIR-compliant error responses
    - _Requirements: 9.2_
  
  - [~] 12.4 Implement OAuth 2.0 authentication for FHIR API
    - Set up Supabase Auth integration
    - Implement token validation middleware
    - Add scope-based authorization
    - Support Epic and Cerner FHIR implementation guides
    - _Requirements: 9.4, 9.5_

- [ ] 13. Implement federated learning system
  - [~] 13.1 Create federated learning client (mobile)
    - Compute model gradients after 30 assessments
    - Implement gradient privacy validation using Opacus (differential privacy)
    - Transmit only gradients (not raw data) to cloud
    - Handle opt-out flag from patient profile
    - _Requirements: 7.1, 7.2, 7.5_
  
  - [~] 13.2 Write property test for gradient transmission
    - **Property 22: Federated Learning Gradient Transmission**
    - Test that after 30 assessments, gradients are transmitted
    - Test that no raw patient data is in gradient payload
    - **Validates: Requirements 7.1, 7.2**
  
  - [~] 13.3 Implement FederatedLearningCoordinator (backend)
    - Collect gradients from devices via POST /api/v1/federated/gradients
    - Aggregate gradients using secure aggregation (weighted average)
    - Validate gradient privacy (no PHI leakage)
    - Train global model from aggregated gradients
    - _Requirements: 7.3, 7.5_
  
  - [~] 13.4 Implement model distribution
    - Store model artifacts in Cloudflare R2 (10GB free tier)
    - Create GET /api/v1/federated/model/:version endpoint
    - Implement model download and deployment on mobile
    - Handle model versioning and rollback
    - _Requirements: 7.4_
  
  - [~] 13.5 Write property test for model distribution
    - **Property 24: Global Model Distribution**
    - Test that new models are downloaded within 24 hours
    - **Validates: Requirements 7.4**
  
  - [~] 13.6 Implement opt-out functionality
    - Add opt-out flag to patient profile
    - Disable gradient transmission for opted-out patients
    - Ensure monitoring continues normally (assessments, alerts)
    - _Requirements: 7.6_
  
  - [~] 13.7 Write property test for opt-out
    - **Property 23: Federated Learning Opt-Out**
    - Test that opted-out patients don't transmit gradients
    - Test that monitoring functionality continues
    - **Validates: Requirements 7.6**

- [ ] 14. Implement security and compliance features
  - [~] 14.1 Implement audit logging
    - Create AuditLogger interface implementation
    - Log all PHI access with timestamp, user, resource, action
    - Store logs in PostgreSQL with 6-year retention policy
    - Create audit log query API for compliance reports
    - _Requirements: 8.2, 8.7_
  
  - [~] 14.2 Write property tests for audit logging
    - **Property 25: PHI Access Audit Logging**
    - **Property 28: Audit Log Retention**
    - Test that all PHI access creates audit log entry
    - Test that audit logs are retained for 6+ years
    - **Validates: Requirements 8.2, 8.7**
  
  - [~] 14.3 Implement role-based access control (RBAC)
    - Define roles: Patient, Caregiver, Clinician, Admin
    - Implement permission checking middleware using Supabase Auth
    - Configure PostgreSQL Row Level Security (RLS) policies
    - Add role-based route protection
    - _Requirements: 8.3_
  
  - [~] 14.4 Write property test for RBAC
    - **Property 26: Role-Based Access Control**
    - Test that users can only access resources matching their role
    - **Validates: Requirements 8.3**
  
  - [~] 14.5 Implement data deletion functionality
    - Create DELETE /api/v1/patients/:patientId/data endpoint
    - Remove all PHI from databases (patients, assessments, alerts)
    - Preserve audit logs (compliance requirement)
    - Complete deletion within 7 days
    - _Requirements: 8.5_
  
  - [~] 14.6 Write property test for data deletion
    - **Property 27: Data Deletion Completeness**
    - Test that after deletion, no PHI remains except audit logs
    - **Validates: Requirements 8.5**
  
  - [~] 14.7 Implement security incident detection and alerting
    - Monitor for suspicious activity using Grafana Cloud
    - Detect unauthorized access attempts
    - Send alerts within 1 hour of detection
    - Log all security events
    - _Requirements: 8.8_
  
  - [~] 14.8 Write property test for incident alerting
    - **Property 29: Security Incident Notification Timing**
    - Test that security team is notified within 1 hour
    - **Validates: Requirements 8.8**
  
  - [~] 14.9 Implement encryption service
    - Create EncryptionService using Node.js crypto (AES-256-GCM)
    - Implement key rotation functionality
    - Store encryption keys in Railway environment variables
    - Add TLS 1.3 enforcement via Cloudflare
    - _Requirements: 6.5, 6.6, 6.7_
  
  - [~] 14.10 Write property test for encryption
    - **Property 20: Data Encryption at Rest and in Transit**
    - Test encryption/decryption round-trip
    - Test TLS 1.3 is enforced
    - **Validates: Requirements 6.5, 6.6, 6.7**

- [ ] 15. Implement clinician dashboard (React web app)
  - [~] 15.1 Set up React web app with TypeScript
    - Initialize project with Vite
    - Configure routing with React Router
    - Set up Supabase Auth for authentication
    - Configure deployment to Vercel (free tier)
    - Set up Chart.js or Recharts for visualizations
    - _Requirements: 5.1_
  
  - [~] 15.2 Create patient list component
    - Display assigned patients with status indicators
    - Show patient status (On Track, Needs Attention, Alert)
    - Implement filtering by status
    - Implement sorting by priority
    - Display last assessment date and active alert count
    - _Requirements: 5.1, 5.8_
  
  - [~] 15.3 Write property test for patient prioritization
    - **Property 17: Patient Prioritization by Alert Severity**
    - Test that patients are ordered by alert severity (High, Medium, Low)
    - **Validates: Requirements 5.8**
  
  - [~] 15.4 Create patient detail view
    - Display time-series charts for all metrics using Chart.js
    - Show baseline values alongside current metrics
    - Highlight sustained trends with visual indicators
    - Display alert history with acknowledgment status
    - Show patient demographics and clinical info
    - _Requirements: 5.2, 5.3, 5.4, 5.7_
  
  - [~] 15.5 Write property test for dashboard data completeness
    - **Property 15: Clinician Dashboard Data Completeness**
    - Test that all required data is displayed (metrics, baseline, alerts, trends)
    - **Validates: Requirements 5.2, 5.3, 5.4, 5.7**
  
  - [~] 15.6 Implement data filtering
    - Add date range filter with calendar picker
    - Add metric type filter (speech, facial, reaction)
    - Update charts dynamically based on filters
    - _Requirements: 5.5_
  
  - [~] 15.7 Write property test for filtering
    - **Property 16: Dashboard Filtering Correctness**
    - Test that filtered results match date range and metric type
    - **Validates: Requirements 5.5**
  
  - [~] 15.8 Implement alert acknowledgment
    - Add acknowledge button to alerts
    - Record acknowledgment timestamp and clinician ID
    - Sync acknowledgment to backend
    - Update UI to show acknowledged status
    - _Requirements: 4.7_
  
  - [~] 15.9 Write property test for alert acknowledgment
    - **Property 14: Alert Acknowledgment Tracking**
    - Test that acknowledgment is recorded with timestamp and user
    - **Validates: Requirements 4.7, 11.6**
  
  - [~] 15.10 Implement FHIR data export
    - Add export button to patient detail view
    - Generate FHIR-compliant report
    - Download as JSON file
    - _Requirements: 5.6_

- [ ] 16. Implement caregiver mobile app
  - [~] 16.1 Create caregiver app screens
    - Account linking screen with invitation code entry
    - Patient status dashboard with visual indicators
    - Assessment history view with time-series charts
    - Alert list and detail views
    - Settings screen for notification preferences
    - _Requirements: 11.1, 11.3, 11.5_
  
  - [~] 16.2 Write property test for account linking
    - **Property 32: Caregiver Account Linking**
    - Test that valid invitation codes link successfully
    - Test that invalid codes are rejected
    - **Validates: Requirements 11.1**
  
  - [~] 16.3 Implement patient status calculation
    - Calculate status from recent assessments and alerts
    - Display status with visual indicators (colors, icons)
    - Update status in real-time when new data arrives
    - _Requirements: 11.3_
  
  - [~] 16.4 Write property test for status display
    - **Property 33: Caregiver Status Display**
    - Test that status correctly reflects assessment data and alerts
    - **Validates: Requirements 11.3**
  
  - [~] 16.5 Implement alert acknowledgment in caregiver app
    - Add acknowledge button to alerts
    - Sync acknowledgment to backend
    - Update UI to show acknowledged status
    - _Requirements: 11.6_
  
  - [~] 16.6 Implement assessment summary display
    - Show assessment completion within 1 minute of completion
    - Display derived metrics in user-friendly format
    - _Requirements: 11.2_

- [ ] 17. Implement admin dashboard
  - [~] 17.1 Create admin dashboard screens
    - Aggregate metrics view (total patients, completion rate, alerts)
    - Engagement tracking with charts
    - Alert analytics with severity distribution
    - Cost savings calculator
    - Clinician response time analytics
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_
  
  - [~] 17.2 Write property tests for admin calculations
    - **Property 46: Aggregate Metrics Calculation**
    - **Property 47: Readmission Rate Calculation**
    - **Property 48: Engagement Rate Calculation**
    - **Property 49: Cost Savings Calculation**
    - **Property 50: Clinician Response Time Tracking**
    - Test aggregate metrics are calculated correctly
    - Test readmission rate formula: (readmitted / discharged) × 100
    - Test engagement rate formula: (completed / scheduled) × 100
    - Test cost savings formula: (prevented × cost) - (program cost)
    - Test response time is duration between alert creation and acknowledgment
    - **Validates: Requirements 15.1, 15.2, 15.3, 15.4, 15.5**
  
  - [~] 17.3 Implement data export functionality
    - Export aggregate data to CSV format
    - Validate CSV format (proper escaping, UTF-8 encoding)
    - Add download button with date range selection
    - _Requirements: 15.6_
  
  - [~] 17.4 Write property test for CSV export
    - **Property 51: CSV Export Validity**
    - Test that CSV is valid and opens in spreadsheet applications
    - **Validates: Requirements 15.6**
  
  - [~] 17.5 Implement trend visualization
    - Calculate trends over time periods (monthly, quarterly, yearly)
    - Display trend charts with comparison to previous period
    - Show percentage change indicators
    - _Requirements: 15.7_
  
  - [~] 17.6 Write property test for trend calculation
    - **Property 52: Trend Calculation Across Time Periods**
    - Test that trends compare current period to previous period
    - **Validates: Requirements 15.7**

- [ ] 18. Implement offline functionality
  - [~] 18.1 Ensure assessment completion works offline
    - Test assessment flow without network connection
    - Verify on-device processing works offline
    - Verify deviation detection works offline using local baseline
    - _Requirements: 14.1, 14.2, 14.6_
  
  - [~] 18.2 Write property tests for offline functionality
    - **Property 41: Offline Assessment Completion**
    - **Property 45: Offline Deviation Detection**
    - Test that assessments complete without network
    - Test that deviation detection works offline
    - **Validates: Requirements 14.1, 14.2, 14.6**
  
  - [~] 18.3 Implement local storage capacity management
    - Store up to 30 days of assessment data
    - Implement data pruning for older data (FIFO)
    - Monitor storage usage and warn when approaching limit
    - _Requirements: 14.4_
  
  - [~] 18.4 Write property test for storage capacity
    - **Property 43: Local Storage Capacity**
    - Test that 30 days of assessments can be stored
    - **Validates: Requirements 14.4**
  
  - [~] 18.5 Implement prolonged offline notification
    - Detect offline duration by tracking last successful sync
    - Show notification after 7 days offline
    - Provide guidance to connect to internet
    - _Requirements: 14.5_
  
  - [~] 18.6 Write property test for offline notification
    - **Property 44: Prolonged Offline Notification**
    - Test that notification appears after 7 days offline
    - **Validates: Requirements 14.5**

- [~] 19. Checkpoint - Ensure all features work end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 20. Implement performance optimizations
  - [~] 20.1 Optimize on-device AI processing
    - Profile processing time for each AI component
    - Optimize model inference (quantization, pruning)
    - Ensure <5 second processing time for all assessments
    - Add performance monitoring and logging
    - _Requirements: 10.2_
  
  - [~] 20.2 Write property test for processing performance
    - **Property 30: On-Device Processing Performance**
    - Test that for any assessment, processing completes within 5 seconds
    - **Validates: Requirements 10.2**
  
  - [~] 20.3 Implement slow query logging
    - Add query timing middleware to Prisma
    - Log queries exceeding 100ms with query details
    - Send performance warnings to Grafana Cloud
    - _Requirements: 10.6_
  
  - [~] 20.4 Write property test for slow query logging
    - **Property 31: Slow Query Logging**
    - Test that queries >100ms are logged
    - **Validates: Requirements 10.6**
  
  - [~] 20.5 Implement caching strategy
    - Set up Redis on Railway (free tier: 25MB)
    - Cache frequently accessed patient profiles
    - Cache baseline data
    - Cache dashboard queries with 60-second TTL
    - _Requirements: 10.3_

- [ ] 21. Implement accuracy tracking and alerting
  - [~] 21.1 Create accuracy metrics tracking
    - Calculate sensitivity, specificity, false positive rate
    - Store metrics in database with timestamps
    - Display on admin dashboard with trend charts
    - Compare against targets (94% sensitivity, 97% specificity, <3% FPR)
    - _Requirements: 12.1, 12.2, 12.3, 12.5_
  
  - [~] 21.2 Write property test for accuracy metrics
    - **Property 34: Accuracy Metrics Reporting**
    - Test that accuracy metrics are calculated and reported correctly
    - **Validates: Requirements 12.5**
  
  - [~] 21.3 Implement accuracy threshold alerting
    - Monitor accuracy metrics continuously
    - Send alerts when below thresholds (sensitivity <94%, specificity <97%, FPR >3%)
    - Alert development team via email/Slack
    - _Requirements: 12.6_
  
  - [~] 21.4 Write property test for accuracy alerting
    - **Property 35: Accuracy Threshold Alerting**
    - Test that alerts are sent when accuracy falls below thresholds
    - **Validates: Requirements 12.6**

- [ ] 22. Integration and end-to-end testing
  - [~] 22.1 Write integration tests for assessment flow
    - Test complete flow: assessment → processing → storage → sync
    - Test offline assessment with delayed sync
    - _Requirements: 2.1, 2.2, 2.7, 14.3_
  
  - [~] 22.2 Write integration tests for alert pipeline
    - Test flow: deviation detection → alert generation → notification delivery
    - Test multi-modality alert escalation
    - _Requirements: 3.3, 3.4, 4.1_
  
  - [~] 22.3 Write integration tests for FHIR integration
    - Test data export to FHIR format
    - Test FHIR API endpoints with mock EHR
    - Test OAuth 2.0 authentication flow
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  
  - [~] 22.4 Write E2E tests for mobile app using Detox
    - Test onboarding flow from start to finish
    - Test assessment completion with all three tasks
    - Test offline functionality (airplane mode)
    - _Requirements: 1.1, 2.2, 14.1_
  
  - [~] 22.5 Write integration tests for Supabase Auth
    - Test JWT token validation
    - Test role-based access control
    - Test token refresh flow
    - _Requirements: 8.3, 9.4_
  
  - [~] 22.6 Write integration tests for federated learning
    - Test gradient collection and aggregation
    - Test model distribution to devices
    - Test opt-out functionality
    - _Requirements: 7.1, 7.3, 7.4, 7.6_

- [ ] 23. Security hardening and compliance verification
  - [~] 23.1 Run security scans
    - SAST with SonarQube Community Edition (self-hosted on Railway)
    - Dependency scanning with npm audit and Snyk free tier
    - Container scanning with Trivy
    - DAST with OWASP ZAP
    - Fix all critical and high severity issues
    - _Requirements: 8.6_
  
  - [~] 23.2 Verify HIPAA compliance
    - Verify encryption at rest (SQLCipher AES-256, PostgreSQL encryption)
    - Verify encryption in transit (TLS 1.3 via Let's Encrypt/Cloudflare)
    - Verify audit logging (all PHI access logged)
    - Verify access controls (RBAC via Supabase Auth + PostgreSQL RLS)
    - Verify data retention policies (6-year audit logs, 30-day assessments)
    - Document Business Associate Agreements (BAA) with all vendors
    - _Requirements: 8.1, 8.2, 8.3, 8.7_
  
  - [~] 23.3 Implement certificate pinning
    - Add certificate pinning to mobile app for API endpoints
    - Pin Cloudflare and Railway certificates
    - _Requirements: 6.7_
  
  - [~] 23.4 Set up bug bounty program
    - Create HackerOne or Bugcrowd account (free tier)
    - Define scope (in-scope: API, web dashboards; out-of-scope: mobile apps initially)
    - Define bounty amounts ($50-500 per finding)
    - _Requirements: 8.6_
  
  - [~] 23.5 Run accessibility testing
    - Test with axe-core for WCAG 2.1 Level AA compliance
    - Test with screen readers (VoiceOver on iOS, TalkBack on Android)
    - Test voice commands
    - Test high contrast mode
    - Test with large font sizes
    - Fix all accessibility issues
    - _Requirements: 13.7_

- [ ] 24. Deployment and infrastructure setup
  - [~] 24.1 Set up Railway infrastructure
    - Create Railway project for backend
    - Configure PostgreSQL database on Railway (free tier: 1GB)
    - Set up environment variables for secrets (encryption keys, API keys)
    - Configure automatic deployments from Git (main branch)
    - Set up staging environment (separate Railway project)
    - _Requirements: All (infrastructure)_
  
  - [~] 24.2 Set up Cloudflare services
    - Configure Cloudflare R2 for model storage (10GB free tier)
    - Set up Cloudflare CDN for static assets
    - Configure SSL/TLS with Let's Encrypt (automatic via Cloudflare)
    - Set up rate limiting rules (10K requests/minute per IP)
    - Configure DDoS protection
    - _Requirements: 6.7, 7.4_
  
  - [~] 24.3 Set up Supabase Auth
    - Create Supabase project (free tier: 50K MAU)
    - Configure authentication providers (email/password, OAuth)
    - Set up role-based access control (Patient, Caregiver, Clinician, Admin)
    - Configure Row Level Security policies in PostgreSQL
    - Test authentication flow end-to-end
    - _Requirements: 8.3, 9.4_
  
  - [~] 24.4 Set up Firebase Cloud Messaging
    - Create Firebase project
    - Configure FCM for iOS (APNs certificates)
    - Configure FCM for Android (FCM server key)
    - Set up push notification credentials in backend
    - Test push notifications on both platforms
    - _Requirements: 4.1, 11.4_
  
  - [~] 24.5 Set up CI/CD pipelines
    - Configure GitHub Actions for mobile app (build, test, deploy)
    - Configure GitHub Actions for backend (build, test, deploy to Railway)
    - Set up automated testing in pipeline (unit tests, property tests)
    - Set up security scanning in pipeline (npm audit, Snyk)
    - Configure automatic deployment to Railway and Vercel on merge to main
    - _Requirements: 8.6_
  
  - [~] 24.6 Configure monitoring and alerting
    - Set up Grafana Cloud free tier (10K series, 50GB logs)
    - Configure Prometheus for metrics collection (self-hosted on Railway)
    - Set up custom metrics (assessment rate, alert rate, API latency, error rate)
    - Create Grafana dashboards for system health
    - Configure alert rules (API response time >1s, error rate >1%, query time >200ms)
    - _Requirements: 10.1, 12.5_
  
  - [~] 24.7 Set up backup strategy
    - Configure Railway automatic daily backups (included in free tier)
    - Set up manual backup script to Cloudflare R2 (pg_dump to R2)
    - Test backup restoration process
    - Document disaster recovery procedures (RTO: 4 hours, RPO: 24 hours)
    - _Requirements: 8.7_
  
  - [~] 24.8 Configure domain and DNS
    - Register domain name ($12/year)
    - Configure DNS records in Cloudflare
    - Set up subdomains (api.neurotrace.com, dashboard.neurotrace.com, admin.neurotrace.com)
    - Verify SSL certificates are working
    - _Requirements: 6.7_

- [~] 25. Final checkpoint - Production readiness verification
  - Ensure all tests pass (unit tests, property tests, integration tests)
  - Verify all 52 correctness properties are tested with minimum 100 iterations each
  - Verify code coverage meets 80% minimum (95% for critical paths, 100% for security)
  - Verify security scans pass with no critical/high severity issues
  - Verify performance benchmarks are met (API <500ms, dashboard <2s, AI processing <5s)
  - Verify HIPAA compliance checklist is complete
  - Verify accessibility testing is complete (WCAG 2.1 Level AA)
  - Verify all free tier limits are monitored (Railway bandwidth, PostgreSQL storage, R2 storage)
  - Document upgrade paths for when limits are exceeded
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties (minimum 100 iterations each using fast-check)
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end flows
- Checkpoints ensure incremental validation throughout development
- The implementation uses TypeScript for both mobile (React Native) and backend (Node.js/Express)
- On-device AI uses ONNX Runtime with Phi-3-Mini (3.8B parameters) and MediaPipe Face Mesh
- Backend uses cost-optimized architecture with Railway.app, PostgreSQL, and free-tier services
- All PHI is encrypted at rest (AES-256 via SQLCipher) and in transit (TLS 1.3 via Let's Encrypt/Cloudflare)
- Federated learning ensures privacy-preserving model improvement using Opacus for differential privacy
- Authentication handled by Supabase Auth with JWT tokens and Row Level Security
- Notifications via Firebase Cloud Messaging (free, unlimited)
- Model storage via Cloudflare R2 (10GB free tier)
- Frontend hosting via Vercel (100GB bandwidth/month free tier)
- Monitoring via Grafana Cloud + Prometheus (10K series free tier)
- CI/CD via GitHub Actions (2000 minutes/month free tier)
- Security scanning via SonarQube Community Edition, OWASP ZAP, Trivy, and Snyk free tier
- Total infrastructure cost: $10-50/month for first 500 patients, scaling to $150-250/month at 2,000 patients
- All 52 correctness properties from the design document are mapped to property-based tests
- Property test format: **Feature: neurotrace-monitoring-system, Property {N}: {property_text}**
- Each property test must reference the design document property number and requirements it validates
