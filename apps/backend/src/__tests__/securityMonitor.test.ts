/**
 * Security Monitor Service Tests
 *
 * Tests brute force detection, rate limiting, and incident management.
 */

import {
    recordSecurityEvent,
    checkBruteForce,
    checkRateLimit,
    createIncident,
    resolveIncident,
    getActiveIncidents,
    getRecentEvents,
    getSecurityMetrics,
    SecurityEventType,
    IncidentSeverity,
    _resetState,
} from '../services/securityMonitorService';

beforeEach(() => {
    _resetState();
});

describe('recordSecurityEvent', () => {
    it('records an event and returns it with an ID', () => {
        const event = recordSecurityEvent(
            SecurityEventType.FAILED_LOGIN,
            '192.168.1.1',
            'Invalid credentials'
        );
        expect(event.id).toBeTruthy();
        expect(event.type).toBe(SecurityEventType.FAILED_LOGIN);
        expect(event.sourceIp).toBe('192.168.1.1');
        expect(event.details).toBe('Invalid credentials');
    });

    it('classifies FAILED_LOGIN as INFO severity', () => {
        const event = recordSecurityEvent(
            SecurityEventType.FAILED_LOGIN,
            '10.0.0.1',
            'test'
        );
        expect(event.severity).toBe(IncidentSeverity.INFO);
    });

    it('classifies UNAUTHORIZED_ACCESS as WARNING severity', () => {
        const event = recordSecurityEvent(
            SecurityEventType.UNAUTHORIZED_ACCESS,
            '10.0.0.1',
            'test'
        );
        expect(event.severity).toBe(IncidentSeverity.WARNING);
    });

    it('classifies BRUTE_FORCE as CRITICAL severity', () => {
        const event = recordSecurityEvent(
            SecurityEventType.BRUTE_FORCE,
            '10.0.0.1',
            'test'
        );
        expect(event.severity).toBe(IncidentSeverity.CRITICAL);
    });
});

describe('checkBruteForce', () => {
    it('does not trigger for a few failed attempts', () => {
        const event = {
            id: 'test-1',
            type: SecurityEventType.FAILED_LOGIN,
            severity: IncidentSeverity.INFO,
            sourceIp: '10.0.0.1',
            details: 'Failed login',
            timestamp: new Date(),
        };

        const result = checkBruteForce(event);
        expect(result).toBeNull();
    });

    it('triggers incident after threshold failed attempts', () => {
        const ip = '10.0.0.5';
        let incident = null;

        for (let i = 0; i < 5; i++) {
            incident = checkBruteForce({
                id: `test-${i}`,
                type: SecurityEventType.FAILED_LOGIN,
                severity: IncidentSeverity.INFO,
                sourceIp: ip,
                details: `Attempt ${i + 1}`,
                timestamp: new Date(),
            });
        }

        expect(incident).not.toBeNull();
        expect(incident!.severity).toBe(IncidentSeverity.CRITICAL);
        expect(incident!.description).toContain('Brute force');
        expect(incident!.description).toContain(ip);
    });
});

describe('checkRateLimit', () => {
    it('allows requests within limit', () => {
        const result = checkRateLimit('10.0.0.1', {
            windowMs: 60000,
            maxRequests: 100,
        });
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(99);
    });

    it('blocks requests exceeding limit', () => {
        const config = { windowMs: 60000, maxRequests: 3 };
        const ip = '10.0.0.2';

        checkRateLimit(ip, config);
        checkRateLimit(ip, config);
        checkRateLimit(ip, config);
        const result = checkRateLimit(ip, config);

        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
    });
});

describe('incident management', () => {
    it('creates and tracks incidents', () => {
        const incident = createIncident(
            [],
            IncidentSeverity.WARNING,
            'Test incident'
        );

        expect(incident.id).toBeTruthy();
        expect(incident.status).toBe('OPEN');
        expect(getActiveIncidents()).toHaveLength(1);
    });

    it('resolves incidents', () => {
        const incident = createIncident(
            [],
            IncidentSeverity.WARNING,
            'Test incident'
        );

        const resolved = resolveIncident(incident.id);
        expect(resolved!.status).toBe('RESOLVED');
        expect(resolved!.resolvedAt).toBeDefined();
        expect(getActiveIncidents()).toHaveLength(0);
    });

    it('returns null when resolving non-existent incident', () => {
        expect(resolveIncident('non-existent')).toBeNull();
    });

    it('auto-notifies for CRITICAL incidents', () => {
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

        createIncident([], IncidentSeverity.CRITICAL, 'Critical test');

        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('SECURITY INCIDENT')
        );
        consoleSpy.mockRestore();
    });
});

describe('getRecentEvents', () => {
    it('returns events in order', () => {
        recordSecurityEvent(SecurityEventType.FAILED_LOGIN, '10.0.0.1', 'Event 1');
        recordSecurityEvent(SecurityEventType.UNAUTHORIZED_ACCESS, '10.0.0.2', 'Event 2');

        const events = getRecentEvents(10);
        expect(events).toHaveLength(2);
        expect(events[0].details).toBe('Event 1');
        expect(events[1].details).toBe('Event 2');
    });

    it('filters by event type', () => {
        recordSecurityEvent(SecurityEventType.FAILED_LOGIN, '10.0.0.1', 'Login fail');
        recordSecurityEvent(SecurityEventType.UNAUTHORIZED_ACCESS, '10.0.0.2', 'Unauth');

        const events = getRecentEvents(10, SecurityEventType.FAILED_LOGIN);
        expect(events).toHaveLength(1);
        expect(events[0].details).toBe('Login fail');
    });
});

describe('getSecurityMetrics', () => {
    it('returns aggregated metrics', () => {
        recordSecurityEvent(SecurityEventType.FAILED_LOGIN, '10.0.0.1', 'test');
        recordSecurityEvent(SecurityEventType.FAILED_LOGIN, '10.0.0.2', 'test');
        recordSecurityEvent(SecurityEventType.UNAUTHORIZED_ACCESS, '10.0.0.3', 'test');

        const metrics = getSecurityMetrics();
        expect(metrics.totalEvents).toBe(3);
        expect(metrics.eventsByType[SecurityEventType.FAILED_LOGIN]).toBe(2);
        expect(metrics.eventsByType[SecurityEventType.UNAUTHORIZED_ACCESS]).toBe(1);
    });
});
