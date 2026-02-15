import { describe, it, expect } from '@jest/globals';
import {
  speechMetricsSchema,
  facialMetricsSchema,
  reactionMetricsSchema,
  derivedMetricsSchema,
  baselineSchema,
  deviationSchema,
  trendAnalysisSchema,
  encryptedDataSchema,
  syncableDataSchema,
  errorResponseSchema,
  securityEventSchema,
  fhirObservationSchema,
  fhirPatientSchema,
  fhirCommunicationSchema,
  oauth2CredentialsSchema,
  storedAssessmentSchema,
  assessmentIngestionRequestSchema,
  alertAcknowledgmentRequestSchema,
  validateSpeechMetrics,
  safeParseSpeechMetrics,
} from '../validators';

describe('Validators', () => {
  describe('speechMetricsSchema', () => {
    it('should validate valid speech metrics', () => {
      const validData = {
        articulationRate: 150,
        meanPauseDuration: 500,
        pauseFrequency: 10,
        phoneticPrecision: 0.95,
        voiceQuality: 0.85,
        timestamp: new Date(),
      };

      expect(() => speechMetricsSchema.parse(validData)).not.toThrow();
    });

    it('should reject negative articulation rate', () => {
      const invalidData = {
        articulationRate: -10,
        meanPauseDuration: 500,
        pauseFrequency: 10,
        phoneticPrecision: 0.95,
        voiceQuality: 0.85,
        timestamp: new Date(),
      };

      expect(() => speechMetricsSchema.parse(invalidData)).toThrow();
    });

    it('should reject phonetic precision out of range', () => {
      const invalidData = {
        articulationRate: 150,
        meanPauseDuration: 500,
        pauseFrequency: 10,
        phoneticPrecision: 1.5,
        voiceQuality: 0.85,
        timestamp: new Date(),
      };

      expect(() => speechMetricsSchema.parse(invalidData)).toThrow();
    });
  });

  describe('facialMetricsSchema', () => {
    it('should validate valid facial metrics', () => {
      const validData = {
        symmetryScore: 0.92,
        leftEyeOpenness: 0.88,
        rightEyeOpenness: 0.90,
        mouthSymmetry: 0.95,
        eyebrowSymmetry: 0.87,
        timestamp: new Date(),
      };

      expect(() => facialMetricsSchema.parse(validData)).not.toThrow();
    });

    it('should reject symmetry score out of range', () => {
      const invalidData = {
        symmetryScore: 1.5,
        leftEyeOpenness: 0.88,
        rightEyeOpenness: 0.90,
        mouthSymmetry: 0.95,
        eyebrowSymmetry: 0.87,
        timestamp: new Date(),
      };

      expect(() => facialMetricsSchema.parse(invalidData)).toThrow();
    });
  });

  describe('reactionMetricsSchema', () => {
    it('should validate valid reaction metrics', () => {
      const validData = {
        meanReactionTime: 350,
        reactionTimeVariability: 50,
        correctResponses: 9,
        totalTrials: 10,
        timestamp: new Date(),
      };

      expect(() => reactionMetricsSchema.parse(validData)).not.toThrow();
    });

    it('should reject negative reaction time', () => {
      const invalidData = {
        meanReactionTime: -100,
        reactionTimeVariability: 50,
        correctResponses: 9,
        totalTrials: 10,
        timestamp: new Date(),
      };

      expect(() => reactionMetricsSchema.parse(invalidData)).toThrow();
    });
  });

  describe('derivedMetricsSchema', () => {
    it('should validate complete derived metrics', () => {
      const validData = {
        speechMetrics: {
          articulationRate: 150,
          meanPauseDuration: 500,
          pauseFrequency: 10,
          phoneticPrecision: 0.95,
          voiceQuality: 0.85,
          timestamp: new Date(),
        },
        facialMetrics: {
          symmetryScore: 0.92,
          leftEyeOpenness: 0.88,
          rightEyeOpenness: 0.90,
          mouthSymmetry: 0.95,
          eyebrowSymmetry: 0.87,
          timestamp: new Date(),
        },
        reactionMetrics: {
          meanReactionTime: 350,
          reactionTimeVariability: 50,
          correctResponses: 9,
          totalTrials: 10,
          timestamp: new Date(),
        },
        deviceId: '123e4567-e89b-12d3-a456-426614174000',
        timestamp: new Date(),
      };

      expect(() => derivedMetricsSchema.parse(validData)).not.toThrow();
    });

    it('should reject invalid UUID for deviceId', () => {
      const invalidData = {
        speechMetrics: {
          articulationRate: 150,
          meanPauseDuration: 500,
          pauseFrequency: 10,
          phoneticPrecision: 0.95,
          voiceQuality: 0.85,
          timestamp: new Date(),
        },
        facialMetrics: {
          symmetryScore: 0.92,
          leftEyeOpenness: 0.88,
          rightEyeOpenness: 0.90,
          mouthSymmetry: 0.95,
          eyebrowSymmetry: 0.87,
          timestamp: new Date(),
        },
        reactionMetrics: {
          meanReactionTime: 350,
          reactionTimeVariability: 50,
          correctResponses: 9,
          totalTrials: 10,
          timestamp: new Date(),
        },
        deviceId: 'not-a-uuid',
        timestamp: new Date(),
      };

      expect(() => derivedMetricsSchema.parse(invalidData)).toThrow();
    });
  });

  describe('baselineSchema', () => {
    it('should validate valid baseline', () => {
      const validData = {
        patientId: '123e4567-e89b-12d3-a456-426614174000',
        createdAt: new Date(),
        assessmentCount: 7,
        speechMetrics: {
          mean: 150,
          standardDeviation: 10,
          min: 130,
          max: 170,
        },
        facialMetrics: {
          mean: 0.9,
          standardDeviation: 0.05,
          min: 0.85,
          max: 0.95,
        },
        reactionMetrics: {
          mean: 350,
          standardDeviation: 30,
          min: 300,
          max: 400,
        },
      };

      expect(() => baselineSchema.parse(validData)).not.toThrow();
    });

    it('should reject baseline with less than 5 assessments', () => {
      const invalidData = {
        patientId: '123e4567-e89b-12d3-a456-426614174000',
        createdAt: new Date(),
        assessmentCount: 3,
        speechMetrics: {
          mean: 150,
          standardDeviation: 10,
          min: 130,
          max: 170,
        },
        facialMetrics: {
          mean: 0.9,
          standardDeviation: 0.05,
          min: 0.85,
          max: 0.95,
        },
        reactionMetrics: {
          mean: 350,
          standardDeviation: 30,
          min: 300,
          max: 400,
        },
      };

      expect(() => baselineSchema.parse(invalidData)).toThrow();
    });

    it('should reject negative standard deviation', () => {
      const invalidData = {
        patientId: '123e4567-e89b-12d3-a456-426614174000',
        createdAt: new Date(),
        assessmentCount: 7,
        speechMetrics: {
          mean: 150,
          standardDeviation: -10,
          min: 130,
          max: 170,
        },
        facialMetrics: {
          mean: 0.9,
          standardDeviation: 0.05,
          min: 0.85,
          max: 0.95,
        },
        reactionMetrics: {
          mean: 350,
          standardDeviation: 30,
          min: 300,
          max: 400,
        },
      };

      expect(() => baselineSchema.parse(invalidData)).toThrow();
    });
  });

  describe('deviationSchema', () => {
    it('should validate valid deviation', () => {
      const validData = {
        metricName: 'articulationRate',
        currentValue: 120,
        baselineValue: 150,
        standardDeviations: 2.5,
        timestamp: new Date(),
      };

      expect(() => deviationSchema.parse(validData)).not.toThrow();
    });

    it('should reject empty metric name', () => {
      const invalidData = {
        metricName: '',
        currentValue: 120,
        baselineValue: 150,
        standardDeviations: 2.5,
        timestamp: new Date(),
      };

      expect(() => deviationSchema.parse(invalidData)).toThrow();
    });
  });

  describe('trendAnalysisSchema', () => {
    it('should validate valid trend analysis', () => {
      const validData = {
        sustainedDeviations: [
          {
            metricName: 'articulationRate',
            currentValue: 120,
            baselineValue: 150,
            standardDeviations: 2.5,
            timestamp: new Date(),
          },
        ],
        consecutiveDays: 3,
        affectedModalities: ['speech'],
        severity: 'MEDIUM',
      };

      expect(() => trendAnalysisSchema.parse(validData)).not.toThrow();
    });

    it('should reject consecutive days less than 3', () => {
      const invalidData = {
        sustainedDeviations: [
          {
            metricName: 'articulationRate',
            currentValue: 120,
            baselineValue: 150,
            standardDeviations: 2.5,
            timestamp: new Date(),
          },
        ],
        consecutiveDays: 2,
        affectedModalities: ['speech'],
        severity: 'MEDIUM',
      };

      expect(() => trendAnalysisSchema.parse(invalidData)).toThrow();
    });
  });

  describe('encryptedDataSchema', () => {
    it('should validate valid encrypted data', () => {
      const validData = {
        encrypted: 'abc123def456',
        iv: 'xyz789',
        authTag: 'tag123',
      };

      expect(() => encryptedDataSchema.parse(validData)).not.toThrow();
    });

    it('should reject empty encrypted string', () => {
      const invalidData = {
        encrypted: '',
        iv: 'xyz789',
        authTag: 'tag123',
      };

      expect(() => encryptedDataSchema.parse(invalidData)).toThrow();
    });
  });

  describe('syncableDataSchema', () => {
    it('should validate valid syncable data', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'ASSESSMENT',
        data: { test: 'data' },
        timestamp: new Date(),
        retryCount: 0,
      };

      expect(() => syncableDataSchema.parse(validData)).not.toThrow();
    });

    it('should reject invalid sync type', () => {
      const invalidData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'INVALID_TYPE',
        data: { test: 'data' },
        timestamp: new Date(),
        retryCount: 0,
      };

      expect(() => syncableDataSchema.parse(invalidData)).toThrow();
    });

    it('should reject negative retry count', () => {
      const invalidData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'ASSESSMENT',
        data: { test: 'data' },
        timestamp: new Date(),
        retryCount: -1,
      };

      expect(() => syncableDataSchema.parse(invalidData)).toThrow();
    });
  });

  describe('errorResponseSchema', () => {
    it('should validate valid error response', () => {
      const validData = {
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid input provided',
          timestamp: new Date(),
          requestId: '123e4567-e89b-12d3-a456-426614174000',
        },
      };

      expect(() => errorResponseSchema.parse(validData)).not.toThrow();
    });

    it('should reject invalid error code', () => {
      const invalidData = {
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'Invalid input provided',
          timestamp: new Date(),
          requestId: '123e4567-e89b-12d3-a456-426614174000',
        },
      };

      expect(() => errorResponseSchema.parse(invalidData)).toThrow();
    });
  });

  describe('fhirObservationSchema', () => {
    it('should validate valid FHIR observation', () => {
      const validData = {
        resourceType: 'Observation',
        status: 'final',
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: '12345-6',
              display: 'Speech Rate',
            },
          ],
        },
        subject: {
          reference: 'Patient/123',
        },
        valueQuantity: {
          value: 150,
          unit: 'words/min',
          system: 'http://unitsofmeasure.org',
          code: 'wpm',
        },
      };

      expect(() => fhirObservationSchema.parse(validData)).not.toThrow();
    });

    it('should reject invalid resource type', () => {
      const invalidData = {
        resourceType: 'Patient',
        status: 'final',
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: '12345-6',
              display: 'Speech Rate',
            },
          ],
        },
        subject: {
          reference: 'Patient/123',
        },
      };

      expect(() => fhirObservationSchema.parse(invalidData)).toThrow();
    });
  });

  describe('fhirPatientSchema', () => {
    it('should validate valid FHIR patient', () => {
      const validData = {
        resourceType: 'Patient',
        id: '123',
        name: [
          {
            family: 'Doe',
            given: ['John'],
          },
        ],
        gender: 'male',
        birthDate: '1980-01-01',
      };

      expect(() => fhirPatientSchema.parse(validData)).not.toThrow();
    });
  });

  describe('fhirCommunicationSchema', () => {
    it('should validate valid FHIR communication', () => {
      const validData = {
        resourceType: 'Communication',
        status: 'completed',
        priority: 'urgent',
        subject: {
          reference: 'Patient/123',
        },
        payload: [
          {
            contentString: 'Alert: Patient showing sustained trend',
          },
        ],
      };

      expect(() => fhirCommunicationSchema.parse(validData)).not.toThrow();
    });
  });

  describe('oauth2CredentialsSchema', () => {
    it('should validate valid OAuth2 credentials', () => {
      const validData = {
        clientId: 'client123',
        clientSecret: 'secret456',
        scope: 'read write',
        tokenUrl: 'https://auth.example.com/token',
      };

      expect(() => oauth2CredentialsSchema.parse(validData)).not.toThrow();
    });

    it('should reject invalid token URL', () => {
      const invalidData = {
        clientId: 'client123',
        clientSecret: 'secret456',
        scope: 'read write',
        tokenUrl: 'not-a-url',
      };

      expect(() => oauth2CredentialsSchema.parse(invalidData)).toThrow();
    });
  });

  describe('securityEventSchema', () => {
    it('should validate valid security event', () => {
      const validData = {
        eventType: 'UNAUTHORIZED_ACCESS',
        userId: 'user123',
        ipAddress: '192.168.1.1',
        timestamp: new Date(),
        details: { path: '/api/patients' },
      };

      expect(() => securityEventSchema.parse(validData)).not.toThrow();
    });

    it('should reject invalid IP address', () => {
      const invalidData = {
        eventType: 'UNAUTHORIZED_ACCESS',
        userId: 'user123',
        ipAddress: 'not-an-ip',
        timestamp: new Date(),
        details: { path: '/api/patients' },
      };

      expect(() => securityEventSchema.parse(invalidData)).toThrow();
    });
  });

  describe('storedAssessmentSchema', () => {
    it('should validate valid stored assessment', () => {
      const validData = {
        assessmentId: '123e4567-e89b-12d3-a456-426614174000',
        patientId: '123e4567-e89b-12d3-a456-426614174001',
        timestamp: new Date(),
        dayNumber: 5,
        derivedMetrics: {
          speech: {
            articulationRate: 150,
            meanPauseDuration: 500,
            pauseFrequency: 10,
            phoneticPrecision: 0.95,
            voiceQuality: 0.85,
          },
          facial: {
            symmetryScore: 0.92,
            eyeOpennessRatio: 0.89,
            mouthSymmetry: 0.95,
          },
          reaction: {
            meanReactionTime: 350,
            reactionTimeVariability: 50,
            accuracy: 0.9,
          },
        },
        alertGenerated: false,
        metadata: {
          deviceId: '123e4567-e89b-12d3-a456-426614174002',
          platform: 'ios',
          appVersion: '1.0.0',
          modelVersion: 'v1.0',
          processingTime: 3.5,
        },
      };

      expect(() => storedAssessmentSchema.parse(validData)).not.toThrow();
    });
  });

  describe('Validation helper functions', () => {
    it('should validate using helper function', () => {
      const validData = {
        articulationRate: 150,
        meanPauseDuration: 500,
        pauseFrequency: 10,
        phoneticPrecision: 0.95,
        voiceQuality: 0.85,
        timestamp: new Date(),
      };

      expect(() => validateSpeechMetrics(validData)).not.toThrow();
    });

    it('should throw on invalid data using helper function', () => {
      const invalidData = {
        articulationRate: -10,
        meanPauseDuration: 500,
        pauseFrequency: 10,
        phoneticPrecision: 0.95,
        voiceQuality: 0.85,
        timestamp: new Date(),
      };

      expect(() => validateSpeechMetrics(invalidData)).toThrow();
    });
  });

  describe('Safe parse functions', () => {
    it('should return success for valid data', () => {
      const validData = {
        articulationRate: 150,
        meanPauseDuration: 500,
        pauseFrequency: 10,
        phoneticPrecision: 0.95,
        voiceQuality: 0.85,
        timestamp: new Date(),
      };

      const result = safeParseSpeechMetrics(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.articulationRate).toBe(150);
      }
    });

    it('should return error for invalid data', () => {
      const invalidData = {
        articulationRate: -10,
        meanPauseDuration: 500,
        pauseFrequency: 10,
        phoneticPrecision: 0.95,
        voiceQuality: 0.85,
        timestamp: new Date(),
      };

      const result = safeParseSpeechMetrics(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('API request validators', () => {
    it('should validate assessment ingestion request', () => {
      const validData = {
        patientId: '123e4567-e89b-12d3-a456-426614174000',
        derivedMetrics: {
          speechMetrics: {
            articulationRate: 150,
            meanPauseDuration: 500,
            pauseFrequency: 10,
            phoneticPrecision: 0.95,
            voiceQuality: 0.85,
            timestamp: new Date(),
          },
          facialMetrics: {
            symmetryScore: 0.92,
            leftEyeOpenness: 0.88,
            rightEyeOpenness: 0.90,
            mouthSymmetry: 0.95,
            eyebrowSymmetry: 0.87,
            timestamp: new Date(),
          },
          reactionMetrics: {
            meanReactionTime: 350,
            reactionTimeVariability: 50,
            correctResponses: 9,
            totalTrials: 10,
            timestamp: new Date(),
          },
          deviceId: '123e4567-e89b-12d3-a456-426614174001',
          timestamp: new Date(),
        },
      };

      expect(() => assessmentIngestionRequestSchema.parse(validData)).not.toThrow();
    });

    it('should validate alert acknowledgment request', () => {
      const validData = {
        clinicianId: '123e4567-e89b-12d3-a456-426614174000',
        notes: 'Reviewed and contacted patient',
      };

      expect(() => alertAcknowledgmentRequestSchema.parse(validData)).not.toThrow();
    });
  });
});
