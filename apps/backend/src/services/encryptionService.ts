/**
 * Encryption Service
 *
 * AES-256-GCM encryption for PHI data at rest.
 * Handles key generation, rotation, and authenticated encryption/decryption.
 *
 * Requirements: 23.1 — Server-side encryption of patient data
 */

import crypto from 'crypto';

// ─── Constants ──────────────────────────────────────────────────────────────

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit auth tag
const KEY_LENGTH = 32; // 256-bit key
const SALT_LENGTH = 16;
const PBKDF2_ITERATIONS = 100_000;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EncryptedPayload {
    /** Base64-encoded ciphertext */
    ciphertext: string;
    /** Base64-encoded initialization vector */
    iv: string;
    /** Base64-encoded authentication tag */
    authTag: string;
    /** Key version used for encryption */
    keyVersion: string;
    /** Algorithm identifier */
    algorithm: string;
}

export interface EncryptionKey {
    id: string;
    key: Buffer;
    version: string;
    createdAt: Date;
    rotatedAt?: Date;
    isActive: boolean;
}

// ─── Key Management ─────────────────────────────────────────────────────────

/** In-memory key store. In production, use AWS KMS / GCP KMS / HashiCorp Vault. */
const keyStore: Map<string, EncryptionKey> = new Map();
let activeKeyVersion: string | null = null;
let keyCounter = 0; // Ensures unique versions even within the same millisecond

/**
 * Generate a new encryption key.
 */
export function generateKey(): EncryptionKey {
    const key: EncryptionKey = {
        id: crypto.randomUUID(),
        key: crypto.randomBytes(KEY_LENGTH),
        version: `v${Date.now()}-${++keyCounter}`,
        createdAt: new Date(),
        isActive: true,
    };

    // Deactivate previous active key
    if (activeKeyVersion) {
        const prev = keyStore.get(activeKeyVersion);
        if (prev) {
            prev.isActive = false;
            prev.rotatedAt = new Date();
        }
    }

    keyStore.set(key.version, key);
    activeKeyVersion = key.version;
    return key;
}

/**
 * Derive a key from a passphrase using PBKDF2.
 */
export function deriveKey(passphrase: string, salt?: Buffer): { key: Buffer; salt: Buffer } {
    const usedSalt = salt || crypto.randomBytes(SALT_LENGTH);
    const key = crypto.pbkdf2Sync(passphrase, usedSalt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512');
    return { key, salt: usedSalt };
}

/**
 * Get the currently active encryption key.
 * Auto-generates one if none exists.
 */
export function getActiveKey(): EncryptionKey {
    if (!activeKeyVersion || !keyStore.has(activeKeyVersion)) {
        return generateKey();
    }
    return keyStore.get(activeKeyVersion)!;
}

/**
 * Get a specific key by version (for decryption of older data).
 */
export function getKeyByVersion(version: string): EncryptionKey | null {
    return keyStore.get(version) || null;
}

/**
 * Rotate the active key. Old key remains for decryption, new key for encryption.
 */
export function rotateKey(): EncryptionKey {
    return generateKey();
}

// ─── Encryption / Decryption ────────────────────────────────────────────────

/**
 * Encrypt plaintext data using AES-256-GCM.
 *
 * @param plaintext - The data to encrypt (string or Buffer)
 * @param aad - Optional additional authenticated data (not encrypted, but authenticated)
 * @returns Encrypted payload with ciphertext, IV, auth tag, and key version
 */
export function encrypt(
    plaintext: string | Buffer,
    aad?: string
): EncryptedPayload {
    const activeKey = getActiveKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, activeKey.key, iv, {
        authTagLength: AUTH_TAG_LENGTH,
    });

    if (aad) {
        cipher.setAAD(Buffer.from(aad, 'utf8'));
    }

    const data = typeof plaintext === 'string' ? Buffer.from(plaintext, 'utf8') : plaintext;
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
        ciphertext: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        keyVersion: activeKey.version,
        algorithm: ALGORITHM,
    };
}

/**
 * Decrypt an encrypted payload.
 *
 * @param payload - The encrypted payload
 * @param aad - Optional additional authenticated data (must match encryption)
 * @returns Decrypted plaintext as a string
 * @throws Error if decryption fails (tampering, wrong key, etc.)
 */
export function decrypt(
    payload: EncryptedPayload,
    aad?: string
): string {
    const encKey = getKeyByVersion(payload.keyVersion);
    if (!encKey) {
        throw new Error(`Encryption key version ${payload.keyVersion} not found. Key may have been purged.`);
    }

    const iv = Buffer.from(payload.iv, 'base64');
    const ciphertext = Buffer.from(payload.ciphertext, 'base64');
    const authTag = Buffer.from(payload.authTag, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, encKey.key, iv, {
        authTagLength: AUTH_TAG_LENGTH,
    });

    decipher.setAuthTag(authTag);

    if (aad) {
        decipher.setAAD(Buffer.from(aad, 'utf8'));
    }

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
}

/**
 * Encrypt a JSON-serializable object.
 */
export function encryptJSON(data: any, aad?: string): EncryptedPayload {
    return encrypt(JSON.stringify(data), aad);
}

/**
 * Decrypt an encrypted payload back to a parsed JSON object.
 */
export function decryptJSON<T = any>(payload: EncryptedPayload, aad?: string): T {
    const plaintext = decrypt(payload, aad);
    return JSON.parse(plaintext) as T;
}

// ─── Hash Utilities ─────────────────────────────────────────────────────────

/**
 * Create a SHA-256 hash of data (for integrity checks, not passwords).
 */
export function hash(data: string | Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Create an HMAC-SHA256 for message authentication.
 */
export function hmac(data: string | Buffer, key?: Buffer): string {
    const hmacKey = key || getActiveKey().key;
    return crypto.createHmac('sha256', hmacKey).update(data).digest('hex');
}

/**
 * Generate a cryptographically secure random token.
 */
export function generateToken(byteLength = 32): string {
    return crypto.randomBytes(byteLength).toString('hex');
}

/**
 * Reset the key store (for testing only).
 */
export function _resetKeyStore(): void {
    keyStore.clear();
    activeKeyVersion = null;
    keyCounter = 0;
}
