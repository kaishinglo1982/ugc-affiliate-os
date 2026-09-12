import { maskSecret } from "@/lib/encryption/aes";

/**
 * BYOK secret handling (Phase 80.2 consolidation).
 *
 * Rules:
 * - Server-side only. Plaintext secrets never reach the client; UI shows
 *   masked values (maskSecret) or the presence of a configured credential.
 * - Env-based BYOK: provider → env var name. DB-backed credentials live in
 *   EncryptedCredential (AES-256-GCM); key rotation is policy-driven.
 * - Format validation is per provider and additive: unknown providers fail
 *   closed (never accept malformed secrets).
 */

export const BYOK_ENV_KEYS: Readonly<Record<string, string>> = {
  HIGGSFIELD: "HIGGSFIELD_API_KEY",
  ELEVENLABS: "ELEVENLABS_API_KEY",
  OPENAI: "OPENAI_API_KEY",
  ANTHROPIC: "ANTHROPIC_API_KEY",
  GOOGLE: "GOOGLE_GENERATIVE_AI_API_KEY",
  MISTRAL: "MISTRAL_API_KEY",
  OPENROUTER: "OPENROUTER_API_KEY",
  HUGGINGFACE: "HUGGINGFACE_API_KEY",
  PEXELS: "PEXELS_API_KEY",
};

const MIN_LENGTH: Readonly<Record<string, number>> = {
  HIGGSFIELD: 8,
  ELEVENLABS: 8,
  OPENAI: 16,
  ANTHROPIC: 16,
  GOOGLE: 10,
  MISTRAL: 16,
  OPENROUTER: 16,
  HUGGINGFACE: 10,
  PEXELS: 8,
};

export type SecretFormatVerdict =
  | { valid: true }
  | { valid: false; reason: "UNKNOWN_PROVIDER" }
  | { valid: false; reason: "TOO_SHORT" }
  | { valid: false; reason: "EMPTY" };

export function validateSecretFormat(
  provider: string,
  secret: string,
): SecretFormatVerdict {
  const min = MIN_LENGTH[provider];
  if (min === undefined) return { valid: false, reason: "UNKNOWN_PROVIDER" };
  if (secret.length === 0) return { valid: false, reason: "EMPTY" };
  if (secret.length < min) return { valid: false, reason: "TOO_SHORT" };
  return { valid: true };
}

export function isByokConfigured(provider: string): boolean {
  const envName = BYOK_ENV_KEYS[provider];
  if (!envName) return false;
  const value = process.env[envName];
  return typeof value === "string" && value.length > 0;
}

export function credentialDisplayLabel(provider: string): string {
  if (isByokConfigured(provider)) {
    const envName = BYOK_ENV_KEYS[provider];
    return `env:${envName} (masked)`;
  }
  return "not configured";
}

export { maskSecret };
