/**
 * Notification Service
 *
 * Sends notifications via Firebase Cloud Messaging (push), SMS, and email.
 * Tracks delivery status for audit compliance.
 *
 * Requirements: 17.1, 4.4
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Types ──────────────────────────────────────────────────────────────────

export interface NotificationRecipient {
    recipientId: string;
    recipientType: 'CAREGIVER' | 'CLINICIAN';
    pushToken?: string;
    phoneNumber?: string;
    email?: string;
}

export interface NotificationPayload {
    title: string;
    body: string;
    data?: Record<string, string>;
}

// ─── Push Notification (Firebase Cloud Messaging) ───────────────────────────

/**
 * Send a push notification via Firebase Cloud Messaging.
 *
 * In production, this would use the firebase-admin SDK.
 * For now, it logs the notification and stores the record.
 */
export async function sendPushNotification(
    recipient: NotificationRecipient,
    alertId: string,
    payload: NotificationPayload
): Promise<string> {
    // In production: use firebase-admin to send FCM message
    // const message = {
    //   token: recipient.pushToken,
    //   notification: { title: payload.title, body: payload.body },
    //   data: payload.data,
    // };
    // await admin.messaging().send(message);

    console.log(`[FCM] Sending push to ${recipient.recipientId}:`, payload.title);

    // Store notification record
    const notification = await prisma.notification.create({
        data: {
            alertId,
            recipientId: recipient.recipientId,
            recipientType: recipient.recipientType,
            channel: 'PUSH',
            sentAt: new Date(),
        },
    });

    return notification.id;
}

// ─── SMS Notification ───────────────────────────────────────────────────────

/**
 * Send an SMS notification.
 *
 * In production, this would use Twilio or AWS SNS.
 * SMS is reserved for HIGH severity alerts per design.md.
 */
export async function sendSMS(
    recipient: NotificationRecipient,
    alertId: string,
    message: string
): Promise<string> {
    if (!recipient.phoneNumber) {
        throw new Error(`No phone number for recipient ${recipient.recipientId}`);
    }

    // In production: use Twilio
    // const client = require('twilio')(accountSid, authToken);
    // await client.messages.create({
    //   to: recipient.phoneNumber,
    //   from: process.env.TWILIO_PHONE,
    //   body: message,
    // });

    console.log(`[SMS] Sending to ${recipient.phoneNumber}: ${message.substring(0, 50)}...`);

    const notification = await prisma.notification.create({
        data: {
            alertId,
            recipientId: recipient.recipientId,
            recipientType: recipient.recipientType,
            channel: 'SMS',
            sentAt: new Date(),
        },
    });

    return notification.id;
}

// ─── Email Notification ─────────────────────────────────────────────────────

/**
 * Send an email notification.
 *
 * In production, this would use SendGrid, Resend, or AWS SES.
 */
export async function sendEmail(
    recipient: NotificationRecipient,
    alertId: string,
    subject: string,
    _body: string
): Promise<string> {
    if (!recipient.email) {
        throw new Error(`No email for recipient ${recipient.recipientId}`);
    }

    // In production: use email service
    console.log(`[Email] Sending to ${recipient.email}: ${subject}`);

    const notification = await prisma.notification.create({
        data: {
            alertId,
            recipientId: recipient.recipientId,
            recipientType: recipient.recipientType,
            channel: 'EMAIL',
            sentAt: new Date(),
        },
    });

    return notification.id;
}

// ─── Notification Orchestration ─────────────────────────────────────────────

/**
 * Send notifications for an alert to all determined recipients
 * based on the alert severity and recipient preferences.
 *
 * - All severities: Push notifications
 * - HIGH severity: Also sends SMS
 * - All severities: Optional email
 */
export async function notifyRecipients(
    alertId: string,
    severity: string,
    payload: NotificationPayload,
    recipients: NotificationRecipient[]
): Promise<string[]> {
    const notificationIds: string[] = [];

    for (const recipient of recipients) {
        // Always send push notification if token available
        if (recipient.pushToken) {
            const id = await sendPushNotification(recipient, alertId, payload);
            notificationIds.push(id);
        }

        // Send SMS for HIGH severity if phone available
        if (severity === 'HIGH' && recipient.phoneNumber) {
            const id = await sendSMS(recipient, alertId, `${payload.title}: ${payload.body}`);
            notificationIds.push(id);
        }

        // Send email if email available
        if (recipient.email) {
            const id = await sendEmail(recipient, alertId, payload.title, payload.body);
            notificationIds.push(id);
        }
    }

    return notificationIds;
}

/**
 * Determine recipients for an alert.
 * Returns the assigned clinician and any linked caregivers.
 */
export async function determineAlertRecipients(
    patientId: string
): Promise<NotificationRecipient[]> {
    const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        include: { caregivers: true },
    });

    if (!patient) {
        return [];
    }

    const recipients: NotificationRecipient[] = [];

    // Add assigned clinician
    recipients.push({
        recipientId: patient.assignedClinician,
        recipientType: 'CLINICIAN',
        // In production, look up clinician's push token and contact info
    });

    // Add linked caregivers
    for (const caregiver of patient.caregivers) {
        if (caregiver.linkedAt) {
            recipients.push({
                recipientId: caregiver.id,
                recipientType: 'CAREGIVER',
                phoneNumber: caregiver.smsEnabled ? caregiver.phoneNumber : undefined,
                email: caregiver.emailEnabled ? caregiver.email : undefined,
            });
        }
    }

    return recipients;
}
