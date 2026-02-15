// Patient profile
export interface PatientProfile {
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
    assessmentTime: string; // HH:MM format
    timezone: string;
    language: string;
  };
  caregivers: CaregiverInfo[];
  createdAt: Date;
  updatedAt: Date;
}

// Caregiver information
export interface CaregiverInfo {
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

// Patient status for caregiver app
export enum PatientStatus {
  ON_TRACK = 'ON_TRACK',
  NEEDS_ATTENTION = 'NEEDS_ATTENTION',
  ALERT = 'ALERT',
}

// Patient summary for clinician dashboard
export interface PatientSummary {
  patientId: string;
  name: string;
  status: PatientStatus;
  lastAssessment: Date;
  activeAlerts: number;
  daysInProgram: number;
}
