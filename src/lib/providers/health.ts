import type { CredentialHealth } from "@/generated/prisma/client";

/**
 * Credential health and rotation policy (Phase 80.2 consolidation).
 * Pure decision logic; DB writes happen in the credential service.
 *
 * Fail-closed: anything unknown or unusually old is flagged for rotation;
 * UNHEALTHY credentials are never considered usable by callers.
 */

export type CredentialHealthInput = {
  healthStatus: CredentialHealth;
  lastUsedAt: Date | null;
  lastRotatedAt: Date | null;
  now?: Date;
};

export type RotationVerdict =
  | { healthy: true; reason: "CURRENT" }
  | { healthy: false; reason: "UNHEALTHY" }
  | { healthy: false; reason: "NEVER_USED_STALE" }
  | { healthy: false; reason: "ROTATION_OVERDUE" };

export const DEFAULT_ROTATION_MAX_AGE_DAYS = 90;
export const DEFAULT_STALE_IF_UNUSED_DAYS = 180;

export function daysBetween(from: Date, to: Date): number {
  return Math.max(0, (to.getTime() - from.getTime()) / 86_400_000);
}

export function assessCredentialHealth(
  input: CredentialHealthInput,
): RotationVerdict {
  if (input.healthStatus === "UNHEALTHY")
    return { healthy: false, reason: "UNHEALTHY" };
  const now = input.now ?? new Date();

  if (!input.lastRotatedAt) {
    // Never rotated: treat as unknown → rotation required (fail-closed).
    return { healthy: false, reason: "ROTATION_OVERDUE" };
  }
  if (daysBetween(input.lastRotatedAt, now) > DEFAULT_ROTATION_MAX_AGE_DAYS) {
    return { healthy: false, reason: "ROTATION_OVERDUE" };
  }
  if (
    !input.lastUsedAt ||
    daysBetween(input.lastUsedAt, now) > DEFAULT_STALE_IF_UNUSED_DAYS
  ) {
    return { healthy: false, reason: "NEVER_USED_STALE" };
  }
  return { healthy: true, reason: "CURRENT" };
}

export function nextHealthStatus(verdict: RotationVerdict): CredentialHealth {
  switch (verdict.reason) {
    case "CURRENT":
      return "HEALTHY";
    case "UNHEALTHY":
      return "UNHEALTHY";
    case "ROTATION_OVERDUE":
      return "ROTATION_REQUIRED";
    case "NEVER_USED_STALE":
      return "ROTATION_REQUIRED";
  }
}
