import { z } from 'zod';

// Speech metrics validator
export const speechMetricsSchema = z.object({
  articulationRate: z.number().positive(),
  meanPauseDuration: z.number().nonnegative(),
  pauseFrequency: z.number().nonnegative(),
  phoneticPrecision: z.number().min(0).max(1),
  voiceQuality: z.number().min(0).max(1),
  timestamp: z.date(),
});

// Facial metrics validator
export const facialMetricsSchema = z.object({
  symmetryScore: z.number().min(0).max(1),
  leftEyeOpenness: z.number().min(0).max(1),
  rightEyeOpenness: z.number().min(0).max(1),
  mouthSymmetry: z.number().min(0).max(1),
  eyebrowSymmetry: z.number().min(0).max(1),
  timestamp: z.date(),
});

// Reaction metrics validator
export const reactionMetricsSchema = z.object({
  meanReactionTime: z.number().positive(),
  reactionTimeVariability: z.number().nonnegative(),
  correctResponses: z.number().int().nonnegative(),
  totalTrials: z.number().int().positive(),
  timestamp: z.date(),
});

// Derived metrics validator
export const derivedMetricsSchema = z.object({
  speechMetrics: speechMetricsSchema,
  facialMetrics: facialMetricsSchema,
  reactionMetrics: reactionMetricsSchema,
  deviceId: z.string().uuid(),
  timestamp: z.date(),
});

// Patient profile validator
export const patientProfileSchema = z.object({
  patientId: z.string().uuid(),
  demographics: z.object({
    dateOfBirth: z.date(),
    gender: z.string(),
  }),
  clinicalInfo: z.object({
    strokeDate: z.date(),
    strokeType: z.string(),
    dischargeDate: z.date(),
    assignedClinician: z.string(),
    assignedHospital: z.string(),
  }),
  programInfo: z.object({
    enrollmentDate: z.date(),
    programEndDate: z.date(),
    baselineEstablished: z.boolean(),
    baselineCompletionDate: z.date().optional(),
  }),
  preferences: z.object({
    assessmentTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/), // HH:MM format
    timezone: z.string(),
    language: z.string(),
  }),
  caregivers: z.array(
    z.object({
      caregiverId: z.string().uuid(),
      name: z.string(),
      relationship: z.string(),
      phoneNumber: z.string(),
      email: z.string().email(),
      notificationPreferences: z.object({
        pushEnabled: z.boolean(),
        smsEnabled: z.boolean(),
        emailEnabled: z.boolean(),
      }),
    })
  ),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Baseline validator
export const baselineSchema = z.object({
  patientId: z.string().uuid(),
  createdAt: z.date(),
  assessmentCount: z.number().int().min(5),
  speechMetrics: z.object({
    mean: z.number(),
    standardDeviation: z.number().nonnegative(),
    min: z.number(),
    max: z.number(),
  }),
  facialMetrics: z.object({
    mean: z.number(),
    standardDeviation: z.number().nonnegative(),
    min: z.number(),
    max: z.number(),
  }),
  reactionMetrics: z.object({
    mean: z.number(),
    standardDeviation: z.number().nonnegative(),
    min: z.number(),
    max: z.number(),
  }),
});

// Assessment result validator
export const assessmentResultSchema = z.object({
  assessmentId: z.string().uuid(),
  patientId: z.string().uuid(),
  timestamp: z.date(),
  dayNumber: z.number().int().positive(),
  isBaselinePeriod: z.boolean(),
  speechMetrics: speechMetricsSchema,
  facialMetrics: facialMetricsSchema,
  reactionMetrics: reactionMetricsSchema,
  deviations: z.array(z.any()).optional(),
  trendAnalysis: z.any().optional(),
  completionTime: z.number().positive().max(60), // Max 60 seconds
  deviceInfo: z.object({
    deviceId: z.string().uuid(),
    platform: z.enum(['ios', 'android']),
    appVersion: z.string(),
    modelVersion: z.string(),
  }),
});

// Alert record validator
export const alertRecordSchema = z.object({
  alertId: z.string().uuid(),
  patientId: z.string().uuid(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  triggeringAssessments: z.array(z.string().uuid()),
  sustainedDeviations: z.array(z.any()),
  affectedModalities: z.array(z.string()),
  consecutiveDays: z.number().int().min(3),
  message: z.string(),
  recommendedActions: z.array(z.string()),
  status: z.enum(['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'FALSE_POSITIVE']),
  createdAt: z.date(),
  acknowledgedAt: z.date().optional(),
  acknowledgedBy: z.string().optional(),
  clinicianNotes: z.string().optional(),
  notifications: z.array(z.any()),
});

// FHIR Observation validator
export const fhirObservationSchema = z.object({
  resourceType: z.literal('Observation'),
  id: z.string().optional(),
  status: z.enum(['registered', 'preliminary', 'final', 'amended']),
  code: z.object({
    coding: z.array(
      z.object({
        system: z.string().url(),
        code: z.string(),
        display: z.string(),
      })
    ),
    text: z.string().optional(),
  }),
  subject: z.object({
    reference: z.string(),
  }),
  effectiveDateTime: z.string().optional(),
  valueQuantity: z
    .object({
      value: z.number(),
      unit: z.string(),
      system: z.string().url(),
      code: z.string(),
    })
    .optional(),
});

// Deviation validator
export const deviationSchema = z.object({
  metricName: z.string().min(1),
  currentValue: z.number(),
  baselineValue: z.number(),
  standardDeviations: z.number(),
  timestamp: z.date(),
});

// Trend analysis validator
export const trendAnalysisSchema = z.object({
  sustainedDeviations: z.array(deviationSchema),
  consecutiveDays: z.number().int().min(3),
  affectedModalities: z.array(z.string()),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
});

// Encrypted data validator
export const encryptedDataSchema = z.object({
  encrypted: z.string().min(1),
  iv: z.string().min(1),
  authTag: z.string().min(1),
});

// Syncable data validator
export const syncableDataSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['ASSESSMENT', 'ALERT_ACKNOWLEDGMENT', 'GRADIENT']),
  data: z.any(),
  timestamp: z.date(),
  retryCount: z.number().int().nonnegative(),
});

// Sync result validator
export const syncResultSchema = z.object({
  success: z.boolean(),
  syncedCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
  errors: z
    .array(
      z.object({
        id: z.string(),
        error: z.string(),
      })
    )
    .optional(),
});

// Error response validator
export const errorResponseSchema = z.object({
  error: z.object({
    code: z.enum([
      'INVALID_INPUT',
      'UNAUTHORIZED',
      'RESOURCE_NOT_FOUND',
      'RATE_LIMIT_EXCEEDED',
      'INTERNAL_ERROR',
      'SERVICE_UNAVAILABLE',
    ]),
    message: z.string().min(1),
    details: z.any().optional(),
    timestamp: z.date(),
    requestId: z.string().uuid(),
  }),
});

// Retry policy validator
export const retryPolicySchema = z.object({
  maxAttempts: z.number().int().positive(),
  backoffStrategy: z.enum(['EXPONENTIAL', 'LINEAR']),
  initialDelay: z.number().positive(),
  maxDelay: z.number().positive(),
  retryableErrors: z.array(
    z.enum([
      'INVALID_INPUT',
      'UNAUTHORIZED',
      'RESOURCE_NOT_FOUND',
      'RATE_LIMIT_EXCEEDED',
      'INTERNAL_ERROR',
      'SERVICE_UNAVAILABLE',
    ])
  ),
});

// Security event validator
export const securityEventSchema = z.object({
  eventType: z.enum(['UNAUTHORIZED_ACCESS', 'FAILED_LOGIN', 'DATA_BREACH', 'SUSPICIOUS_ACTIVITY']),
  userId: z.string().optional(),
  ipAddress: z.string().ip(),
  timestamp: z.date(),
  details: z.any(),
});

// FHIR Patient validator
export const fhirPatientSchema = z.object({
  resourceType: z.literal('Patient'),
  id: z.string().optional(),
  meta: z
    .object({
      versionId: z.string().optional(),
      lastUpdated: z.string().optional(),
    })
    .optional(),
  identifier: z
    .array(
      z.object({
        system: z.string().url(),
        value: z.string(),
      })
    )
    .optional(),
  name: z
    .array(
      z.object({
        family: z.string(),
        given: z.array(z.string()),
      })
    )
    .optional(),
  gender: z.string().optional(),
  birthDate: z.string().optional(),
});

// FHIR Communication validator
export const fhirCommunicationSchema = z.object({
  resourceType: z.literal('Communication'),
  id: z.string().optional(),
  meta: z
    .object({
      versionId: z.string().optional(),
      lastUpdated: z.string().optional(),
    })
    .optional(),
  status: z.enum(['preparation', 'in-progress', 'completed', 'on-hold', 'stopped']),
  category: z
    .array(
      z.object({
        coding: z.array(
          z.object({
            system: z.string().url(),
            code: z.string(),
            display: z.string(),
          })
        ),
      })
    )
    .optional(),
  priority: z.enum(['routine', 'urgent', 'asap', 'stat']).optional(),
  subject: z
    .object({
      reference: z.string(),
    })
    .optional(),
  sent: z.string().optional(),
  received: z.string().optional(),
  recipient: z
    .array(
      z.object({
        reference: z.string(),
      })
    )
    .optional(),
  payload: z
    .array(
      z.object({
        contentString: z.string().optional(),
      })
    )
    .optional(),
});

// FHIR Bundle validator
export const fhirBundleSchema = z.object({
  resourceType: z.literal('Bundle'),
  id: z.string().optional(),
  meta: z
    .object({
      versionId: z.string().optional(),
      lastUpdated: z.string().optional(),
    })
    .optional(),
  type: z.enum(['document', 'message', 'transaction', 'collection', 'searchset']),
  entry: z
    .array(
      z.object({
        resource: z.any(), // Can be any FHIR resource
      })
    )
    .optional(),
});

// OAuth2 credentials validator
export const oauth2CredentialsSchema = z.object({
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  scope: z.string().min(1),
  tokenUrl: z.string().url(),
});

// Access token validator
export const accessTokenSchema = z.object({
  accessToken: z.string().min(1),
  tokenType: z.string().min(1),
  expiresIn: z.number().int().positive(),
  scope: z.string().min(1),
});

// Stored assessment validator (for cloud storage)
export const storedAssessmentSchema = z.object({
  assessmentId: z.string().uuid(),
  patientId: z.string().uuid(),
  timestamp: z.date(),
  dayNumber: z.number().int().positive(),
  derivedMetrics: z.object({
    speech: z.object({
      articulationRate: z.number().positive(),
      meanPauseDuration: z.number().nonnegative(),
      pauseFrequency: z.number().nonnegative(),
      phoneticPrecision: z.number().min(0).max(1),
      voiceQuality: z.number().min(0).max(1),
    }),
    facial: z.object({
      symmetryScore: z.number().min(0).max(1),
      eyeOpennessRatio: z.number().min(0).max(1),
      mouthSymmetry: z.number().min(0).max(1),
    }),
    reaction: z.object({
      meanReactionTime: z.number().positive(),
      reactionTimeVariability: z.number().nonnegative(),
      accuracy: z.number().min(0).max(1),
    }),
  }),
  deviations: z.array(deviationSchema).optional(),
  alertGenerated: z.boolean(),
  metadata: z.object({
    deviceId: z.string().uuid(),
    platform: z.enum(['ios', 'android']),
    appVersion: z.string(),
    modelVersion: z.string(),
    processingTime: z.number().positive(),
  }),
});

// API request validators for common endpoints
export const assessmentIngestionRequestSchema = z.object({
  patientId: z.string().uuid(),
  derivedMetrics: derivedMetricsSchema,
});

export const alertAcknowledgmentRequestSchema = z.object({
  clinicianId: z.string().uuid(),
  notes: z.string().optional(),
});

export const patientUpdateRequestSchema = patientProfileSchema.partial();

// Validation helper functions
export const validateSpeechMetrics = (data: unknown) => speechMetricsSchema.parse(data);
export const validateFacialMetrics = (data: unknown) => facialMetricsSchema.parse(data);
export const validateReactionMetrics = (data: unknown) => reactionMetricsSchema.parse(data);
export const validateDerivedMetrics = (data: unknown) => derivedMetricsSchema.parse(data);
export const validatePatientProfile = (data: unknown) => patientProfileSchema.parse(data);
export const validateBaseline = (data: unknown) => baselineSchema.parse(data);
export const validateAssessmentResult = (data: unknown) => assessmentResultSchema.parse(data);
export const validateAlertRecord = (data: unknown) => alertRecordSchema.parse(data);
export const validateDeviation = (data: unknown) => deviationSchema.parse(data);
export const validateTrendAnalysis = (data: unknown) => trendAnalysisSchema.parse(data);
export const validateEncryptedData = (data: unknown) => encryptedDataSchema.parse(data);
export const validateSyncableData = (data: unknown) => syncableDataSchema.parse(data);
export const validateSyncResult = (data: unknown) => syncResultSchema.parse(data);
export const validateErrorResponse = (data: unknown) => errorResponseSchema.parse(data);
export const validateRetryPolicy = (data: unknown) => retryPolicySchema.parse(data);
export const validateSecurityEvent = (data: unknown) => securityEventSchema.parse(data);
export const validateFHIRObservation = (data: unknown) => fhirObservationSchema.parse(data);
export const validateFHIRPatient = (data: unknown) => fhirPatientSchema.parse(data);
export const validateFHIRCommunication = (data: unknown) => fhirCommunicationSchema.parse(data);
export const validateFHIRBundle = (data: unknown) => fhirBundleSchema.parse(data);
export const validateOAuth2Credentials = (data: unknown) => oauth2CredentialsSchema.parse(data);
export const validateAccessToken = (data: unknown) => accessTokenSchema.parse(data);
export const validateStoredAssessment = (data: unknown) => storedAssessmentSchema.parse(data);
export const validateAssessmentIngestionRequest = (data: unknown) =>
  assessmentIngestionRequestSchema.parse(data);
export const validateAlertAcknowledgmentRequest = (data: unknown) =>
  alertAcknowledgmentRequestSchema.parse(data);
export const validatePatientUpdateRequest = (data: unknown) => patientUpdateRequestSchema.parse(data);

// Safe validation functions that return results instead of throwing
export const safeParseSpeechMetrics = (data: unknown) => speechMetricsSchema.safeParse(data);
export const safeParseFacialMetrics = (data: unknown) => facialMetricsSchema.safeParse(data);
export const safeParseReactionMetrics = (data: unknown) => reactionMetricsSchema.safeParse(data);
export const safeParseDerivedMetrics = (data: unknown) => derivedMetricsSchema.safeParse(data);
export const safeParsePatientProfile = (data: unknown) => patientProfileSchema.safeParse(data);
export const safeParseBaseline = (data: unknown) => baselineSchema.safeParse(data);
export const safeParseAssessmentResult = (data: unknown) => assessmentResultSchema.safeParse(data);
export const safeParseAlertRecord = (data: unknown) => alertRecordSchema.safeParse(data);
export const safeParseDeviation = (data: unknown) => deviationSchema.safeParse(data);
export const safeParseTrendAnalysis = (data: unknown) => trendAnalysisSchema.safeParse(data);
export const safeParseEncryptedData = (data: unknown) => encryptedDataSchema.safeParse(data);
export const safeParseSyncableData = (data: unknown) => syncableDataSchema.safeParse(data);
export const safeParseSyncResult = (data: unknown) => syncResultSchema.safeParse(data);
export const safeParseErrorResponse = (data: unknown) => errorResponseSchema.safeParse(data);
export const safeParseRetryPolicy = (data: unknown) => retryPolicySchema.safeParse(data);
export const safeParseSecurityEvent = (data: unknown) => securityEventSchema.safeParse(data);
export const safeParseFHIRObservation = (data: unknown) => fhirObservationSchema.safeParse(data);
export const safeParseFHIRPatient = (data: unknown) => fhirPatientSchema.safeParse(data);
export const safeParseFHIRCommunication = (data: unknown) => fhirCommunicationSchema.safeParse(data);
export const safeParseFHIRBundle = (data: unknown) => fhirBundleSchema.safeParse(data);
export const safeParseOAuth2Credentials = (data: unknown) => oauth2CredentialsSchema.safeParse(data);
export const safeParseAccessToken = (data: unknown) => accessTokenSchema.safeParse(data);
export const safeParseStoredAssessment = (data: unknown) => storedAssessmentSchema.safeParse(data);
export const safeParseAssessmentIngestionRequest = (data: unknown) =>
  assessmentIngestionRequestSchema.safeParse(data);
export const safeParseAlertAcknowledgmentRequest = (data: unknown) =>
  alertAcknowledgmentRequestSchema.safeParse(data);
export const safeParsePatientUpdateRequest = (data: unknown) =>
  patientUpdateRequestSchema.safeParse(data);

// Export type inference helpers
export type SpeechMetricsInput = z.infer<typeof speechMetricsSchema>;
export type FacialMetricsInput = z.infer<typeof facialMetricsSchema>;
export type ReactionMetricsInput = z.infer<typeof reactionMetricsSchema>;
export type DerivedMetricsInput = z.infer<typeof derivedMetricsSchema>;
export type PatientProfileInput = z.infer<typeof patientProfileSchema>;
export type BaselineInput = z.infer<typeof baselineSchema>;
export type AssessmentResultInput = z.infer<typeof assessmentResultSchema>;
export type AlertRecordInput = z.infer<typeof alertRecordSchema>;
export type DeviationInput = z.infer<typeof deviationSchema>;
export type TrendAnalysisInput = z.infer<typeof trendAnalysisSchema>;
export type EncryptedDataInput = z.infer<typeof encryptedDataSchema>;
export type SyncableDataInput = z.infer<typeof syncableDataSchema>;
export type SyncResultInput = z.infer<typeof syncResultSchema>;
export type ErrorResponseInput = z.infer<typeof errorResponseSchema>;
export type RetryPolicyInput = z.infer<typeof retryPolicySchema>;
export type SecurityEventInput = z.infer<typeof securityEventSchema>;
export type FHIRObservationInput = z.infer<typeof fhirObservationSchema>;
export type FHIRPatientInput = z.infer<typeof fhirPatientSchema>;
export type FHIRCommunicationInput = z.infer<typeof fhirCommunicationSchema>;
export type FHIRBundleInput = z.infer<typeof fhirBundleSchema>;
export type OAuth2CredentialsInput = z.infer<typeof oauth2CredentialsSchema>;
export type AccessTokenInput = z.infer<typeof accessTokenSchema>;
export type StoredAssessmentInput = z.infer<typeof storedAssessmentSchema>;
export type AssessmentIngestionRequestInput = z.infer<typeof assessmentIngestionRequestSchema>;
export type AlertAcknowledgmentRequestInput = z.infer<typeof alertAcknowledgmentRequestSchema>;
export type PatientUpdateRequestInput = z.infer<typeof patientUpdateRequestSchema>;
