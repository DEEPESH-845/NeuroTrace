import { ReschedulingManager, reschedulingManager } from '../ReschedulingManager';
import { localStorageManager } from '../../database/LocalStorageManager';

// Mock LocalStorageManager
jest.mock('../../database/LocalStorageManager', () => ({
    localStorageManager: {
        saveAssessmentSchedule: jest.fn(),
        updateAssessmentSchedule: jest.fn(),
        getAssessmentSchedule: jest.fn(),
        getPendingAssessment: jest.fn(),
    },
}));

describe('ReschedulingManager', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should schedule assessment with 4-hour window', async () => {
        const dueDate = new Date('2025-01-01T10:00:00Z');
        const schedule = await reschedulingManager.scheduleAssessment('patient-123', dueDate);

        expect(schedule.dueDate).toBe(dueDate.toISOString());
        expect(schedule.status).toBe('PENDING');

        // Window start: 30 mins before (09:30)
        expect(new Date(schedule.windowStart).toISOString()).toBe('2025-01-01T09:30:00.000Z');
        // Window end: 4 hours after (14:00)
        expect(new Date(schedule.windowEnd).toISOString()).toBe('2025-01-01T14:00:00.000Z');

        expect(localStorageManager.saveAssessmentSchedule).toHaveBeenCalledWith(schedule);
    });

    it('should reschedule assessment within window', async () => {
        const originalDueDate = new Date('2025-01-01T10:00:00Z');
        const mockSchedule = {
            id: 'schedule-123',
            patientId: 'patient-123',
            dueDate: originalDueDate.toISOString(),
            windowStart: '2025-01-01T09:30:00Z',
            windowEnd: '2025-01-01T14:00:00Z',
            status: 'PENDING',
            rescheduleCount: 0,
            originalDueDate: originalDueDate.toISOString(),
        };

        (localStorageManager.getAssessmentSchedule as jest.Mock).mockResolvedValue(mockSchedule);

        // Reschedule to 11:00 (within 4 hours of 10:00)
        const newDate = new Date('2025-01-01T11:00:00Z');
        // Need to mock "now" to avoid "cannot reschedule to past" if verified
        // The implementation checks "if (newDate < new Date())". 
        // Since 2025 is in future relative to real time? No, real time is 2026!
        // Wait, "The current local time is: 2026-02-18".
        // My test date '2025-01-01' is in the PAST.
        // So "if (newDate < new Date())" will throw "Cannot reschedule to the past".

        // Use a future date for passing test
        const futureDate = new Date('2099-01-01T10:00:00Z');
        const futureNewDate = new Date('2099-01-01T11:00:00Z');

        const futureMockSchedule = { ...mockSchedule, dueDate: futureDate.toISOString(), originalDueDate: futureDate.toISOString() };
        (localStorageManager.getAssessmentSchedule as jest.Mock).mockResolvedValue(futureMockSchedule);

        await reschedulingManager.rescheduleAssessment('schedule-123', futureNewDate);

        expect(localStorageManager.updateAssessmentSchedule).toHaveBeenCalledWith(expect.objectContaining({
            dueDate: futureNewDate.toISOString(),
            rescheduleCount: 1,
            // 4 hours logic check
        }));
    });

    it('should fail to reschedule if outside 4-hour window', async () => {
        const futureDate = new Date('2099-01-01T10:00:00Z');
        // 5 hours later
        const futureNewDate = new Date('2099-01-01T15:00:00Z');

        const mockSchedule = {
            id: 'schedule-123',
            patientId: 'patient-123',
            dueDate: futureDate.toISOString(),
            windowStart: '2099-01-01T09:30:00Z',
            windowEnd: '2099-01-01T14:00:00Z',
            status: 'PENDING',
            rescheduleCount: 0,
            originalDueDate: futureDate.toISOString(),
        };

        (localStorageManager.getAssessmentSchedule as jest.Mock).mockResolvedValue(mockSchedule);

        await expect(reschedulingManager.rescheduleAssessment('schedule-123', futureNewDate))
            .rejects.toThrow('New time must be within 4 hours');
    });

    it('should retrieve upcoming assessment', async () => {
        const mockSchedule = { id: 'schedule-123', status: 'PENDING' };
        (localStorageManager.getPendingAssessment as jest.Mock).mockResolvedValue(mockSchedule);

        const result = await reschedulingManager.getUpcomingAssessment('patient-123');
        expect(result).toEqual(mockSchedule);
    });
});
