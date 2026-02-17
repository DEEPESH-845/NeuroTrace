/**
 * Authentication Middleware
 *
 * Verifies JWT tokens from Supabase Auth and attaches user to request.
 * Supports RBAC with roles: PATIENT, CAREGIVER, CLINICIAN, ADMIN.
 *
 * Requirements: 6.1, 6.2, 6.3
 */

import { Request, Response, NextFunction } from 'express';

// ─── Types ──────────────────────────────────────────────────────────────────

export enum UserRole {
    PATIENT = 'PATIENT',
    CAREGIVER = 'CAREGIVER',
    CLINICIAN = 'CLINICIAN',
    ADMIN = 'ADMIN',
}

export interface AuthenticatedUser {
    userId: string;
    email: string;
    role: UserRole;
    /** Patient ID if role is PATIENT, or linked patient IDs for CAREGIVER */
    patientIds?: string[];
}

// Extend Express Request
declare global {
    namespace Express {
        interface Request {
            user?: AuthenticatedUser;
        }
    }
}

// ─── JWT Verification ───────────────────────────────────────────────────────

/**
 * Verify a JWT token and extract user claims.
 * In production, this would verify against Supabase Auth's JWKS endpoint.
 *
 * @param token - Bearer token from Authorization header
 * @returns Authenticated user or null if invalid
 */
export async function verifyToken(token: string): Promise<AuthenticatedUser | null> {
    try {
        // In production: verify JWT signature using Supabase's public key
        // For now: decode the JWT payload (base64url)
        const parts = token.split('.');
        if (parts.length !== 3) {
            return null;
        }

        const payload = JSON.parse(
            Buffer.from(parts[1], 'base64url').toString('utf-8')
        );

        // Check expiration
        if (payload.exp && payload.exp * 1000 < Date.now()) {
            return null;
        }

        return {
            userId: payload.sub || payload.user_id,
            email: payload.email || '',
            role: (payload.user_metadata?.role as UserRole) || UserRole.PATIENT,
            patientIds: payload.user_metadata?.patient_ids,
        };
    } catch {
        return null;
    }
}

// ─── Middleware ──────────────────────────────────────────────────────────────

/**
 * Authentication middleware.
 * Rejects requests without a valid Bearer token.
 */
export function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
            error: {
                code: 'UNAUTHORIZED',
                message: 'Missing or invalid authorization header',
                timestamp: new Date().toISOString(),
            },
        });
        return;
    }

    const token = authHeader.substring(7);

    verifyToken(token)
        .then((user) => {
            if (!user) {
                res.status(401).json({
                    error: {
                        code: 'UNAUTHORIZED',
                        message: 'Invalid or expired token',
                        timestamp: new Date().toISOString(),
                    },
                });
                return;
            }

            req.user = user;
            next();
        })
        .catch(() => {
            res.status(401).json({
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Token verification failed',
                    timestamp: new Date().toISOString(),
                },
            });
        });
}

/**
 * Role-based access control middleware factory.
 * Returns middleware that only allows specified roles.
 *
 * @param allowedRoles - Roles permitted to access the route
 */
export function requireRole(...allowedRoles: UserRole[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required',
                    timestamp: new Date().toISOString(),
                },
            });
            return;
        }

        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                error: {
                    code: 'FORBIDDEN',
                    message: `Insufficient permissions. Required role: ${allowedRoles.join(' or ')}`,
                    timestamp: new Date().toISOString(),
                },
            });
            return;
        }

        next();
    };
}

/**
 * Middleware that ensures a patient can only access their own data.
 * Clinicians and admins bypass this check.
 *
 * @param paramName - Route parameter name containing patient ID (default: 'patientId')
 */
export function requirePatientAccess(paramName: string = 'patientId') {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required',
                    timestamp: new Date().toISOString(),
                },
            });
            return;
        }

        // Clinicians and admins can access any patient
        if (req.user.role === UserRole.CLINICIAN || req.user.role === UserRole.ADMIN) {
            next();
            return;
        }

        const requestedPatientId = req.params[paramName];

        // Patients can only access their own data
        if (req.user.role === UserRole.PATIENT) {
            if (!req.user.patientIds?.includes(requestedPatientId)) {
                res.status(403).json({
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Access denied: cannot access another patient\'s data',
                        timestamp: new Date().toISOString(),
                    },
                });
                return;
            }
        }

        // Caregivers can only access their linked patients
        if (req.user.role === UserRole.CAREGIVER) {
            if (!req.user.patientIds?.includes(requestedPatientId)) {
                res.status(403).json({
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Access denied: patient not linked to your account',
                        timestamp: new Date().toISOString(),
                    },
                });
                return;
            }
        }

        next();
    };
}
