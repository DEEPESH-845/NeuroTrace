/**
 * OnboardingOrchestrator - Manages the onboarding flow
 * 
 * Orchestrates step-by-step navigation, validates user inputs,
 * saves patient profile to local storage, and schedules daily assessment reminders.
 * 
 * Requirements: 1.1, 1.2
 */

import { executeQuery } from '../database';

/**
 * Onboarding data collected from screens
 */
export interface OnboardingData {
  demographics?: {
    dateOfBirth: string; // MM/DD/YYYY format
    gender: string;
  };
  clinicalInfo?: {
    strokeDate: string; // MM/DD/YYYY format
    strokeType: string;
    dischargeDate: string; // MM/DD/YYYY format
    clinicianName: string;
    hospitalName: string;
  };
  assessmentPreferences?: {
    hour: number; // 1-12
    minute: number; // 0, 15, 30, 45
    period: 'AM' | 'PM';
    timezone: string;
  };
  caregiverCode?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: { [key: string]: string };
}

/**
 * OnboardingOrchestrator class
 * Manages the complete onboarding flow from data collection to profile creation
 */
export class OnboardingOrchestrator {
  private data: OnboardingData = {};
  private currentStep: number = 0;
  private readonly totalSteps: number = 5;

  /**
   * Get current step number (0-indexed)
   */
  getCurrentStep(): number {
    return this.currentStep;
  }

  /**
   * Get total number of steps
   */
  getTotalSteps(): number {
    return this.totalSteps;
  }

  /**
   * Get progress percentage (0-100)
   */
  getProgress(): number {
    return Math.round((this.currentStep / this.totalSteps) * 100);
  }

  /**
   * Navigate to next step
   */
  nextStep(): void {
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
    }
  }

  /**
   * Navigate to previous step
   */
  previousStep(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
    }
  }

  /**
   * Save demographics data
   */
  saveDemographics(demographics: OnboardingData['demographics']): void {
    this.data.demographics = demographics;
  }

  /**
   * Save clinical information
   */
  saveClinicalInfo(clinicalInfo: OnboardingData['clinicalInfo']): void {
    this.data.clinicalInfo = clinicalInfo;
  }

  /**
   * Save assessment preferences
   */
  saveAssessmentPreferences(
    preferences: OnboardingData['assessmentPreferences']
  ): void {
    this.data.assessmentPreferences = preferences;
  }

  /**
   * Save caregiver invitation code
   */
  saveCaregiverCode(code: string | undefined): void {
    this.data.caregiverCode = code;
  }

  /**
   * Validate demographics data
   */
  validateDemographics(
    demographics: OnboardingData['demographics']
  ): ValidationResult {
    const errors: { [key: string]: string } = {};

    if (!demographics) {
      return { isValid: false, errors: { general: 'Demographics data is required' } };
    }

    // Validate date of birth format (MM/DD/YYYY)
    const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
    if (!demographics.dateOfBirth) {
      errors.dateOfBirth = 'Date of birth is required';
    } else if (!dateRegex.test(demographics.dateOfBirth)) {
      errors.dateOfBirth = 'Please use MM/DD/YYYY format';
    } else {
      // Validate date is in the past
      const dob = this.parseDate(demographics.dateOfBirth);
      if (dob >= new Date()) {
        errors.dateOfBirth = 'Date of birth must be in the past';
      }
    }

    // Validate gender
    if (!demographics.gender) {
      errors.gender = 'Gender is required';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Validate clinical information
   */
  validateClinicalInfo(
    clinicalInfo: OnboardingData['clinicalInfo']
  ): ValidationResult {
    const errors: { [key: string]: string } = {};

    if (!clinicalInfo) {
      return { isValid: false, errors: { general: 'Clinical information is required' } };
    }

    const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;

    // Validate stroke date
    if (!clinicalInfo.strokeDate) {
      errors.strokeDate = 'Stroke date is required';
    } else if (!dateRegex.test(clinicalInfo.strokeDate)) {
      errors.strokeDate = 'Please use MM/DD/YYYY format';
    }

    // Validate discharge date
    if (!clinicalInfo.dischargeDate) {
      errors.dischargeDate = 'Discharge date is required';
    } else if (!dateRegex.test(clinicalInfo.dischargeDate)) {
      errors.dischargeDate = 'Please use MM/DD/YYYY format';
    }

    // Validate discharge date is after stroke date
    if (
      clinicalInfo.strokeDate &&
      clinicalInfo.dischargeDate &&
      dateRegex.test(clinicalInfo.strokeDate) &&
      dateRegex.test(clinicalInfo.dischargeDate)
    ) {
      const strokeDate = this.parseDate(clinicalInfo.strokeDate);
      const dischargeDate = this.parseDate(clinicalInfo.dischargeDate);
      if (dischargeDate < strokeDate) {
        errors.dischargeDate = 'Discharge date must be after stroke date';
      }
    }

    // Validate stroke type
    if (!clinicalInfo.strokeType) {
      errors.strokeType = 'Stroke type is required';
    }

    // Validate clinician name
    if (!clinicalInfo.clinicianName || !clinicalInfo.clinicianName.trim()) {
      errors.clinicianName = 'Clinician name is required';
    }

    // Validate hospital name
    if (!clinicalInfo.hospitalName || !clinicalInfo.hospitalName.trim()) {
      errors.hospitalName = 'Hospital name is required';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Validate assessment preferences
   */
  validateAssessmentPreferences(
    preferences: OnboardingData['assessmentPreferences']
  ): ValidationResult {
    const errors: { [key: string]: string } = {};

    if (!preferences) {
      return { isValid: false, errors: { general: 'Assessment preferences are required' } };
    }

    // Validate hour (1-12)
    if (preferences.hour < 1 || preferences.hour > 12) {
      errors.hour = 'Hour must be between 1 and 12';
    }

    // Validate minute (0, 15, 30, 45)
    if (![0, 15, 30, 45].includes(preferences.minute)) {
      errors.minute = 'Minute must be 0, 15, 30, or 45';
    }

    // Validate period
    if (preferences.period !== 'AM' && preferences.period !== 'PM') {
      errors.period = 'Period must be AM or PM';
    }

    // Validate timezone
    if (!preferences.timezone) {
      errors.timezone = 'Timezone is required';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Complete onboarding and save patient profile
   * Returns the created patient ID
   */
  async completeOnboarding(): Promise<string> {
    // Validate all data is present
    if (!this.data.demographics) {
      throw new Error('Demographics data is missing');
    }
    if (!this.data.clinicalInfo) {
      throw new Error('Clinical information is missing');
    }
    if (!this.data.assessmentPreferences) {
      throw new Error('Assessment preferences are missing');
    }

    // Validate all data
    const demographicsValidation = this.validateDemographics(this.data.demographics);
    if (!demographicsValidation.isValid) {
      throw new Error('Invalid demographics data');
    }

    const clinicalValidation = this.validateClinicalInfo(this.data.clinicalInfo);
    if (!clinicalValidation.isValid) {
      throw new Error('Invalid clinical information');
    }

    const preferencesValidation = this.validateAssessmentPreferences(
      this.data.assessmentPreferences
    );
    if (!preferencesValidation.isValid) {
      throw new Error('Invalid assessment preferences');
    }

    // Generate patient ID
    const patientId = this.generateUUID();

    // Convert dates
    const dateOfBirth = this.parseDate(this.data.demographics.dateOfBirth);
    const strokeDate = this.parseDate(this.data.clinicalInfo.strokeDate);
    const dischargeDate = this.parseDate(this.data.clinicalInfo.dischargeDate);
    const enrollmentDate = new Date();
    const programEndDate = new Date(enrollmentDate);
    programEndDate.setDate(programEndDate.getDate() + 90); // 90-day program

    // Format assessment time (HH:MM 24-hour format)
    const assessmentTime = this.formatAssessmentTime(
      this.data.assessmentPreferences.hour,
      this.data.assessmentPreferences.minute,
      this.data.assessmentPreferences.period
    );

    // Extract timezone identifier (remove display name)
    const timezone = this.data.assessmentPreferences.timezone.split(' ')[0];

    // Save patient profile to database
    await this.savePatientProfile({
      patientId,
      dateOfBirth,
      gender: this.data.demographics.gender,
      strokeDate,
      strokeType: this.data.clinicalInfo.strokeType,
      dischargeDate,
      assignedClinician: this.data.clinicalInfo.clinicianName,
      assignedHospital: this.data.clinicalInfo.hospitalName,
      enrollmentDate,
      programEndDate,
      assessmentTime,
      timezone,
      language: 'en',
    });

    // Schedule daily assessment reminders
    await this.scheduleAssessmentReminders(patientId, assessmentTime, timezone);

    // If caregiver code provided, link caregiver (would be implemented in future)
    if (this.data.caregiverCode) {
      // TODO: Implement caregiver linking via API call
      console.log('Caregiver code provided:', this.data.caregiverCode);
    }

    return patientId;
  }

  /**
   * Save patient profile to local database
   */
  private async savePatientProfile(profile: {
    patientId: string;
    dateOfBirth: Date;
    gender: string;
    strokeDate: Date;
    strokeType: string;
    dischargeDate: Date;
    assignedClinician: string;
    assignedHospital: string;
    enrollmentDate: Date;
    programEndDate: Date;
    assessmentTime: string;
    timezone: string;
    language: string;
  }): Promise<void> {
    const sql = `
      INSERT INTO patients (
        id, date_of_birth, gender, stroke_date, stroke_type,
        discharge_date, assigned_clinician, assigned_hospital,
        enrollment_date, program_end_date, baseline_established,
        assessment_time, timezone, language, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      profile.patientId,
      profile.dateOfBirth.toISOString(),
      profile.gender,
      profile.strokeDate.toISOString(),
      profile.strokeType,
      profile.dischargeDate.toISOString(),
      profile.assignedClinician,
      profile.assignedHospital,
      profile.enrollmentDate.toISOString(),
      profile.programEndDate.toISOString(),
      0, // baseline_established
      profile.assessmentTime,
      profile.timezone,
      profile.language,
      new Date().toISOString(),
      new Date().toISOString(),
    ];

    executeQuery(sql, params);
  }

  /**
   * Schedule daily assessment reminders
   * Uses React Native's notification system
   */
  private async scheduleAssessmentReminders(
    patientId: string,
    assessmentTime: string,
    timezone: string
  ): Promise<void> {
    // TODO: Implement notification scheduling using react-native-push-notification
    // or @react-native-community/push-notification-ios and @notifee/react-native

    // For now, log the scheduling request
    console.log('Scheduling daily assessment reminders:', {
      patientId,
      assessmentTime,
      timezone,
    });

    // Implementation would:
    // 1. Parse assessmentTime (HH:MM)
    // 2. Convert to local time using timezone
    // 3. Schedule daily repeating notification
    // 4. Store notification ID for later cancellation if needed
  }

  /**
   * Parse date string in MM/DD/YYYY format to Date object
   */
  private parseDate(dateString: string): Date {
    const [month, day, year] = dateString.split('/').map(Number);
    return new Date(year, month - 1, day);
  }

  /**
   * Format assessment time to HH:MM 24-hour format
   */
  private formatAssessmentTime(hour: number, minute: number, period: 'AM' | 'PM'): string {
    let hour24 = hour;
    if (period === 'PM' && hour !== 12) {
      hour24 = hour + 12;
    } else if (period === 'AM' && hour === 12) {
      hour24 = 0;
    }

    const hourStr = hour24.toString().padStart(2, '0');
    const minuteStr = minute.toString().padStart(2, '0');
    return `${hourStr}:${minuteStr}`;
  }

  /**
   * Generate a UUID v4
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Reset onboarding data (for testing or restart)
   */
  reset(): void {
    this.data = {};
    this.currentStep = 0;
  }
}

/**
 * Create a singleton instance of OnboardingOrchestrator
 */
export const onboardingOrchestrator = new OnboardingOrchestrator();
