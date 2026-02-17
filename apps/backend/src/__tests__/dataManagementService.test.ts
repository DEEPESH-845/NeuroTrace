import { deletePatientData, exportPatientData, isDataPastRetention } from '../services/dataManagementService';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client', () => {
    const mPrisma = {
        patient: {
            findUnique: jest.fn(),
            delete: jest.fn(),
            findMany: jest.fn(),
        },
        $transaction: jest.fn(),
        notification: { deleteMany: jest.fn() },
        alert: { deleteMany: jest.fn() },
        assessment: { deleteMany: jest.fn() },
        baseline: { deleteMany: jest.fn() },
        caregiver: { deleteMany: jest.fn() },
        auditLog: { deleteMany: jest.fn() },
    };
    return { PrismaClient: jest.fn(() => mPrisma) };
});

describe('Data Management Service', () => {
    let prisma: any;

    beforeAll(() => {
        prisma = new PrismaClient();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('deletePatientData', () => {
        it('should cascade delete all patient data', async () => {
            prisma.patient.findUnique.mockResolvedValue({ id: 'p1' });
            // Mock transaction to just run the callback with the prisma client (flattened)
            prisma.$transaction.mockImplementation(async (callback: any) => {
                return callback(prisma);
            });
            // Mock delete results
            const count = { count: 5 };
            prisma.notification.deleteMany.mockResolvedValue(count);
            prisma.alert.deleteMany.mockResolvedValue(count);
            prisma.assessment.deleteMany.mockResolvedValue(count);
            prisma.baseline.deleteMany.mockResolvedValue(count);
            prisma.caregiver.deleteMany.mockResolvedValue(count);
            prisma.auditLog.deleteMany.mockResolvedValue(count);
            prisma.patient.delete.mockResolvedValue({ id: 'p1' });

            const result = await deletePatientData({
                patientId: 'p1',
                requestedBy: 'admin',
                reason: 'test',
                retainAuditLogs: false
            });

            expect(prisma.$transaction).toHaveBeenCalled();
            expect(prisma.assessment.deleteMany).toHaveBeenCalled();
            expect(prisma.patient.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
            expect(result.deletedRecords.patient).toBe(true);
        });

        it('should throw if patient not found', async () => {
            prisma.patient.findUnique.mockResolvedValue(null);
            await expect(deletePatientData({
                patientId: 'missing',
                requestedBy: 'admin',
                reason: 'test',
                retainAuditLogs: false
            })).rejects.toThrow('Patient missing not found');
        });
    });

    describe('exportPatientData', () => {
        it('should export data in JSON format', async () => {
            const mockPatient = {
                id: 'p1',
                dateOfBirth: new Date(),
                assessments: [{ id: 'a1' }],
                alerts: [],
                caregivers: [],
                baseline: null
            };
            prisma.patient.findUnique.mockResolvedValue(mockPatient);

            const result = await exportPatientData('p1', 'json');

            expect(result.format).toBe('json');
            expect(result.data.patient.id).toBe('p1');
            expect(result.data.assessments).toHaveLength(1);
        });
    });

    describe('retention logic', () => {
        it('should correctly identify expired data', () => {
            const oldDate = new Date('2000-01-01');
            expect(isDataPastRetention(oldDate)).toBe(true);

            const futureDate = new Date();
            futureDate.setFullYear(futureDate.getFullYear() + 10);
            expect(isDataPastRetention(futureDate)).toBe(false);
        });
    });
});
