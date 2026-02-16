/**
 * Schema Validation Tests
 * 
 * Tests for Prisma schema validation including:
 * - Model creation with valid data
 * - Validation rules and constraints
 * - Relationship integrity
 * 
 * Requirements: 1.1, 2.1, 3.1, 4.1
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Schema Validation Tests', () => {
  beforeAll(async () => {
    // Clean up test data before running tests
    await prisma.notification.deleteMany();
    await prisma.alert.deleteMany();
    await prisma.assessment.deleteMany();
    await prisma.baseline.deleteMany();
    await prisma.caregiver.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.federatedGradient.deleteMany();
    await prisma.globalModel.deleteMany();
    await prisma.patient.deleteMany();
  });

  afterAll(async () => {
    // Clean up test data after running tests
    await prisma.notification.deleteMany();
    await prisma.alert.deleteMany();
    await prisma.assessment.deleteMany();
    await prisma.baseline.deleteMany();
    await prisma.caregiver.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.federatedGradient.deleteMany();
    await prisma.globalModel.deleteMany();
    await prisma.patient.deleteMany();
    await prisma.$disconnect();
  });

  describe('Patient Model', () => {
    it('should create a patient with valid data', async () => {
      const patient = await prisma.patient.create({
        data: {
          dateOfBirth: new Date('1960-01-01'),
          gender: 'Male',
          strokeDate: new Date('2024-01-01'),
          strokeType: 'Ischemic',
          dischargeDate: new Date('2024-01-10'),
          assignedClinician: 'Dr. Smith',
          assignedHospital: 'General Hospital',
          enrollmentDate: new Date('2024-01-11'),
          programEndDate: new Date('2024-04-11'),
          assessmentTime: '09:00',
          timezone: 'America/New_York',
          language: 'en',
        },
      });

      expect(patient.id).toBeDefined();
      expect(patient.gender).toBe('Male');
      expect(patient.baselineEstablished).toBe(false);
      expect(patient.createdAt).toBeInstanceOf(Date);
      expect(patient.updatedAt).toBeInstanceOf(Date);
    });

    it('should enforce required fields', async () => {
      await expect(
        prisma.patient.create({
          data: {
            // Missing required fields
            dateOfBirth: new Date('1960-01-01'),
          } as any,
        })
      ).rejects.toThrow();
    });

    it('should set default values correctly', async () => {
      const patient = await prisma.patient.create({
        data: {
          dateOfBirth: new Date('1965-05-15'),
          gender: 'Female',
          strokeDate: new Date('2024-02-01'),
          strokeType: 'Hemorrhagic',
          dischargeDate: new Date('2024-02-15'),
          assignedClinician: 'Dr. Johnson',
          assignedHospital: 'City Hospital',
          enrollmentDate: new Date('2024-02-16'),
          programEndDate: new Date('2024-05-16'),
          assessmentTime: '14:00',
          timezone: 'America/Los_Angeles',
          language: 'en',
        },
      });

      expect(patient.baselineEstablished).toBe(false);
      expect(patient.baselineCompletionDate).toBeNull();
    });

    it('should update patient data', async () => {
      const patient = await prisma.patient.create({
        data: {
          dateOfBirth: new Date('1970-03-20'),
          gender: 'Male',
          strokeDate: new Date('2024-03-01'),
          strokeType: 'Ischemic',
          dischargeDate: new Date('2024-03-10'),
          assignedClinician: 'Dr. Williams',
          assignedHospital: 'Regional Hospital',
          enrollmentDate: new Date('2024-03-11'),
          programEndDate: new Date('2024-06-11'),
          assessmentTime: '10:30',
          timezone: 'America/Chicago',
          language: 'en',
        },
      });

      const updated = await prisma.patient.update({
        where: { id: patient.id },
        data: {
          baselineEstablished: true,
          baselineCompletionDate: new Date('2024-03-18'),
        },
      });

      expect(updated.baselineEstablished).toBe(true);
      expect(updated.baselineCompletionDate).toBeInstanceOf(Date);
      expect(updated.updatedAt.getTime()).toBeGreaterThan(patient.updatedAt.getTime());
    });
  });

  describe('Caregiver Model', () => {
    let testPatient: any;

    beforeEach(async () => {
      testPatient = await prisma.patient.create({
        data: {
          dateOfBirth: new Date('1955-08-10'),
          gender: 'Female',
          strokeDate: new Date('2024-01-05'),
          strokeType: 'Ischemic',
          dischargeDate: new Date('2024-01-15'),
          assignedClinician: 'Dr. Brown',
          assignedHospital: 'Memorial Hospital',
          enrollmentDate: new Date('2024-01-16'),
          programEndDate: new Date('2024-04-16'),
          assessmentTime: '08:00',
          timezone: 'America/New_York',
          language: 'en',
        },
      });
    });

    it('should create a caregiver with valid data', async () => {
      const caregiver = await prisma.caregiver.create({
        data: {
          patientId: testPatient.id,
          name: 'John Doe',
          relationship: 'Spouse',
          phoneNumber: '+1234567890',
          email: 'john.doe@example.com',
          invitationCode: 'ABC123XYZ',
          invitationCodeExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      expect(caregiver.id).toBeDefined();
      expect(caregiver.patientId).toBe(testPatient.id);
      expect(caregiver.pushEnabled).toBe(true);
      expect(caregiver.smsEnabled).toBe(true);
      expect(caregiver.emailEnabled).toBe(false);
      expect(caregiver.linkedAt).toBeNull();
    });

    it('should enforce unique invitation code', async () => {
      const invitationCode = 'UNIQUE123';
      
      await prisma.caregiver.create({
        data: {
          patientId: testPatient.id,
          name: 'Jane Doe',
          relationship: 'Daughter',
          phoneNumber: '+1987654321',
          email: 'jane.doe@example.com',
          invitationCode,
          invitationCodeExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      await expect(
        prisma.caregiver.create({
          data: {
            patientId: testPatient.id,
            name: 'Bob Smith',
            relationship: 'Son',
            phoneNumber: '+1555555555',
            email: 'bob.smith@example.com',
            invitationCode, // Duplicate
            invitationCodeExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        })
      ).rejects.toThrow();
    });

    it('should cascade delete caregivers when patient is deleted', async () => {
      const caregiver = await prisma.caregiver.create({
        data: {
          patientId: testPatient.id,
          name: 'Alice Johnson',
          relationship: 'Friend',
          phoneNumber: '+1222333444',
          email: 'alice.j@example.com',
          invitationCode: 'CASCADE123',
          invitationCodeExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      await prisma.patient.delete({ where: { id: testPatient.id } });

      const deletedCaregiver = await prisma.caregiver.findUnique({
        where: { id: caregiver.id },
      });

      expect(deletedCaregiver).toBeNull();
    });
  });

  describe('Assessment Model', () => {
    let testPatient: any;

    beforeEach(async () => {
      testPatient = await prisma.patient.create({
        data: {
          dateOfBirth: new Date('1958-11-25'),
          gender: 'Male',
          strokeDate: new Date('2024-01-20'),
          strokeType: 'Ischemic',
          dischargeDate: new Date('2024-01-30'),
          assignedClinician: 'Dr. Davis',
          assignedHospital: 'University Hospital',
          enrollmentDate: new Date('2024-01-31'),
          programEndDate: new Date('2024-04-30'),
          assessmentTime: '11:00',
          timezone: 'America/Denver',
          language: 'en',
        },
      });
    });

    it('should create an assessment with valid data', async () => {
      const assessment = await prisma.assessment.create({
        data: {
          patientId: testPatient.id,
          timestamp: new Date(),
          dayNumber: 1,
          derivedMetrics: {
            speech: {
              articulationRate: 150,
              meanPauseDuration: 200,
              pauseFrequency: 5,
              phoneticPrecision: 0.95,
              voiceQuality: 0.9,
            },
            facial: {
              symmetryScore: 0.92,
              eyeOpennessRatio: 0.98,
              mouthSymmetry: 0.94,
            },
            reaction: {
              meanReactionTime: 350,
              reactionTimeVariability: 45,
              accuracy: 0.96,
            },
          },
        },
      });

      expect(assessment.id).toBeDefined();
      expect(assessment.patientId).toBe(testPatient.id);
      expect(assessment.alertGenerated).toBe(false);
      expect(assessment.derivedMetrics).toBeDefined();
    });

    it('should store JSONB data correctly', async () => {
      const metricsData = {
        speech: {
          articulationRate: 145,
          meanPauseDuration: 220,
          pauseFrequency: 6,
          phoneticPrecision: 0.93,
          voiceQuality: 0.88,
        },
        facial: {
          symmetryScore: 0.90,
          eyeOpennessRatio: 0.96,
          mouthSymmetry: 0.92,
        },
        reaction: {
          meanReactionTime: 370,
          reactionTimeVariability: 50,
          accuracy: 0.94,
        },
      };

      const assessment = await prisma.assessment.create({
        data: {
          patientId: testPatient.id,
          timestamp: new Date(),
          dayNumber: 2,
          derivedMetrics: metricsData,
        },
      });

      const retrieved = await prisma.assessment.findUnique({
        where: { id: assessment.id },
      });

      expect(retrieved?.derivedMetrics).toEqual(metricsData);
    });

    it('should store deviations as JSONB', async () => {
      const deviationsData = [
        {
          metricName: 'articulationRate',
          currentValue: 120,
          baselineValue: 150,
          standardDeviations: 2.5,
          timestamp: new Date().toISOString(),
        },
      ];

      const assessment = await prisma.assessment.create({
        data: {
          patientId: testPatient.id,
          timestamp: new Date(),
          dayNumber: 10,
          derivedMetrics: {
            speech: { articulationRate: 120 },
          },
          deviations: deviationsData,
          alertGenerated: true,
        },
      });

      expect(assessment.deviations).toEqual(deviationsData);
      expect(assessment.alertGenerated).toBe(true);
    });
  });

  describe('Baseline Model', () => {
    let testPatient: any;

    beforeEach(async () => {
      testPatient = await prisma.patient.create({
        data: {
          dateOfBirth: new Date('1962-07-14'),
          gender: 'Female',
          strokeDate: new Date('2024-02-05'),
          strokeType: 'Hemorrhagic',
          dischargeDate: new Date('2024-02-20'),
          assignedClinician: 'Dr. Martinez',
          assignedHospital: 'Central Hospital',
          enrollmentDate: new Date('2024-02-21'),
          programEndDate: new Date('2024-05-21'),
          assessmentTime: '15:00',
          timezone: 'America/Phoenix',
          language: 'en',
        },
      });
    });

    it('should create a baseline with valid data', async () => {
      const baseline = await prisma.baseline.create({
        data: {
          patientId: testPatient.id,
          assessmentCount: 7,
          speechMetrics: {
            mean: 150,
            standardDeviation: 10,
            min: 135,
            max: 165,
          },
          facialMetrics: {
            mean: 0.92,
            standardDeviation: 0.03,
            min: 0.88,
            max: 0.96,
          },
          reactionMetrics: {
            mean: 350,
            standardDeviation: 30,
            min: 310,
            max: 390,
          },
        },
      });

      expect(baseline.id).toBeDefined();
      expect(baseline.patientId).toBe(testPatient.id);
      expect(baseline.assessmentCount).toBe(7);
    });

    it('should enforce unique patient constraint', async () => {
      await prisma.baseline.create({
        data: {
          patientId: testPatient.id,
          assessmentCount: 5,
          speechMetrics: { mean: 150, standardDeviation: 10, min: 140, max: 160 },
          facialMetrics: { mean: 0.90, standardDeviation: 0.02, min: 0.88, max: 0.92 },
          reactionMetrics: { mean: 360, standardDeviation: 25, min: 330, max: 390 },
        },
      });

      await expect(
        prisma.baseline.create({
          data: {
            patientId: testPatient.id, // Duplicate
            assessmentCount: 7,
            speechMetrics: { mean: 155, standardDeviation: 12, min: 140, max: 170 },
            facialMetrics: { mean: 0.91, standardDeviation: 0.03, min: 0.87, max: 0.95 },
            reactionMetrics: { mean: 355, standardDeviation: 28, min: 325, max: 385 },
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Alert Model', () => {
    let testPatient: any;

    beforeEach(async () => {
      testPatient = await prisma.patient.create({
        data: {
          dateOfBirth: new Date('1959-04-30'),
          gender: 'Male',
          strokeDate: new Date('2024-03-01'),
          strokeType: 'Ischemic',
          dischargeDate: new Date('2024-03-12'),
          assignedClinician: 'Dr. Anderson',
          assignedHospital: 'County Hospital',
          enrollmentDate: new Date('2024-03-13'),
          programEndDate: new Date('2024-06-13'),
          assessmentTime: '07:30',
          timezone: 'America/New_York',
          language: 'en',
        },
      });
    });

    it('should create an alert with valid data', async () => {
      const alert = await prisma.alert.create({
        data: {
          patientId: testPatient.id,
          severity: 'MEDIUM',
          triggeringAssessments: ['assessment-1', 'assessment-2', 'assessment-3'],
          sustainedDeviations: [
            {
              metricName: 'articulationRate',
              currentValue: 120,
              baselineValue: 150,
              standardDeviations: 2.5,
            },
          ],
          affectedModalities: ['speech'],
          consecutiveDays: 3,
          message: 'Sustained decline in speech articulation rate detected',
          recommendedActions: ['Contact neurologist within 48 hours'],
        },
      });

      expect(alert.id).toBeDefined();
      expect(alert.severity).toBe('MEDIUM');
      expect(alert.status).toBe('ACTIVE');
      expect(alert.triggeringAssessments).toHaveLength(3);
      expect(alert.affectedModalities).toContain('speech');
    });

    it('should support alert acknowledgment', async () => {
      const alert = await prisma.alert.create({
        data: {
          patientId: testPatient.id,
          severity: 'HIGH',
          triggeringAssessments: ['assessment-4', 'assessment-5', 'assessment-6'],
          sustainedDeviations: [
            {
              metricName: 'symmetryScore',
              currentValue: 0.75,
              baselineValue: 0.92,
              standardDeviations: 3.2,
            },
          ],
          affectedModalities: ['facial'],
          consecutiveDays: 3,
          message: 'Significant facial asymmetry detected',
          recommendedActions: ['Contact neurologist immediately', 'Consider emergency evaluation'],
        },
      });

      const acknowledged = await prisma.alert.update({
        where: { id: alert.id },
        data: {
          status: 'ACKNOWLEDGED',
          acknowledgedAt: new Date(),
          acknowledgedBy: 'Dr. Anderson',
          clinicianNotes: 'Patient scheduled for follow-up appointment',
        },
      });

      expect(acknowledged.status).toBe('ACKNOWLEDGED');
      expect(acknowledged.acknowledgedAt).toBeInstanceOf(Date);
      expect(acknowledged.acknowledgedBy).toBe('Dr. Anderson');
    });
  });

  describe('Notification Model', () => {
    let testPatient: any;
    let testAlert: any;

    beforeEach(async () => {
      testPatient = await prisma.patient.create({
        data: {
          dateOfBirth: new Date('1963-09-18'),
          gender: 'Female',
          strokeDate: new Date('2024-02-10'),
          strokeType: 'Ischemic',
          dischargeDate: new Date('2024-02-25'),
          assignedClinician: 'Dr. Wilson',
          assignedHospital: 'State Hospital',
          enrollmentDate: new Date('2024-02-26'),
          programEndDate: new Date('2024-05-26'),
          assessmentTime: '13:00',
          timezone: 'America/Los_Angeles',
          language: 'en',
        },
      });

      testAlert = await prisma.alert.create({
        data: {
          patientId: testPatient.id,
          severity: 'LOW',
          triggeringAssessments: ['assessment-7'],
          sustainedDeviations: [],
          affectedModalities: ['reaction'],
          consecutiveDays: 3,
          message: 'Minor increase in reaction time variability',
          recommendedActions: ['Monitor for additional changes'],
        },
      });
    });

    it('should create a notification with valid data', async () => {
      const notification = await prisma.notification.create({
        data: {
          alertId: testAlert.id,
          recipientId: 'caregiver-123',
          recipientType: 'CAREGIVER',
          channel: 'PUSH',
        },
      });

      expect(notification.id).toBeDefined();
      expect(notification.alertId).toBe(testAlert.id);
      expect(notification.sentAt).toBeInstanceOf(Date);
      expect(notification.deliveredAt).toBeNull();
      expect(notification.readAt).toBeNull();
    });

    it('should track notification delivery and read status', async () => {
      const notification = await prisma.notification.create({
        data: {
          alertId: testAlert.id,
          recipientId: 'clinician-456',
          recipientType: 'CLINICIAN',
          channel: 'EMAIL',
        },
      });

      const delivered = await prisma.notification.update({
        where: { id: notification.id },
        data: { deliveredAt: new Date() },
      });

      expect(delivered.deliveredAt).toBeInstanceOf(Date);

      const read = await prisma.notification.update({
        where: { id: notification.id },
        data: { readAt: new Date() },
      });

      expect(read.readAt).toBeInstanceOf(Date);
    });
  });

  describe('AuditLog Model', () => {
    let testPatient: any;

    beforeEach(async () => {
      testPatient = await prisma.patient.create({
        data: {
          dateOfBirth: new Date('1961-12-05'),
          gender: 'Male',
          strokeDate: new Date('2024-01-15'),
          strokeType: 'Hemorrhagic',
          dischargeDate: new Date('2024-01-28'),
          assignedClinician: 'Dr. Taylor',
          assignedHospital: 'District Hospital',
          enrollmentDate: new Date('2024-01-29'),
          programEndDate: new Date('2024-04-29'),
          assessmentTime: '16:30',
          timezone: 'America/Chicago',
          language: 'en',
        },
      });
    });

    it('should create an audit log with valid data', async () => {
      const auditLog = await prisma.auditLog.create({
        data: {
          userId: 'clinician-789',
          patientId: testPatient.id,
          resource: 'Patient',
          action: 'READ',
          ipAddress: '192.168.1.100',
          details: {
            fields: ['demographics', 'assessments'],
          },
        },
      });

      expect(auditLog.id).toBeDefined();
      expect(auditLog.userId).toBe('clinician-789');
      expect(auditLog.timestamp).toBeInstanceOf(Date);
    });

    it('should support audit logs without patient reference', async () => {
      const auditLog = await prisma.auditLog.create({
        data: {
          userId: 'admin-001',
          resource: 'System',
          action: 'LOGIN',
          ipAddress: '10.0.0.50',
        },
      });

      expect(auditLog.patientId).toBeNull();
      expect(auditLog.resource).toBe('System');
    });
  });

  describe('Federated Learning Models', () => {
    it('should create a federated gradient with valid data', async () => {
      const gradientData = Buffer.from('mock-gradient-data');
      
      const gradient = await prisma.federatedGradient.create({
        data: {
          deviceId: 'device-abc-123',
          modelVersion: 'v1.0.0',
          gradients: gradientData,
          sampleCount: 30,
        },
      });

      expect(gradient.id).toBeDefined();
      expect(gradient.deviceId).toBe('device-abc-123');
      expect(gradient.sampleCount).toBe(30);
      expect(gradient.createdAt).toBeInstanceOf(Date);
    });

    it('should create a global model with valid data', async () => {
      const weightsData = Buffer.from('mock-weights-data');
      
      const model = await prisma.globalModel.create({
        data: {
          modelVersion: 'v1.0.1',
          weights: weightsData,
          accuracy: 0.94,
        },
      });

      expect(model.id).toBeDefined();
      expect(model.modelVersion).toBe('v1.0.1');
      expect(model.accuracy).toBe(0.94);
    });

    it('should enforce unique model version', async () => {
      const weightsData = Buffer.from('mock-weights-data');
      const version = 'v1.0.2';
      
      await prisma.globalModel.create({
        data: {
          modelVersion: version,
          weights: weightsData,
        },
      });

      await expect(
        prisma.globalModel.create({
          data: {
            modelVersion: version, // Duplicate
            weights: weightsData,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Relationship Integrity', () => {
    it('should maintain patient-assessment relationship', async () => {
      const patient = await prisma.patient.create({
        data: {
          dateOfBirth: new Date('1957-06-22'),
          gender: 'Female',
          strokeDate: new Date('2024-03-05'),
          strokeType: 'Ischemic',
          dischargeDate: new Date('2024-03-18'),
          assignedClinician: 'Dr. Moore',
          assignedHospital: 'Valley Hospital',
          enrollmentDate: new Date('2024-03-19'),
          programEndDate: new Date('2024-06-19'),
          assessmentTime: '12:00',
          timezone: 'America/Denver',
          language: 'en',
        },
      });

      await prisma.assessment.create({
        data: {
          patientId: patient.id,
          timestamp: new Date(),
          dayNumber: 1,
          derivedMetrics: { speech: { articulationRate: 150 } },
        },
      });

      const patientWithAssessments = await prisma.patient.findUnique({
        where: { id: patient.id },
        include: { assessments: true },
      });

      expect(patientWithAssessments?.assessments).toHaveLength(1);
    });

    it('should maintain patient-alert-notification chain', async () => {
      const patient = await prisma.patient.create({
        data: {
          dateOfBirth: new Date('1964-02-11'),
          gender: 'Male',
          strokeDate: new Date('2024-02-20'),
          strokeType: 'Ischemic',
          dischargeDate: new Date('2024-03-05'),
          assignedClinician: 'Dr. Lee',
          assignedHospital: 'Riverside Hospital',
          enrollmentDate: new Date('2024-03-06'),
          programEndDate: new Date('2024-06-06'),
          assessmentTime: '09:30',
          timezone: 'America/New_York',
          language: 'en',
        },
      });

      const alert = await prisma.alert.create({
        data: {
          patientId: patient.id,
          severity: 'MEDIUM',
          triggeringAssessments: ['assessment-8'],
          sustainedDeviations: [],
          affectedModalities: ['speech'],
          consecutiveDays: 3,
          message: 'Test alert',
          recommendedActions: ['Monitor'],
        },
      });

      await prisma.notification.create({
        data: {
          alertId: alert.id,
          recipientId: 'caregiver-999',
          recipientType: 'CAREGIVER',
          channel: 'PUSH',
        },
      });

      const alertWithNotifications = await prisma.alert.findUnique({
        where: { id: alert.id },
        include: { notifications: true },
      });

      expect(alertWithNotifications?.notifications).toHaveLength(1);
    });

    it('should cascade delete related records', async () => {
      const patient = await prisma.patient.create({
        data: {
          dateOfBirth: new Date('1956-10-08'),
          gender: 'Female',
          strokeDate: new Date('2024-01-25'),
          strokeType: 'Hemorrhagic',
          dischargeDate: new Date('2024-02-08'),
          assignedClinician: 'Dr. Garcia',
          assignedHospital: 'Lakeside Hospital',
          enrollmentDate: new Date('2024-02-09'),
          programEndDate: new Date('2024-05-09'),
          assessmentTime: '14:30',
          timezone: 'America/Los_Angeles',
          language: 'en',
        },
      });

      const assessment = await prisma.assessment.create({
        data: {
          patientId: patient.id,
          timestamp: new Date(),
          dayNumber: 1,
          derivedMetrics: { speech: { articulationRate: 145 } },
        },
      });

      const alert = await prisma.alert.create({
        data: {
          patientId: patient.id,
          severity: 'LOW',
          triggeringAssessments: [assessment.id],
          sustainedDeviations: [],
          affectedModalities: ['reaction'],
          consecutiveDays: 3,
          message: 'Test cascade',
          recommendedActions: ['Monitor'],
        },
      });

      const notification = await prisma.notification.create({
        data: {
          alertId: alert.id,
          recipientId: 'test-recipient',
          recipientType: 'CAREGIVER',
          channel: 'PUSH',
        },
      });

      // Delete patient should cascade to assessments, alerts, and notifications
      await prisma.patient.delete({ where: { id: patient.id } });

      const deletedAssessment = await prisma.assessment.findUnique({
        where: { id: assessment.id },
      });
      const deletedAlert = await prisma.alert.findUnique({
        where: { id: alert.id },
      });
      const deletedNotification = await prisma.notification.findUnique({
        where: { id: notification.id },
      });

      expect(deletedAssessment).toBeNull();
      expect(deletedAlert).toBeNull();
      expect(deletedNotification).toBeNull();
    });
  });
});
