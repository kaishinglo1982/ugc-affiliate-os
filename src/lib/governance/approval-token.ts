import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Single-use approval tokens (Phase 80.1 consolidation, ported from
 * one-user-ugc-affiliate-center ADR-0005 "approval-token-hash").
 *
 * The plaintext token is handed to the caller exactly once at issue time;
 * only its HMAC-SHA256 hash is persisted (Approval.approvalTokenHash,
 * unique). Consumption is enforced by the unique hash together with an
 * atomic UPDATE (see consume-approval.ts).
 */

export function generateApprovalToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashApprovalToken(token: string, secret: string): string {
  return createHmac("sha256", secret).update(token).digest("hex");
}

export function verifyApprovalToken(
  token: string,
  tokenHash: string,
  secret: string,
): boolean {
  const candidate = Buffer.from(hashApprovalToken(token, secret), "hex");
  const expected = Buffer.from(tokenHash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

export function getApprovalTokenSecret(): string {
  const secret = process.env.APPROVAL_TOKEN_SECRET ?? process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "APPROVAL_TOKEN_SECRET (or AUTH_SECRET) must be set to at least 16 characters",
    );
  }
  return secret;
}
