import { sendPushNotification, sendSMS, notifyRecipients, determineAlertRecipients } from '../services/notificationService';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client', () => {
    const mPrisma = {
        notification: {
            create: jest.fn(),
        },
        patient: {
            findUnique: jest.fn(),
        },
    };
    return { PrismaClient: jest.fn(() => mPrisma) };
});

describe('Notification Service', () => {
    let prisma: any;

    beforeAll(() => {
        prisma = new PrismaClient();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('sendPushNotification', () => {
        it('should log and store push notification', async () => {
            prisma.notification.create.mockResolvedValue({ id: 'n1' });
            const recipient = { recipientId: 'r1', recipientType: 'CLINICIAN' as const, pushToken: 'tok' };

            const result = await sendPushNotification(recipient, 'alert-1', { title: 'T', body: 'B' });

            expect(prisma.notification.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    channel: 'PUSH',
                    recipientId: 'r1',
                    alertId: 'alert-1'
                })
            }));
            expect(result).toBe('n1');
        });
    });

    describe('sendSMS', () => {
        it('should throw if no phone number', async () => {
            const recipient = { recipientId: 'r1', recipientType: 'CAREGIVER' as const };
            await expect(sendSMS(recipient, 'a1', 'msg')).rejects.toThrow('No phone number');
        });

        it('should store SMS notification', async () => {
            prisma.notification.create.mockResolvedValue({ id: 'n2' });
            const recipient = { recipientId: 'r2', recipientType: 'CAREGIVER' as const, phoneNumber: '+123' };

            const result = await sendSMS(recipient, 'a1', 'msg');

            expect(prisma.notification.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    channel: 'SMS',
                    recipientId: 'r2'
                })
            }));
            expect(result).toBe('n2');
        });
    });

    describe('notifyRecipients', () => {
        it('should send multiple notifications based on logic', async () => {
            prisma.notification.create.mockResolvedValue({ id: 'n' });
            const recipients = [
                { recipientId: 'c1', recipientType: 'CLINICIAN' as const, pushToken: 'tok1' },
                { recipientId: 'g1', recipientType: 'CAREGIVER' as const, phoneNumber: '+123' }
            ];

            // Severity HIGH -> SMS for caregiver (if phone), Push for clinician
            await notifyRecipients('a1', 'HIGH', { title: 'T', body: 'B' }, recipients);

            // 1 push (clinician), 0 push (caregiver - no token), 1 SMS (caregiver) = 2 calls?
            // Wait, logic: 
            // Clinician: has pushToken -> sendPush
            // Caregiver: no pushToken -> skip push. has phoneNumber + HIGH -> sendSMS.

            // Expected calls:
            // 1. sendPush (clinician) -> create PUSH
            // 2. sendSMS (caregiver) -> create SMS

            expect(prisma.notification.create).toHaveBeenCalledTimes(2);
        });
    });

    describe('determineAlertRecipients', () => {
        it('should return clinician and linked caregivers', async () => {
            prisma.patient.findUnique.mockResolvedValue({
                id: 'p1',
                assignedClinician: 'doc1',
                caregivers: [
                    { id: 'cg1', linkedAt: new Date(), smsEnabled: true, phoneNumber: '123' },
                    { id: 'cg2', linkedAt: null } // Not linked
                ]
            });

            const recipients = await determineAlertRecipients('p1');

            expect(recipients).toHaveLength(2); // doc1 + cg1
            expect(recipients.find(r => r.recipientId === 'doc1')).toBeDefined();
            expect(recipients.find(r => r.recipientId === 'cg1')).toBeDefined();
        });

        it('should return empty if patient not found', async () => {
            prisma.patient.findUnique.mockResolvedValue(null);
            const recipients = await determineAlertRecipients('p1');
            expect(recipients).toEqual([]);
        });
    });
});
