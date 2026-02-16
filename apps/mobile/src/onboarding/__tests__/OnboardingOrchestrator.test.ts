/**
 * OnboardingOrchestrator Unit Tests
 * 
 * Tests the onboarding orchestrator functionality including:
 * - Step navigation
 * - Data validation
 * - Patient profile creation
 * - Assessment reminder scheduling
 * 
 * Requirements: 1.1, 1.2
 */

import { OnboardingOrchestrator } from '../OnboardingOrchestrator';
import { executeQuery } from '../../database';

// Mock the database module
jest.mock('../../database', () => ({
  executeQuery: jest.fn(),
}));

describe('OnboardingOrchestrator', () => {
  let orchestrator: OnboardingOrchestrator;

  beforeEach(() => {
    orchestrator = new OnboardingOrchestrator();
    jest.clearAllMocks();
  });

  describe('Step Navigation', () => {
    it('should start at step 0', () => {
      expect(orchestrator.getCurrentStep()).toBe(0);
    });

    it('should navigate to next step', () => {
      orchestrator.nextStep();
      expect(orchestrator.getCurrentStep()).toBe(1);
    });

    it('should navigate to previous step', () => {
      orchestrator.nextStep();
      orchestrator.nextStep();
      orchestrator.previousStep();
      expect(orchestrator.getCurrentStep()).toBe(1);
    });

    it('should not go below step 0', () => {
      orchestrator.previousStep();
      expect(orchestrator.getCurrentStep()).toBe(0);
    });

    it('should not exceed total steps', () => {
      for (let i = 0; i < 10; i++) {
        orchestrator.nextStep();
      }
      expect(orchestrator.getCurrentStep()).toBeLessThanOrEqual(
        orchestrator.getTotalSteps()
      );
    });

    it('should calculate progress percentage correctly', () => {
      expect(orchestrator.getProgress()).toBe(0);
      orchestrator.nextStep();
      expect(orchestrator.getProgress()).toBe(20); // 1/5 = 20%
      orchestrator.nextStep();
      expect(orchestrator.getProgress()).toBe(40); // 2/5 = 40%
    });
  });

  describe('Demographics Validation', () => {
    it('should validate valid demographics data', () => {
      const result = orchestrator.validateDemographics({
        dateOfBirth: '01/15/1980',
        gender: 'Male',
      });
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should reject missing date of birth', () => {
      const result = orchestrator.validateDemographics({
        dateOfBirth: '',
        gender: 'Male',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.dateOfBirth).toBeDefined();
    });

    it('should reject invalid date format', () => {
      const result = orchestrator.validateDemographics({
        dateOfBirth: '1980-01-15',
        gender: 'Male',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.dateOfBirth).toContain('MM/DD/YYYY');
    });

    it('should reject future date of birth', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const dateStr = `${(futureDate.getMonth() + 1)
        .toString()
        .padStart(2, '0')}/${futureDate
        .getDate()
        .toString()
        .padStart(2, '0')}/${futureDate.getFullYear()}`;

      const result = orchestrator.validateDemographics({
        dateOfBirth: dateStr,
        gender: 'Male',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.dateOfBirth).toContain('past');
    });

    it('should reject missing gender', () => {
      const result = orchestrator.validateDemographics({
        dateOfBirth: '01/15/1980',
        gender: '',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.gender).toBeDefined();
    });
  });

  describe('Clinical Info Validation', () => {
    it('should validate valid clinical information', () => {
      const result = orchestrator.validateClinicalInfo({
        strokeDate: '01/01/2024',
        strokeType: 'Ischemic',
        dischargeDate: '01/10/2024',
        clinicianName: 'Dr. Smith',
        hospitalName: 'General Hospital',
      });
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should reject missing stroke date', () => {
      const result = orchestrator.validateClinicalInfo({
        strokeDate: '',
        strokeType: 'Ischemic',
        dischargeDate: '01/10/2024',
        clinicianName: 'Dr. Smith',
        hospitalName: 'General Hospital',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.strokeDate).toBeDefined();
    });

    it('should reject discharge date before stroke date', () => {
      const result = orchestrator.validateClinicalInfo({
        strokeDate: '01/10/2024',
        strokeType: 'Ischemic',
        dischargeDate: '01/01/2024',
        clinicianName: 'Dr. Smith',
        hospitalName: 'General Hospital',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.dischargeDate).toContain('after stroke date');
    });

    it('should reject missing stroke type', () => {
      const result = orchestrator.validateClinicalInfo({
        strokeDate: '01/01/2024',
        strokeType: '',
        dischargeDate: '01/10/2024',
        clinicianName: 'Dr. Smith',
        hospitalName: 'General Hospital',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.strokeType).toBeDefined();
    });

    it('should reject empty clinician name', () => {
      const result = orchestrator.validateClinicalInfo({
        strokeDate: '01/01/2024',
        strokeType: 'Ischemic',
        dischargeDate: '01/10/2024',
        clinicianName: '   ',
        hospitalName: 'General Hospital',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.clinicianName).toBeDefined();
    });

    it('should reject empty hospital name', () => {
      const result = orchestrator.validateClinicalInfo({
        strokeDate: '01/01/2024',
        strokeType: 'Ischemic',
        dischargeDate: '01/10/2024',
        clinicianName: 'Dr. Smith',
        hospitalName: '',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.hospitalName).toBeDefined();
    });
  });

  describe('Assessment Preferences Validation', () => {
    it('should validate valid assessment preferences', () => {
      const result = orchestrator.validateAssessmentPreferences({
        hour: 9,
        minute: 30,
        period: 'AM',
        timezone: 'America/New_York (Eastern)',
      });
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should reject invalid hour', () => {
      const result = orchestrator.validateAssessmentPreferences({
        hour: 13,
        minute: 30,
        period: 'AM',
        timezone: 'America/New_York (Eastern)',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.hour).toBeDefined();
    });

    it('should reject invalid minute', () => {
      const result = orchestrator.validateAssessmentPreferences({
        hour: 9,
        minute: 25,
        period: 'AM',
        timezone: 'America/New_York (Eastern)',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.minute).toBeDefined();
    });

    it('should reject invalid period', () => {
      const result = orchestrator.validateAssessmentPreferences({
        hour: 9,
        minute: 30,
        period: 'XM' as 'AM',
        timezone: 'America/New_York (Eastern)',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.period).toBeDefined();
    });

    it('should reject missing timezone', () => {
      const result = orchestrator.validateAssessmentPreferences({
        hour: 9,
        minute: 30,
        period: 'AM',
        timezone: '',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.timezone).toBeDefined();
    });
  });

  describe('Data Persistence', () => {
    it('should save demographics data', () => {
      const demographics = {
        dateOfBirth: '01/15/1980',
        gender: 'Male',
      };
      orchestrator.saveDemographics(demographics);
      // Data is saved internally, verify by completing onboarding
      expect(() => orchestrator.saveDemographics(demographics)).not.toThrow();
    });

    it('should save clinical info data', () => {
      const clinicalInfo = {
        strokeDate: '01/01/2024',
        strokeType: 'Ischemic',
        dischargeDate: '01/10/2024',
        clinicianName: 'Dr. Smith',
        hospitalName: 'General Hospital',
      };
      orchestrator.saveClinicalInfo(clinicalInfo);
      expect(() => orchestrator.saveClinicalInfo(clinicalInfo)).not.toThrow();
    });

    it('should save assessment preferences', () => {
      const preferences = {
        hour: 9,
        minute: 30,
        period: 'AM' as const,
        timezone: 'America/New_York (Eastern)',
      };
      orchestrator.saveAssessmentPreferences(preferences);
      expect(() =>
        orchestrator.saveAssessmentPreferences(preferences)
      ).not.toThrow();
    });

    it('should save caregiver code', () => {
      orchestrator.saveCaregiverCode('ABC123');
      expect(() => orchestrator.saveCaregiverCode('ABC123')).not.toThrow();
    });
  });

  describe('Complete Onboarding', () => {
    beforeEach(() => {
      // Set up valid data for all steps
      orchestrator.saveDemographics({
        dateOfBirth: '01/15/1980',
        gender: 'Male',
      });
      orchestrator.saveClinicalInfo({
        strokeDate: '01/01/2024',
        strokeType: 'Ischemic',
        dischargeDate: '01/10/2024',
        clinicianName: 'Dr. Smith',
        hospitalName: 'General Hospital',
      });
      orchestrator.saveAssessmentPreferences({
        hour: 9,
        minute: 30,
        period: 'AM',
        timezone: 'America/New_York (Eastern)',
      });
    });

    it('should complete onboarding with valid data', async () => {
      const patientId = await orchestrator.completeOnboarding();
      expect(patientId).toBeDefined();
      expect(typeof patientId).toBe('string');
      expect(patientId.length).toBeGreaterThan(0);
    });

    it('should save patient profile to database', async () => {
      await orchestrator.completeOnboarding();
      expect(executeQuery).toHaveBeenCalled();
      const call = (executeQuery as jest.Mock).mock.calls[0];
      expect(call[0]).toContain('INSERT INTO patients');
    });

    it('should throw error if demographics missing', async () => {
      orchestrator.reset();
      orchestrator.saveClinicalInfo({
        strokeDate: '01/01/2024',
        strokeType: 'Ischemic',
        dischargeDate: '01/10/2024',
        clinicianName: 'Dr. Smith',
        hospitalName: 'General Hospital',
      });
      orchestrator.saveAssessmentPreferences({
        hour: 9,
        minute: 30,
        period: 'AM',
        timezone: 'America/New_York (Eastern)',
      });

      await expect(orchestrator.completeOnboarding()).rejects.toThrow(
        'Demographics data is missing'
      );
    });

    it('should throw error if clinical info missing', async () => {
      orchestrator.reset();
      orchestrator.saveDemographics({
        dateOfBirth: '01/15/1980',
        gender: 'Male',
      });
      orchestrator.saveAssessmentPreferences({
        hour: 9,
        minute: 30,
        period: 'AM',
        timezone: 'America/New_York (Eastern)',
      });

      await expect(orchestrator.completeOnboarding()).rejects.toThrow(
        'Clinical information is missing'
      );
    });

    it('should throw error if preferences missing', async () => {
      orchestrator.reset();
      orchestrator.saveDemographics({
        dateOfBirth: '01/15/1980',
        gender: 'Male',
      });
      orchestrator.saveClinicalInfo({
        strokeDate: '01/01/2024',
        strokeType: 'Ischemic',
        dischargeDate: '01/10/2024',
        clinicianName: 'Dr. Smith',
        hospitalName: 'General Hospital',
      });

      await expect(orchestrator.completeOnboarding()).rejects.toThrow(
        'Assessment preferences are missing'
      );
    });

    it('should format assessment time correctly for AM', async () => {
      orchestrator.saveAssessmentPreferences({
        hour: 9,
        minute: 30,
        period: 'AM',
        timezone: 'America/New_York (Eastern)',
      });

      await orchestrator.completeOnboarding();
      const call = (executeQuery as jest.Mock).mock.calls[0];
      const params = call[1];
      // Assessment time should be in HH:MM 24-hour format
      expect(params[11]).toBe('09:30');
    });

    it('should format assessment time correctly for PM', async () => {
      orchestrator.saveAssessmentPreferences({
        hour: 3,
        minute: 45,
        period: 'PM',
        timezone: 'America/New_York (Eastern)',
      });

      await orchestrator.completeOnboarding();
      const call = (executeQuery as jest.Mock).mock.calls[0];
      const params = call[1];
      // 3 PM should be 15:45
      expect(params[11]).toBe('15:45');
    });

    it('should handle 12 AM correctly', async () => {
      orchestrator.saveAssessmentPreferences({
        hour: 12,
        minute: 0,
        period: 'AM',
        timezone: 'America/New_York (Eastern)',
      });

      await orchestrator.completeOnboarding();
      const call = (executeQuery as jest.Mock).mock.calls[0];
      const params = call[1];
      // 12 AM should be 00:00
      expect(params[11]).toBe('00:00');
    });

    it('should handle 12 PM correctly', async () => {
      orchestrator.saveAssessmentPreferences({
        hour: 12,
        minute: 0,
        period: 'PM',
        timezone: 'America/New_York (Eastern)',
      });

      await orchestrator.completeOnboarding();
      const call = (executeQuery as jest.Mock).mock.calls[0];
      const params = call[1];
      // 12 PM should be 12:00
      expect(params[11]).toBe('12:00');
    });

    it('should calculate program end date as 90 days from enrollment', async () => {
      await orchestrator.completeOnboarding();
      const call = (executeQuery as jest.Mock).mock.calls[0];
      const params = call[1];
      const enrollmentDate = new Date(params[8]);
      const programEndDate = new Date(params[9]);
      const diffDays = Math.round(
        (programEndDate.getTime() - enrollmentDate.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      expect(diffDays).toBe(90);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset all data and step counter', () => {
      orchestrator.saveDemographics({
        dateOfBirth: '01/15/1980',
        gender: 'Male',
      });
      orchestrator.nextStep();
      orchestrator.nextStep();

      orchestrator.reset();

      expect(orchestrator.getCurrentStep()).toBe(0);
      // Verify data is cleared by trying to complete onboarding
      expect(orchestrator.completeOnboarding()).rejects.toThrow();
    });
  });
});
