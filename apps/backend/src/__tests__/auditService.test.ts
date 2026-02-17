import { logAccess, logDataExport, logSecurityEvent, queryAuditLogs } from '../services/auditService';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client', () => {
    const mPrisma = {
        auditLog: {
            create: jest.fn(),
            findMany: jest.fn(),
        },
    };
    return { PrismaClient: jest.fn(() => mPrisma) };
});

describe('Audit Service', () => {
    let prisma: any;

    beforeAll(() => {
        prisma = new PrismaClient();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should log access events', async () => {
        const entry = {
            userId: 'user-123',
            patientId: 'patient-456',
            resource: 'PATIENT',
            action: 'READ',
            ipAddress: '127.0.0.1',
        };

        const mockLog = { id: 'log-1', ...entry, timestamp: new Date() };
        prisma.auditLog.create.mockResolvedValue(mockLog);

        const result = await logAccess(entry);

        expect(prisma.auditLog.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                userId: entry.userId,
                action: entry.action,
            }),
        });
        expect(result).toBe('log-1');
    });

    it('should log data exports', async () => {
        prisma.auditLog.create.mockResolvedValue({ id: 'log-2' } as any);

        await logDataExport('user-1', 'patient-1', 'FHIR', '1.1.1.1');

        expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                action: 'EXPORT_FHIR',
                resource: 'PATIENT_DATA',
            }),
        }));
    });

    it('should log security events', async () => {
        prisma.auditLog.create.mockResolvedValue({ id: 'log-3' } as any);

        await logSecurityEvent('user-admin', 'LOGIN_FAILED', '192.168.1.1');

        expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                action: 'LOGIN_FAILED',
                resource: 'SECURITY',
            }),
        }));
    });

    it('should query audit logs with filters', async () => {
        const mockLogs = [{ id: '1' }, { id: '2' }];
        prisma.auditLog.findMany.mockResolvedValue(mockLogs);

        const result = await queryAuditLogs({ userId: 'u1', action: 'READ' });

        expect(prisma.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({
                userId: 'u1',
                action: 'READ',
            }),
        }));
        expect(result).toEqual(mockLogs);
    });
});
