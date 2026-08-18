import { describe, it, expect } from "vitest";
import {
  assessCredentialHealth,
  nextHealthStatus,
  DEFAULT_ROTATION_MAX_AGE_DAYS,
} from "./health";

const now = new Date("2026-08-18T00:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);

describe("assessCredentialHealth", () => {
  it("rates a recently used, recently rotated credential as healthy", () => {
    const verdict = assessCredentialHealth({
      healthStatus: "UNKNOWN",
      lastUsedAt: daysAgo(1),
      lastRotatedAt: daysAgo(10),
      now,
    });
    expect(verdict).toEqual({ healthy: true, reason: "CURRENT" });
    expect(nextHealthStatus(verdict)).toBe("HEALTHY");
  });

  it("fails closed on unhealthy credentials", () => {
    const verdict = assessCredentialHealth({
      healthStatus: "UNHEALTHY",
      lastUsedAt: daysAgo(1),
      lastRotatedAt: daysAgo(1),
      now,
    });
    expect(verdict).toEqual({ healthy: false, reason: "UNHEALTHY" });
    expect(nextHealthStatus(verdict)).toBe("UNHEALTHY");
  });

  it("requires rotation after the maximum age", () => {
    const verdict = assessCredentialHealth({
      healthStatus: "HEALTHY",
      lastUsedAt: daysAgo(1),
      lastRotatedAt: daysAgo(DEFAULT_ROTATION_MAX_AGE_DAYS + 1),
      now,
    });
    expect(verdict).toEqual({ healthy: false, reason: "ROTATION_OVERDUE" });
  });

  it("flags credentials that were never rotated (fail-closed)", () => {
    const verdict = assessCredentialHealth({
      healthStatus: "UNKNOWN",
      lastUsedAt: daysAgo(1),
      lastRotatedAt: null,
      now,
    });
    expect(verdict).toEqual({ healthy: false, reason: "ROTATION_OVERDUE" });
  });

  it("flags long-unused credentials as stale", () => {
    const verdict = assessCredentialHealth({
      healthStatus: "HEALTHY",
      lastUsedAt: daysAgo(200),
      lastRotatedAt: daysAgo(10),
      now,
    });
    expect(verdict).toEqual({ healthy: false, reason: "NEVER_USED_STALE" });
  });
});
