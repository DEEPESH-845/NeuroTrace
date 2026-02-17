/**
 * Auth Middleware Tests
 *
 * Tests authentication and authorization logic without database.
 */

import { Request, Response, NextFunction } from 'express';
import {
    verifyToken,
    authMiddleware,
    requireRole,
    requirePatientAccess,
    UserRole,
} from '../middleware/authMiddleware';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Create a valid JWT-like token for testing */
function createTestToken(
    payload: Record<string, any>,
    expired = false
): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(
        JSON.stringify({
            ...payload,
            exp: expired ? Math.floor(Date.now() / 1000) - 3600 : Math.floor(Date.now() / 1000) + 3600,
        })
    ).toString('base64url');
    const signature = 'test-signature';
    return `${header}.${body}.${signature}`;
}

function mockRequest(overrides?: Partial<Request>): Request {
    return {
        headers: {},
        params: {},
        user: undefined,
        ...overrides,
    } as any;
}

function mockResponse(): Response {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnThis() as any;
    res.json = jest.fn().mockReturnThis() as any;
    return res as Response;
}

function mockNext(): NextFunction {
    return jest.fn();
}

// ─── verifyToken ────────────────────────────────────────────────────────────

describe('verifyToken', () => {
    it('returns user for valid token', async () => {
        const token = createTestToken({
            sub: 'user-1',
            email: 'test@example.com',
            user_metadata: { role: 'CLINICIAN' },
        });

        const user = await verifyToken(token);
        expect(user).not.toBeNull();
        expect(user!.userId).toBe('user-1');
        expect(user!.email).toBe('test@example.com');
        expect(user!.role).toBe(UserRole.CLINICIAN);
    });

    it('returns null for expired token', async () => {
        const token = createTestToken({ sub: 'user-1' }, true);
        const user = await verifyToken(token);
        expect(user).toBeNull();
    });

    it('returns null for malformed token', async () => {
        const user = await verifyToken('not-a-jwt');
        expect(user).toBeNull();
    });

    it('defaults to PATIENT role if none specified', async () => {
        const token = createTestToken({ sub: 'user-1', email: 'patient@test.com' });
        const user = await verifyToken(token);
        expect(user!.role).toBe(UserRole.PATIENT);
    });

    it('extracts patient IDs from metadata', async () => {
        const token = createTestToken({
            sub: 'user-1',
            user_metadata: { role: 'CAREGIVER', patient_ids: ['p1', 'p2'] },
        });
        const user = await verifyToken(token);
        expect(user!.patientIds).toEqual(['p1', 'p2']);
    });
});

// ─── authMiddleware ─────────────────────────────────────────────────────────

describe('authMiddleware', () => {
    it('rejects request without Authorization header', () => {
        const req = mockRequest();
        const res = mockResponse();
        const next = mockNext();

        authMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('rejects request with non-Bearer token', () => {
        const req = mockRequest({ headers: { authorization: 'Basic abc' } as any });
        const res = mockResponse();
        const next = mockNext();

        authMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('attaches user on valid token', async () => {
        const token = createTestToken({
            sub: 'user-1',
            email: 'test@example.com',
            user_metadata: { role: 'CLINICIAN' },
        });
        const req = mockRequest({
            headers: { authorization: `Bearer ${token}` } as any,
        });
        const res = mockResponse();
        const next = mockNext();

        authMiddleware(req, res, next);

        // Wait for async promise to resolve
        await new Promise((r) => setTimeout(r, 50));

        expect(next).toHaveBeenCalled();
        expect(req.user).toBeDefined();
        expect(req.user!.userId).toBe('user-1');
    });
});

// ─── requireRole ────────────────────────────────────────────────────────────

describe('requireRole', () => {
    it('allows matching role', () => {
        const middleware = requireRole(UserRole.CLINICIAN);
        const req = mockRequest();
        req.user = {
            userId: 'u1',
            email: 'test@test.com',
            role: UserRole.CLINICIAN,
        };
        const res = mockResponse();
        const next = mockNext();

        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    it('rejects non-matching role', () => {
        const middleware = requireRole(UserRole.ADMIN);
        const req = mockRequest();
        req.user = {
            userId: 'u1',
            email: 'test@test.com',
            role: UserRole.PATIENT,
        };
        const res = mockResponse();
        const next = mockNext();

        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    it('allows when role is in list', () => {
        const middleware = requireRole(UserRole.CLINICIAN, UserRole.ADMIN);
        const req = mockRequest();
        req.user = {
            userId: 'u1',
            email: 'test@test.com',
            role: UserRole.ADMIN,
        };
        const res = mockResponse();
        const next = mockNext();

        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
    });
});

// ─── requirePatientAccess ───────────────────────────────────────────────────

describe('requirePatientAccess', () => {
    it('allows clinicians to access any patient', () => {
        const middleware = requirePatientAccess();
        const req = mockRequest({ params: { patientId: 'p1' } as any });
        req.user = {
            userId: 'c1',
            email: 'clinician@test.com',
            role: UserRole.CLINICIAN,
        };
        const res = mockResponse();
        const next = mockNext();

        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    it('allows patients to access their own data', () => {
        const middleware = requirePatientAccess();
        const req = mockRequest({ params: { patientId: 'p1' } as any });
        req.user = {
            userId: 'u1',
            email: 'patient@test.com',
            role: UserRole.PATIENT,
            patientIds: ['p1'],
        };
        const res = mockResponse();
        const next = mockNext();

        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    it('rejects patients accessing other patient data', () => {
        const middleware = requirePatientAccess();
        const req = mockRequest({ params: { patientId: 'p2' } as any });
        req.user = {
            userId: 'u1',
            email: 'patient@test.com',
            role: UserRole.PATIENT,
            patientIds: ['p1'],
        };
        const res = mockResponse();
        const next = mockNext();

        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    it('allows caregivers to access linked patients', () => {
        const middleware = requirePatientAccess();
        const req = mockRequest({ params: { patientId: 'p1' } as any });
        req.user = {
            userId: 'cg1',
            email: 'caregiver@test.com',
            role: UserRole.CAREGIVER,
            patientIds: ['p1', 'p2'],
        };
        const res = mockResponse();
        const next = mockNext();

        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    it('rejects caregivers accessing unlinked patients', () => {
        const middleware = requirePatientAccess();
        const req = mockRequest({ params: { patientId: 'p3' } as any });
        req.user = {
            userId: 'cg1',
            email: 'caregiver@test.com',
            role: UserRole.CAREGIVER,
            patientIds: ['p1', 'p2'],
        };
        const res = mockResponse();
        const next = mockNext();

        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });
});
