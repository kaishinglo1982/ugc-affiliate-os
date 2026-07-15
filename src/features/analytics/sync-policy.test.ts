import { describe, it, expect } from "vitest";
import { syncRetryPolicy, backoffDelay } from "@/features/analytics/sync-policy";

const now = new Date("2026-07-14T00:00:00.000Z");

describe("analytics sync retry policy", () => {
  it("never retries reauth or unsupported metric", () => {
    expect(syncRetryPolicy("REAUTH_REQUIRED", 0, 5, now).kind).toBe("no_retry");
    expect(syncRetryPolicy("UNSUPPORTED_METRIC", 0, 5, now).kind).toBe("no_retry");
  });

  it("never retries authentication/account errors", () => {
    expect(syncRetryPolicy("AUTHENTICATION_FAILED", 0, 5, now).kind).toBe("no_retry");
    expect(syncRetryPolicy("ACCOUNT_RESTRICTED", 0, 5, now).kind).toBe("no_retry");
    expect(syncRetryPolicy("POST_NOT_FOUND", 0, 5, now).kind).toBe("no_retry");
  });

  it("retries rate-limit / network with back-off and schedules a retry", () => {
    const d = syncRetryPolicy("RATE_LIMITED", 0, 5, now);
    expect(d.kind).toBe("retry");
    expect(d.nextAttemptAt).not.toBeNull();
    expect(d.nextAttemptAt!.getTime()).toBe(now.getTime() + 60_000);
  });

  it("dead-letters after max attempts", () => {
    expect(syncRetryPolicy("NETWORK_ERROR", 4, 5, now).kind).toBe("dead");
    expect(syncRetryPolicy("NETWORK_ERROR", 4, 5, now).nextAttemptAt).toBeNull();
  });

  it("back-off grows and is capped", () => {
    expect(backoffDelay(30_000, 0)).toBe(30_000);
    expect(backoffDelay(30_000, 1)).toBe(60_000);
    expect(backoffDelay(30_000, 20)).toBe(3_600_000);
  });
});
