export interface Patient {
    id: string;
    name: string;
    age: number;
    condition: string;
    status: 'stable' | 'warning' | 'critical';
    lastAssessment: string;
}

export interface Alert {
    id: string;
    patientId: string;
    patientName: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: string;
    status: 'active' | 'acknowledged' | 'resolved';
}


export interface SystemUser {
    id: string;
    name: string;
    email: string;
    role: 'clinician' | 'admin' | 'caregiver';
    status: 'active' | 'inactive';
    lastLogin: string;
}

export interface AuditLog {
    id: string;
    userId: string;
    userName: string;
    action: string;
    resource: string;
    timestamp: string;
    status: 'success' | 'failure';
}

class MockDataService {
    private patients: Patient[] = [
        { id: '1', name: 'John Doe', age: 65, condition: 'Post-Stroke Recovery', status: 'stable', lastAssessment: '2025-05-10T09:00:00Z' },
        { id: '2', name: 'Jane Smith', age: 72, condition: 'Parkinson\'s Management', status: 'warning', lastAssessment: '2025-05-09T14:30:00Z' },
        { id: '3', name: 'Robert Johnson', age: 58, condition: 'Stroke Rehabilitation', status: 'critical', lastAssessment: '2025-05-10T08:15:00Z' },
        { id: '4', name: 'Emily Davis', age: 80, condition: 'Cognitive Decline', status: 'stable', lastAssessment: '2025-05-08T11:45:00Z' },
        { id: '5', name: 'Michael Brown', age: 62, condition: 'Post-Stroke Recovery', status: 'stable', lastAssessment: '2025-05-10T10:00:00Z' },
    ];

    private alerts: Alert[] = [
        { id: 'a1', patientId: '3', patientName: 'Robert Johnson', severity: 'critical', message: 'Significant deviation in facial symmetry detected.', timestamp: '2025-05-10T08:20:00Z', status: 'active' },
        { id: 'a2', patientId: '2', patientName: 'Jane Smith', severity: 'medium', message: 'Missed scheduled assessment.', timestamp: '2025-05-09T18:00:00Z', status: 'active' },
        { id: 'a3', patientId: '3', patientName: 'Robert Johnson', severity: 'high', message: 'Speech articulation rate drop below threshold.', timestamp: '2025-05-10T08:18:00Z', status: 'active' },
    ];

    private users: SystemUser[] = [
        { id: 'u1', name: 'Dr. Sarah Smith', email: 'sarah.smith@hospital.com', role: 'clinician', status: 'active', lastLogin: '2025-05-10T08:00:00Z' },
        { id: 'u2', name: 'Admin User', email: 'admin@neurotrace.com', role: 'admin', status: 'active', lastLogin: '2025-05-10T09:30:00Z' },
        { id: 'u3', name: 'Dr. James Wilson', email: 'james.wilson@hospital.com', role: 'clinician', status: 'active', lastLogin: '2025-05-09T17:45:00Z' },
        { id: 'u4', name: 'Nurse Emily', email: 'emily.r@hospital.com', role: 'caregiver', status: 'inactive', lastLogin: '2025-05-01T10:00:00Z' },
    ];

    private logs: AuditLog[] = [
        { id: 'l1', userId: 'u1', userName: 'Dr. Sarah Smith', action: 'VIEW_PATIENT', resource: 'Patient: Robert Johnson', timestamp: '2025-05-10T08:15:23Z', status: 'success' },
        { id: 'l2', userId: 'u1', userName: 'Dr. Sarah Smith', action: 'UPDATE_ASSESSMENT', resource: 'Assessment: a123', timestamp: '2025-05-10T08:20:10Z', status: 'success' },
        { id: 'l3', userId: 'u2', userName: 'Admin User', action: 'LOGIN', resource: 'System', timestamp: '2025-05-10T09:30:00Z', status: 'success' },
        { id: 'l4', userId: 'u3', userName: 'Dr. James Wilson', action: 'EXPORT_DATA', resource: 'Patient: Jane Smith', timestamp: '2025-05-09T18:00:00Z', status: 'success' },
    ];

    getPatients(): Promise<Patient[]> {
        return new Promise((resolve) => {
            setTimeout(() => resolve(this.patients), 500); // Simulate network latency
        });
    }

    getPatient(id: string): Promise<Patient | undefined> {
        return new Promise((resolve) => {
            setTimeout(() => resolve(this.patients.find(p => p.id === id)), 300);
        });
    }

    getAlerts(): Promise<Alert[]> {
        return new Promise((resolve) => {
            setTimeout(() => resolve(this.alerts), 400);
        });
    }

    getUsers(): Promise<SystemUser[]> {
        return new Promise((resolve) => setTimeout(() => resolve(this.users), 400));
    }

    getLogs(): Promise<AuditLog[]> {
        return new Promise((resolve) => setTimeout(() => resolve(this.logs), 300));
    }
}

export const mockDataService = new MockDataService();
