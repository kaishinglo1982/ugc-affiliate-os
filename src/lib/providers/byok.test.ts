import { describe, it, expect, afterEach } from "vitest";
import {
  BYOK_ENV_KEYS,
  credentialDisplayLabel,
  isByokConfigured,
  maskSecret,
  validateSecretFormat,
} from "./byok";

afterEach(() => {
  for (const envName of Object.values(BYOK_ENV_KEYS))
    delete process.env[envName];
});

describe("validateSecretFormat", () => {
  it("accepts plausible secrets for known providers", () => {
    expect(validateSecretFormat("OPENAI", "sk-abcdefghijklmnop")).toEqual({
      valid: true,
    });
    expect(validateSecretFormat("PEXELS", "abc12345")).toEqual({ valid: true });
  });

  it("rejects empty and too-short secrets", () => {
    expect(validateSecretFormat("PEXELS", "")).toEqual({
      valid: false,
      reason: "EMPTY",
    });
    expect(validateSecretFormat("PEXELS", "short")).toEqual({
      valid: false,
      reason: "TOO_SHORT",
    });
  });

  it("fails closed on unknown providers", () => {
    expect(validateSecretFormat("VIDNOZ", "x".repeat(50))).toEqual({
      valid: false,
      reason: "UNKNOWN_PROVIDER",
    });
  });
});

describe("isByokConfigured / credentialDisplayLabel", () => {
  it("detects env-based BYOK without exposing values", () => {
    expect(isByokConfigured("OPENAI")).toBe(false);
    process.env.OPENAI_API_KEY = "sk-super-secret-value-123456";
    expect(isByokConfigured("OPENAI")).toBe(true);
    expect(credentialDisplayLabel("OPENAI")).toBe(
      "env:OPENAI_API_KEY (masked)",
    );
    expect(credentialDisplayLabel("OPENAI")).not.toContain("sk-super");
  });

  it("reports unknown providers as not configured", () => {
    expect(credentialDisplayLabel("VIDNOZ")).toBe("not configured");
  });
});

describe("maskSecret", () => {
  it("masks the middle of a secret, keeping only a small hint", () => {
    const masked = maskSecret("sk-abcdefghijklmnop");
    expect(masked).toContain("•");
    expect(masked.length).toBeLessThan("sk-abcdefghijklmnop".length);
    expect(masked.endsWith("mnop")).toBe(true);
    expect(masked).not.toContain("abcdefghijk");
  });

  it("fully masks very short secrets", () => {
    expect(maskSecret("abc")).toBe("•••");
  });
});
