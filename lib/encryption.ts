/**
 * lib/encryption.ts
 *
 * AES-256-GCM encryption utilities for PrivateStream Mezo.
 *
 * Privacy-First Architecture Note:
 * ─────────────────────────────────────────────────────────────────────────────
 * This module provides privacy-preserving encrypted metadata storage.
 *
 * Current implementation:
 *   - AES-256-GCM with random IV per encryption
 *   - Master key stored server-side only (never sent to frontend)
 *   - Decryption happens exclusively inside server-side API routes
 *   - Encrypted ciphertext stored on IPFS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * SECURITY: This module must ONLY be imported in server-side code.
 *           Never import in client components or pages.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;   // 96-bit IV recommended for GCM
const TAG_LENGTH = 16;  // 128-bit auth tag

/**
 * Returns the 32-byte master key from environment.
 * Throws if not configured — prevents silent failures.
 */
function getMasterKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_MASTER_KEY;
  if (!keyHex) {
    throw new Error("ENCRYPTION_MASTER_KEY environment variable is not set");
  }
  const key = Buffer.from(keyHex, "hex");
  if (key.length !== 32) {
    throw new Error(
      `ENCRYPTION_MASTER_KEY must be 32 bytes (64 hex chars). Got ${key.length} bytes.`
    );
  }
  return key;
}

export interface EncryptedPayload {
  ciphertext: string; // base64
  iv: string;         // base64
  authTag: string;    // base64
}

/**
 * Encrypts plaintext using AES-256-GCM.
 * @param plaintext  The string to encrypt
 * @returns          Encrypted payload with ciphertext, IV, and auth tag
 */
export function encryptText(plaintext: string): EncryptedPayload {
  const key = getMasterKey();
  const iv  = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString("base64"),
    iv:         iv.toString("base64"),
    authTag:    authTag.toString("base64"),
  };
}

/**
 * Decrypts an AES-256-GCM encrypted payload.
 * @param payload  The encrypted payload from encryptText()
 * @returns        Decrypted plaintext string
 * @throws         If decryption fails (wrong key, tampered data, etc.)
 */
export function decryptText(payload: EncryptedPayload): string {
  const key        = getMasterKey();
  const iv         = Buffer.from(payload.iv, "base64");
  const authTag    = Buffer.from(payload.authTag, "base64");
  const ciphertext = Buffer.from(payload.ciphertext, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/**
 * Generates a cryptographically secure random 32-byte hex key.
 * Use this to generate ENCRYPTION_MASTER_KEY for .env.local.
 *
 * Run: node -e "const {randomBytes}=require('crypto'); console.log(randomBytes(32).toString('hex'))"
 */
export function generateMasterKey(): string {
  return randomBytes(32).toString("hex");
}
