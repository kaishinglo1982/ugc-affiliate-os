import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

/**
 * AES-256-GCM encryption for provider credentials at rest.
 * The master key comes exclusively from CREDENTIAL_ENCRYPTION_KEY (server-only env var)
 * and is never sent to the client, logged, or embedded in a bundle.
 */

const ALGORITHM = "aes-256-gcm";

function getMasterKey(): Buffer {
  const hex = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "CREDENTIAL_ENCRYPTION_KEY must be set to a 64-character hex string (32 bytes)",
    );
  }
  return Buffer.from(hex, "hex");
}

export interface EncryptedPayload {
  cipherText: string;
  iv: string;
  authTag: string;
}

export function encryptSecret(plainText: string): EncryptedPayload {
  const key = getMasterKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    cipherText: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

export function decryptSecret(payload: EncryptedPayload): string {
  const key = getMasterKey();
  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(payload.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.cipherText, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

/** Returns a masked preview safe for UI display, e.g. "sk-••••••••ab12". */
export function maskSecret(plainText: string): string {
  if (plainText.length <= 6) return "•".repeat(plainText.length);
  const prefix = plainText.slice(0, Math.min(3, plainText.length - 4));
  const suffix = plainText.slice(-4);
  return `${prefix}${"•".repeat(6)}${suffix}`;
}
