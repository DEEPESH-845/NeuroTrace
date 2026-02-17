/**
 * Encryption Service Tests
 *
 * Tests AES-256-GCM encryption, key management, and utility functions.
 */

import {
    encrypt,
    decrypt,
    encryptJSON,
    decryptJSON,
    generateKey,
    rotateKey,
    hash,
    hmac,
    generateToken,
    _resetKeyStore,
} from '../services/encryptionService';

beforeEach(() => {
    _resetKeyStore();
});

describe('encrypt / decrypt', () => {
    it('encrypts and decrypts a string', () => {
        generateKey();
        const plaintext = 'Hello, NeuroTrace!';
        const payload = encrypt(plaintext);
        const result = decrypt(payload);
        expect(result).toBe(plaintext);
    });

    it('produces different ciphertexts for same plaintext (random IV)', () => {
        generateKey();
        const plaintext = 'same data';
        const p1 = encrypt(plaintext);
        const p2 = encrypt(plaintext);
        expect(p1.ciphertext).not.toBe(p2.ciphertext);
        expect(p1.iv).not.toBe(p2.iv);
    });

    it('includes algorithm and key version in payload', () => {
        const key = generateKey();
        const payload = encrypt('data');
        expect(payload.algorithm).toBe('aes-256-gcm');
        expect(payload.keyVersion).toBe(key.version);
    });

    it('encrypts and decrypts with AAD', () => {
        generateKey();
        const payload = encrypt('secret data', 'patient-123');
        const result = decrypt(payload, 'patient-123');
        expect(result).toBe('secret data');
    });

    it('fails decryption with wrong AAD', () => {
        generateKey();
        const payload = encrypt('secret data', 'patient-123');
        expect(() => decrypt(payload, 'wrong-aad')).toThrow();
    });

    it('fails decryption with tampered ciphertext', () => {
        generateKey();
        const payload = encrypt('data');
        // Tamper with ciphertext
        const tampered = Buffer.from(payload.ciphertext, 'base64');
        tampered[0] ^= 0xff;
        payload.ciphertext = tampered.toString('base64');
        expect(() => decrypt(payload)).toThrow();
    });

    it('fails decryption with unknown key version', () => {
        generateKey();
        const payload = encrypt('data');
        payload.keyVersion = 'v-nonexistent';
        expect(() => decrypt(payload)).toThrow(/not found/);
    });

    it('encrypts empty string', () => {
        generateKey();
        const payload = encrypt('');
        expect(decrypt(payload)).toBe('');
    });

    it('handles large data', () => {
        generateKey();
        const large = 'x'.repeat(100_000);
        const payload = encrypt(large);
        expect(decrypt(payload)).toBe(large);
    });

    it('handles Unicode text', () => {
        generateKey();
        const unicode = '日本語テスト 🧠 Ñoño αβγ';
        const payload = encrypt(unicode);
        expect(decrypt(payload)).toBe(unicode);
    });
});

describe('encryptJSON / decryptJSON', () => {
    it('round-trips a JSON object', () => {
        generateKey();
        const data = { patientId: 'p1', metrics: { speech: 120, facial: 0.85 } };
        const payload = encryptJSON(data);
        const result = decryptJSON(payload);
        expect(result).toEqual(data);
    });

    it('round-trips an array', () => {
        generateKey();
        const data = [1, 'two', { three: 3 }];
        const payload = encryptJSON(data);
        expect(decryptJSON(payload)).toEqual(data);
    });
});

describe('key management', () => {
    it('auto-generates key on first encrypt', () => {
        const payload = encrypt('auto-key');
        expect(payload.keyVersion).toBeTruthy();
        expect(decrypt(payload)).toBe('auto-key');
    });

    it('rotateKey creates a new active key', () => {
        const k1 = generateKey();
        const k2 = rotateKey();
        expect(k2.version).not.toBe(k1.version);
        expect(k2.isActive).toBe(true);
    });

    it('data encrypted with old key is still decryptable after rotation', () => {
        generateKey();
        const payload = encrypt('before rotation');
        rotateKey();
        const result = decrypt(payload);
        expect(result).toBe('before rotation');
    });

    it('new encryptions use the new key after rotation', () => {
        const k1 = generateKey();
        rotateKey();
        const payload = encrypt('after rotation');
        expect(payload.keyVersion).not.toBe(k1.version);
    });
});

describe('hash / hmac / generateToken', () => {
    it('produces consistent SHA-256 hash', () => {
        const h1 = hash('test');
        const h2 = hash('test');
        expect(h1).toBe(h2);
        expect(h1).toHaveLength(64); // 256 bits = 64 hex chars
    });

    it('produces different hashes for different data', () => {
        expect(hash('a')).not.toBe(hash('b'));
    });

    it('produces consistent HMAC', () => {
        generateKey();
        const h1 = hmac('test');
        const h2 = hmac('test');
        expect(h1).toBe(h2);
    });

    it('generateToken produces unique tokens', () => {
        const t1 = generateToken();
        const t2 = generateToken();
        expect(t1).not.toBe(t2);
        expect(t1).toHaveLength(64); // 32 bytes = 64 hex chars
    });

    it('generateToken respects custom length', () => {
        const token = generateToken(16);
        expect(token).toHaveLength(32); // 16 bytes = 32 hex chars
    });
});
