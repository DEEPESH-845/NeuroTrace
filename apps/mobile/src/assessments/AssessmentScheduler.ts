/**
 * AssessmentScheduler — Assessment scheduling and rescheduling
 *
 * Handles daily assessment reminders and rescheduling logic.
 * Supports dynamic scheduling based on patient compliance and streaks.
 *
 * Requirements: 37.1 — Assessment rescheduling
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ScheduleConfig {
    /** Default assessment time (24h format, e.g., "09:00") */
    defaultTime: string;
    /** Minimum hours between assessments */
    minIntervalHours: number;
    /** Maximum allowed reschedules per day */
    maxReschedulesPerDay: number;
    /** Snooze durations in minutes */
    snoozeDurations: number[];
    /** Grace period in minutes (acceptable lateness) */
    gracePeriodMinutes: number;
}

export interface ScheduledAssessment {
    patientId: string;
    scheduledAt: Date;
    originalTime: Date;
    rescheduleCount: number;
    status: 'PENDING' | 'SNOOZED' | 'COMPLETED' | 'MISSED';
    snoozeCount: number;
}

export interface ComplianceStats {
    totalScheduled: number;
    completed: number;
    missed: number;
    snoozed: number;
    complianceRate: number;
    currentStreak: number;
    longestStreak: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_SCHEDULE_CONFIG: ScheduleConfig = {
    defaultTime: '09:00',
    minIntervalHours: 20,
    maxReschedulesPerDay: 3,
    snoozeDurations: [15, 30, 60], // minutes
    gracePeriodMinutes: 30,
};

// ─── AssessmentScheduler ────────────────────────────────────────────────────

/**
 * Manages assessment scheduling and rescheduling on mobile.
 */
export class AssessmentScheduler {
    private config: ScheduleConfig;
    private schedules: Map<string, ScheduledAssessment[]> = new Map();

    constructor(config: ScheduleConfig = DEFAULT_SCHEDULE_CONFIG) {
        this.config = config;
    }

    /**
     * Get the next scheduled assessment time for a patient.
     */
    getNextScheduledTime(patientId: string): ScheduledAssessment | null {
        const patientSchedules = this.schedules.get(patientId) || [];
        const now = new Date();

        return (
            patientSchedules.find(
                (s) => s.status === 'PENDING' && s.scheduledAt >= now
            ) || null
        );
    }

    /**
     * Schedule the next daily assessment for a patient.
     *
     * @param patientId - Patient to schedule for
     * @param customTime - Optional custom time override (24h format)
     * @returns The scheduled assessment
     */
    scheduleNext(
        patientId: string,
        customTime?: string
    ): ScheduledAssessment {
        const time = customTime || this.config.defaultTime;
        const [hours, minutes] = time.split(':').map(Number);

        const scheduledAt = new Date();
        scheduledAt.setHours(hours, minutes, 0, 0);

        // If time has already passed today, schedule for tomorrow
        if (scheduledAt <= new Date()) {
            scheduledAt.setDate(scheduledAt.getDate() + 1);
        }

        const schedule: ScheduledAssessment = {
            patientId,
            scheduledAt,
            originalTime: new Date(scheduledAt),
            rescheduleCount: 0,
            status: 'PENDING',
            snoozeCount: 0,
        };

        const existing = this.schedules.get(patientId) || [];
        existing.push(schedule);
        this.schedules.set(patientId, existing);

        return schedule;
    }

    /**
     * Snooze a pending assessment.
     *
     * @param patientId - Patient ID
     * @param snoozeDurationMinutes - Duration in minutes (must be from allowed list)
     * @returns Updated schedule, or null if snooze not allowed
     */
    snooze(
        patientId: string,
        snoozeDurationMinutes: number
    ): ScheduledAssessment | null {
        const next = this.getNextScheduledTime(patientId);
        if (!next) return null;

        // Validate snooze duration
        if (!this.config.snoozeDurations.includes(snoozeDurationMinutes)) {
            return null;
        }

        // Check reschedule limit
        if (next.rescheduleCount >= this.config.maxReschedulesPerDay) {
            return null;
        }

        // Apply snooze
        next.scheduledAt = new Date(
            next.scheduledAt.getTime() + snoozeDurationMinutes * 60 * 1000
        );
        next.rescheduleCount++;
        next.snoozeCount++;
        next.status = 'SNOOZED';

        return next;
    }

    /**
     * Reschedule an assessment to a specific time.
     *
     * @param patientId - Patient ID
     * @param newTime - New time in 24h format (e.g., "14:30")
     * @returns Updated schedule, or null if reschedule not allowed
     */
    reschedule(
        patientId: string,
        newTime: string
    ): ScheduledAssessment | null {
        const next = this.getNextScheduledTime(patientId);
        if (!next) return null;

        // Check reschedule limit
        if (next.rescheduleCount >= this.config.maxReschedulesPerDay) {
            return null;
        }

        const [hours, minutes] = newTime.split(':').map(Number);
        const newScheduledAt = new Date(next.scheduledAt);
        newScheduledAt.setHours(hours, minutes, 0, 0);

        // Can't reschedule to the past
        if (newScheduledAt <= new Date()) {
            return null;
        }

        // Check minimum interval from last assessment
        // (placeholder — would check localStorageManager in real implementation)

        next.scheduledAt = newScheduledAt;
        next.rescheduleCount++;
        next.status = 'PENDING';

        return next;
    }

    /**
     * Mark a scheduled assessment as completed.
     */
    markCompleted(patientId: string): void {
        const schedules = this.schedules.get(patientId) || [];
        const pending = schedules.find(
            (s) => s.status === 'PENDING' || s.status === 'SNOOZED'
        );
        if (pending) {
            pending.status = 'COMPLETED';
        }
    }

    /**
     * Mark overdue assessments as missed.
     *
     * Called periodically to update status of assessments past their grace period.
     */
    checkForMissed(patientId: string): ScheduledAssessment[] {
        const schedules = this.schedules.get(patientId) || [];
        const now = new Date();
        const graceMs = this.config.gracePeriodMinutes * 60 * 1000;
        const missed: ScheduledAssessment[] = [];

        for (const schedule of schedules) {
            if (
                (schedule.status === 'PENDING' || schedule.status === 'SNOOZED') &&
                now.getTime() > schedule.scheduledAt.getTime() + graceMs
            ) {
                schedule.status = 'MISSED';
                missed.push(schedule);
            }
        }

        return missed;
    }

    /**
     * Compute compliance statistics for a patient.
     */
    getComplianceStats(patientId: string): ComplianceStats {
        const schedules = this.schedules.get(patientId) || [];

        const completed = schedules.filter((s) => s.status === 'COMPLETED').length;
        const missed = schedules.filter((s) => s.status === 'MISSED').length;
        const snoozed = schedules.filter((s) => s.snoozeCount > 0).length;
        const total = completed + missed;

        // Calculate streak
        let currentStreak = 0;
        let longestStreak = 0;
        let streak = 0;

        const sorted = [...schedules]
            .filter((s) => s.status === 'COMPLETED' || s.status === 'MISSED')
            .sort((a, b) => a.originalTime.getTime() - b.originalTime.getTime());

        for (const schedule of sorted) {
            if (schedule.status === 'COMPLETED') {
                streak++;
                longestStreak = Math.max(longestStreak, streak);
            } else {
                streak = 0;
            }
        }
        currentStreak = streak;

        return {
            totalScheduled: total,
            completed,
            missed,
            snoozed,
            complianceRate: total > 0 ? completed / total : 1.0,
            currentStreak,
            longestStreak,
        };
    }

    /**
     * Get allowed snooze durations.
     */
    getSnoozeDurations(): number[] {
        return [...this.config.snoozeDurations];
    }

    /**
     * Clear all schedules for a patient (for testing).
     */
    _clearSchedules(patientId: string): void {
        this.schedules.delete(patientId);
    }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

export const assessmentScheduler = new AssessmentScheduler();
