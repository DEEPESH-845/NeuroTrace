/**
 * Federated Learning Service Tests
 *
 * Tests gradient privacy validation (no DB required).
 */

import { validateGradientPrivacy } from '../services/federatedLearningService';

describe('validateGradientPrivacy', () => {
    it('accepts clean gradient buffer', () => {
        const gradients = Buffer.from([0x01, 0x02, 0x03, 0x04]);
        expect(validateGradientPrivacy(gradients)).toBe(true);
    });

    it('rejects SSN pattern in gradients', () => {
        const gradients = Buffer.from('model weights 123-45-6789 more data');
        expect(validateGradientPrivacy(gradients)).toBe(false);
    });

    it('rejects email pattern in gradients', () => {
        const gradients = Buffer.from('model weights user@example.com data');
        expect(validateGradientPrivacy(gradients)).toBe(false);
    });

    it('rejects phone pattern in gradients', () => {
        const gradients = Buffer.from('weights (555) 123-4567 data');
        expect(validateGradientPrivacy(gradients)).toBe(false);
    });

    it('rejects sensitive metadata keys', () => {
        const gradients = Buffer.from([0x01, 0x02]);
        expect(
            validateGradientPrivacy(gradients, { patientId: 'p1', deviceId: 'd1' })
        ).toBe(false);
    });

    it('rejects patientName in metadata', () => {
        const gradients = Buffer.from([0x01]);
        expect(
            validateGradientPrivacy(gradients, { patientName: 'John Doe' })
        ).toBe(false);
    });

    it('accepts clean metadata', () => {
        const gradients = Buffer.from([0x01, 0x02]);
        expect(
            validateGradientPrivacy(gradients, { deviceId: 'd1', modelVersion: '1.0' })
        ).toBe(true);
    });
});
