import { describe, it, expect } from "vitest";
import {
  PUBLISH_MAX_ATTEMPTS,
  backoffMs,
  isDeadLetter,
  nextRetryAt,
  classifyAttempt,
} from "@/lib/domain/publishing/job-policy";

describe("publish job back-off", () => {
  it("grows exponentially from the base and caps at one hour", () => {
    expect(backoffMs(0)).toBe(30_000);
    expect(backoffMs(1)).toBe(30_000);
    expect(backoffMs(2)).toBe(60_000);
    expect(backoffMs(3)).toBe(120_000);
    expect(backoffMs(50)).toBe(3_600_000);
  });
});

describe("dead-letter classification", () => {
  it("never dead-letters a success", () => {
    expect(classifyAttempt(true, 0)).toBe("succeeded");
    expect(classifyAttempt(true, PUBLISH_MAX_ATTEMPTS)).toBe("succeeded");
  });

  it("keeps retrying until the last allowed attempt", () => {
    for (let attempt = 0; attempt < PUBLISH_MAX_ATTEMPTS - 1; attempt++) {
      expect(classifyAttempt(false, attempt)).toBe("retryable");
      expect(isDeadLetter(attempt)).toBe(false);
    }
  });

  it("dead-letters once attempts reach the maximum", () => {
    expect(isDeadLetter(PUBLISH_MAX_ATTEMPTS)).toBe(true);
    expect(classifyAttempt(false, PUBLISH_MAX_ATTEMPTS - 1)).toBe("dead");
  });
});

describe("nextRetryAt", () => {
  it("offsets now by the back-off for the upcoming attempt", () => {
    const now = new Date("2026-07-14T00:00:00.000Z");
    const next = nextRetryAt(1, now);
    expect(next.getTime()).toBe(now.getTime() + backoffMs(1));
  });
});
