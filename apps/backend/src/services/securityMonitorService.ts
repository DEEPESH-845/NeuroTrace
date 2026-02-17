/**
 * Security Monitor & Incident Response Service
 *
 * Detects unauthorized access patterns, monitors for anomalous behavior,
 * and triggers incident response workflows.
 *
 * Requirements: 34.1, 34.2 — Security monitoring with < 1 hour incident notification
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export enum SecurityEventType {
    FAILED_LOGIN = 'FAILED_LOGIN',
    UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
    SUSPICIOUS_PATTERN = 'SUSPICIOUS_PATTERN',
    DATA_EXFILTRATION = 'DATA_EXFILTRATION',
    PRIVILEGE_ESCALATION = 'PRIVILEGE_ESCALATION',
    BRUTE_FORCE = 'BRUTE_FORCE',
}

export enum IncidentSeverity {
    INFO = 'INFO',
    WARNING = 'WARNING',
    CRITICAL = 'CRITICAL',
}

export interface SecurityEvent {
    id: string;
    type: SecurityEventType;
    severity: IncidentSeverity;
    sourceIp: string;
    userId?: string;
    resource?: string;
    details: string;
    timestamp: Date;
}

export interface SecurityIncident {
    id: string;
    events: SecurityEvent[];
    severity: IncidentSeverity;
    status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED';
    description: string;
    createdAt: Date;
    resolvedAt?: Date;
    notifiedAt?: Date;
}

export interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
}

// ─── In-Memory Tracking ────────────────────────────────────────────────────

/** Track failed login attempts per IP: ip → timestamps[] */
const failedLoginAttempts: Map<string, number[]> = new Map();

/** Track request counts per IP for rate limiting: ip → timestamps[] */
const requestCounts: Map<string, number[]> = new Map();

/** Track data access per user: userId → { resource, timestamp }[] */
const accessPatterns: Map<string, Array<{ resource: string; timestamp: number }>> = new Map();

/** Active security incidents */
const activeIncidents: Map<string, SecurityIncident> = new Map();

/** Security event log */
const eventLog: SecurityEvent[] = [];

// ─── Configuration ──────────────────────────────────────────────────────────

const CONFIG = {
    /** Number of failed logins before triggering brute force alert */
    bruteForceThreshold: 5,
    /** Time window for counting failed logins (ms) */
    bruteForceWindowMs: 15 * 60 * 1000, // 15 minutes
    /** Max unique patient records accessed in a window before suspicion */
    dataExfiltrationThreshold: 50,
    /** Window for data exfiltration detection (ms) */
    dataExfiltrationWindowMs: 60 * 60 * 1000, // 1 hour
    /** Default rate limit */
    rateLimit: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 100,
    } as RateLimitConfig,
    /** Incident notification deadline (ms) — requirement: < 1 hour */
    incidentNotificationDeadlineMs: 60 * 60 * 1000,
};

// ─── Event Recording ───────────────────────────────────────────────────────

let eventIdCounter = 0;
let incidentIdCounter = 0;

/**
 * Record a security event and check for incident patterns.
 */
export function recordSecurityEvent(
    type: SecurityEventType,
    sourceIp: string,
    details: string,
    userId?: string,
    resource?: string
): SecurityEvent {
    const event: SecurityEvent = {
        id: `evt-${++eventIdCounter}`,
        type,
        severity: classifyEventSeverity(type),
        sourceIp,
        userId,
        resource,
        details,
        timestamp: new Date(),
    };

    eventLog.push(event);

    // Trigger pattern analysis
    analyzeEvent(event);

    return event;
}

/**
 * Classify event severity based on type.
 */
function classifyEventSeverity(type: SecurityEventType): IncidentSeverity {
    switch (type) {
        case SecurityEventType.BRUTE_FORCE:
        case SecurityEventType.DATA_EXFILTRATION:
        case SecurityEventType.PRIVILEGE_ESCALATION:
            return IncidentSeverity.CRITICAL;
        case SecurityEventType.UNAUTHORIZED_ACCESS:
        case SecurityEventType.RATE_LIMIT_EXCEEDED:
        case SecurityEventType.SUSPICIOUS_PATTERN:
            return IncidentSeverity.WARNING;
        case SecurityEventType.FAILED_LOGIN:
        default:
            return IncidentSeverity.INFO;
    }
}

// ─── Pattern Analysis ──────────────────────────────────────────────────────

/**
 * Analyze a security event for escalation patterns.
 */
function analyzeEvent(event: SecurityEvent): void {
    switch (event.type) {
        case SecurityEventType.FAILED_LOGIN:
            checkBruteForce(event);
            break;
        case SecurityEventType.UNAUTHORIZED_ACCESS:
            checkPatternEscalation(event);
            break;
    }

    if (event.userId && event.resource) {
        trackDataAccess(event.userId, event.resource);
    }
}

/**
 * Detect brute force login attempts from a single IP.
 */
export function checkBruteForce(event: SecurityEvent): SecurityIncident | null {
    const now = Date.now();
    const windowStart = now - CONFIG.bruteForceWindowMs;

    // Get or create attempt list for this IP
    const attempts = failedLoginAttempts.get(event.sourceIp) || [];
    attempts.push(now);

    // Prune old attempts outside the window
    const recentAttempts = attempts.filter((t) => t > windowStart);
    failedLoginAttempts.set(event.sourceIp, recentAttempts);

    if (recentAttempts.length >= CONFIG.bruteForceThreshold) {
        return createIncident(
            [event],
            IncidentSeverity.CRITICAL,
            `Brute force attack detected from IP ${event.sourceIp}. ` +
            `${recentAttempts.length} failed login attempts in ${CONFIG.bruteForceWindowMs / 60000} minutes.`
        );
    }

    return null;
}

/**
 * Track data access patterns and detect anomalous bulk access.
 */
export function trackDataAccess(userId: string, resource: string): SecurityIncident | null {
    const now = Date.now();
    const windowStart = now - CONFIG.dataExfiltrationWindowMs;

    const accesses = accessPatterns.get(userId) || [];
    accesses.push({ resource, timestamp: now });

    // Prune old accesses
    const recentAccesses = accesses.filter((a) => a.timestamp > windowStart);
    accessPatterns.set(userId, recentAccesses);

    // Count unique resources accessed
    const uniqueResources = new Set(recentAccesses.map((a) => a.resource));

    if (uniqueResources.size >= CONFIG.dataExfiltrationThreshold) {
        const event: SecurityEvent = {
            id: `evt-${++eventIdCounter}`,
            type: SecurityEventType.DATA_EXFILTRATION,
            severity: IncidentSeverity.CRITICAL,
            sourceIp: 'internal',
            userId,
            details: `User ${userId} accessed ${uniqueResources.size} unique resources in ${CONFIG.dataExfiltrationWindowMs / 60000} minutes.`,
            timestamp: new Date(),
        };
        eventLog.push(event);

        return createIncident(
            [event],
            IncidentSeverity.CRITICAL,
            `Potential data exfiltration by user ${userId}. ${uniqueResources.size} unique patient records accessed.`
        );
    }

    return null;
}

/**
 * Check if an unauthorized access attempt is part of a larger pattern.
 */
function checkPatternEscalation(event: SecurityEvent): void {
    const recentEvents = eventLog.filter(
        (e) =>
            e.sourceIp === event.sourceIp &&
            e.type === SecurityEventType.UNAUTHORIZED_ACCESS &&
            Date.now() - e.timestamp.getTime() < CONFIG.bruteForceWindowMs
    );

    if (recentEvents.length >= 3) {
        createIncident(
            recentEvents,
            IncidentSeverity.WARNING,
            `Repeated unauthorized access attempts from IP ${event.sourceIp}. ` +
            `${recentEvents.length} attempts detected.`
        );
    }
}

// ─── Incident Management ───────────────────────────────────────────────────

/**
 * Create a new security incident.
 */
export function createIncident(
    events: SecurityEvent[],
    severity: IncidentSeverity,
    description: string
): SecurityIncident {
    const incident: SecurityIncident = {
        id: `inc-${++incidentIdCounter}`,
        events,
        severity,
        status: 'OPEN',
        description,
        createdAt: new Date(),
    };

    activeIncidents.set(incident.id, incident);

    // Auto-notify for CRITICAL incidents (< 1 hour requirement)
    if (severity === IncidentSeverity.CRITICAL) {
        notifyIncident(incident);
    }

    return incident;
}

/**
 * Notify security team about an incident.
 * In production: send to PagerDuty, Slack, email, etc.
 */
function notifyIncident(incident: SecurityIncident): void {
    incident.notifiedAt = new Date();

    // Log notification (in production, integrate with alerting service)
    console.warn(`🚨 SECURITY INCIDENT [${incident.severity}]: ${incident.description}`);
    console.warn(`   Incident ID: ${incident.id}`);
    console.warn(`   Events: ${incident.events.length}`);
    console.warn(`   Notified at: ${incident.notifiedAt.toISOString()}`);
}

/**
 * Resolve a security incident.
 */
export function resolveIncident(incidentId: string, _notes?: string): SecurityIncident | null {
    const incident = activeIncidents.get(incidentId);
    if (!incident) return null;

    incident.status = 'RESOLVED';
    incident.resolvedAt = new Date();

    return incident;
}

// ─── Rate Limiting ─────────────────────────────────────────────────────────

/**
 * Check if a request from an IP should be rate-limited.
 */
export function checkRateLimit(
    sourceIp: string,
    config: RateLimitConfig = CONFIG.rateLimit
): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    const counts = requestCounts.get(sourceIp) || [];
    const recentCounts = counts.filter((t) => t > windowStart);
    recentCounts.push(now);
    requestCounts.set(sourceIp, recentCounts);

    const allowed = recentCounts.length <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - recentCounts.length);
    const resetAt = windowStart + config.windowMs;

    if (!allowed) {
        recordSecurityEvent(
            SecurityEventType.RATE_LIMIT_EXCEEDED,
            sourceIp,
            `Rate limit exceeded: ${recentCounts.length}/${config.maxRequests} requests in ${config.windowMs / 1000}s`
        );
    }

    return { allowed, remaining, resetAt };
}

// ─── Queries ────────────────────────────────────────────────────────────────

/**
 * Get all active (unresolved) incidents.
 */
export function getActiveIncidents(): SecurityIncident[] {
    return Array.from(activeIncidents.values()).filter((i) => i.status !== 'RESOLVED');
}

/**
 * Get recent security events.
 */
export function getRecentEvents(
    limit = 100,
    typeFilter?: SecurityEventType
): SecurityEvent[] {
    let events = [...eventLog];
    if (typeFilter) {
        events = events.filter((e) => e.type === typeFilter);
    }
    return events.slice(-limit);
}

/**
 * Get security metrics summary.
 */
export function getSecurityMetrics(windowMs = 24 * 60 * 60 * 1000): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    activeIncidents: number;
    criticalIncidents: number;
} {
    const cutoff = Date.now() - windowMs;
    const recentEvents = eventLog.filter((e) => e.timestamp.getTime() > cutoff);

    const eventsByType: Record<string, number> = {};
    for (const event of recentEvents) {
        eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
    }

    const active = getActiveIncidents();

    return {
        totalEvents: recentEvents.length,
        eventsByType,
        activeIncidents: active.length,
        criticalIncidents: active.filter((i) => i.severity === IncidentSeverity.CRITICAL).length,
    };
}

/**
 * Reset all tracking state (for testing only).
 */
export function _resetState(): void {
    failedLoginAttempts.clear();
    requestCounts.clear();
    accessPatterns.clear();
    activeIncidents.clear();
    eventLog.length = 0;
    eventIdCounter = 0;
    incidentIdCounter = 0;
}
