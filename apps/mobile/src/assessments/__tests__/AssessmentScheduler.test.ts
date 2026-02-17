/**
 * AssessmentScheduler Tests
 *
 * Tests scheduling, snooze, reschedule, missed detection, and compliance.
 */

import { AssessmentScheduler } from '../AssessmentScheduler';

describe('AssessmentScheduler', () => {
    let scheduler: AssessmentScheduler;

    beforeEach(() => {
        scheduler = new AssessmentScheduler({
            defaultTime: '09:00',
            minIntervalHours: 20,
            maxReschedulesPerDay: 3,
            snoozeDurations: [15, 30, 60],
            gracePeriodMinutes: 30,
        });
    });

    describe('scheduleNext', () => {
        it('schedules an assessment with default time', () => {
            const schedule = scheduler.scheduleNext('patient-1');
            expect(schedule.patientId).toBe('patient-1');
            expect(schedule.status).toBe('PENDING');
            expect(schedule.rescheduleCount).toBe(0);
        });

        it('schedules with a custom time', () => {
            const schedule = scheduler.scheduleNext('patient-1', '14:30');
            const scheduled = schedule.scheduledAt;
            expect(scheduled.getHours()).toBe(14);
            expect(scheduled.getMinutes()).toBe(30);
        });

        it('getNextScheduledTime returns the pending schedule', () => {
            scheduler.scheduleNext('patient-1', '23:59');
            const next = scheduler.getNextScheduledTime('patient-1');
            expect(next).not.toBeNull();
            expect(next!.patientId).toBe('patient-1');
        });

        it('returns null when no schedule exists', () => {
            expect(scheduler.getNextScheduledTime('nonexistent')).toBeNull();
        });
    });

    describe('snooze', () => {
        it('snoozes a pending assessment by valid duration', () => {
            // Schedule far in the future
            const schedule = scheduler.scheduleNext('patient-1', '23:58');
            const originalTime = schedule.scheduledAt.getTime();

            const snoozed = scheduler.snooze('patient-1', 15);
            expect(snoozed).not.toBeNull();
            expect(snoozed!.scheduledAt.getTime()).toBe(originalTime + 15 * 60 * 1000);
            expect(snoozed!.snoozeCount).toBe(1);
            expect(snoozed!.rescheduleCount).toBe(1);
        });

        it('rejects invalid snooze duration', () => {
            scheduler.scheduleNext('patient-1', '23:58');
            const result = scheduler.snooze('patient-1', 45); // not in [15, 30, 60]
            expect(result).toBeNull();
        });

        it('rejects snooze when reschedule limit reached', () => {
            scheduler.scheduleNext('patient-1', '23:58');
            scheduler.snooze('patient-1', 15);
            scheduler.snooze('patient-1', 15);
            scheduler.snooze('patient-1', 15);

            // 4th snooze should be rejected
            const result = scheduler.snooze('patient-1', 15);
            expect(result).toBeNull();
        });

        it('returns null when no schedule exists', () => {
            expect(scheduler.snooze('nonexistent', 15)).toBeNull();
        });
    });

    describe('reschedule', () => {
        it('reschedules to a new time', () => {
            scheduler.scheduleNext('patient-1', '23:55');
            const result = scheduler.reschedule('patient-1', '23:59');
            expect(result).not.toBeNull();
            expect(result!.scheduledAt.getHours()).toBe(23);
            expect(result!.scheduledAt.getMinutes()).toBe(59);
            expect(result!.rescheduleCount).toBe(1);
        });

        it('rejects reschedule to the past', () => {
            scheduler.scheduleNext('patient-1', '23:58');
            const result = scheduler.reschedule('patient-1', '00:01');
            // This will be in the past (earlier today)
            expect(result).toBeNull();
        });
    });

    describe('markCompleted', () => {
        it('marks a pending assessment as completed', () => {
            scheduler.scheduleNext('patient-1', '23:58');
            scheduler.markCompleted('patient-1');

            const next = scheduler.getNextScheduledTime('patient-1');
            expect(next).toBeNull(); // No more pending
        });
    });

    describe('checkForMissed', () => {
        it('marks overdue assessments as missed', () => {
            scheduler.scheduleNext('patient-1', '23:58');
            // Manually set the schedule time to the past
            const schedules = scheduler.getNextScheduledTime('patient-1');
            if (schedules) {
                schedules.scheduledAt = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
            }

            const missed = scheduler.checkForMissed('patient-1');
            expect(missed).toHaveLength(1);
            expect(missed[0].status).toBe('MISSED');
        });

        it('does not mark future assessments as missed', () => {
            scheduler.scheduleNext('patient-1', '23:59');
            const missed = scheduler.checkForMissed('patient-1');
            expect(missed).toHaveLength(0);
        });
    });

    describe('getComplianceStats', () => {
        it('returns default stats for no schedules', () => {
            const stats = scheduler.getComplianceStats('patient-1');
            expect(stats.totalScheduled).toBe(0);
            expect(stats.complianceRate).toBe(1.0);
            expect(stats.currentStreak).toBe(0);
        });

        it('computes compliance rate correctly', () => {
            // Create 3 completed and 1 missed
            for (let i = 0; i < 3; i++) {
                scheduler.scheduleNext('patient-1', '23:58');
                scheduler.markCompleted('patient-1');
            }

            scheduler.scheduleNext('patient-1', '23:58');
            const next = scheduler.getNextScheduledTime('patient-1');
            if (next) {
                next.scheduledAt = new Date(Date.now() - 2 * 60 * 60 * 1000);
            }
            scheduler.checkForMissed('patient-1');

            const stats = scheduler.getComplianceStats('patient-1');
            expect(stats.completed).toBe(3);
            expect(stats.missed).toBe(1);
            expect(stats.complianceRate).toBe(0.75);
        });

        it('tracks streaks correctly', () => {
            for (let i = 0; i < 5; i++) {
                scheduler.scheduleNext('patient-1', '23:58');
                scheduler.markCompleted('patient-1');
            }

            const stats = scheduler.getComplianceStats('patient-1');
            expect(stats.currentStreak).toBe(5);
            expect(stats.longestStreak).toBe(5);
        });
    });

    describe('getSnoozeDurations', () => {
        it('returns configured snooze durations', () => {
            expect(scheduler.getSnoozeDurations()).toEqual([15, 30, 60]);
        });
    });
});
