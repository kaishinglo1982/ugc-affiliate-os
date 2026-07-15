import { describe, it, expect } from "vitest";
import {
  validateAnalyticsEvent,
  deduplicateEvents,
  analyticsEventSchema,
} from "@/lib/analytics/event";

const baseValid = {
  workspaceId: "ws-1",
  eventType: "VIEW",
  platform: "TIKTOK",
  occurredAt: "2026-07-14T10:00:00.000Z",
  source: "PLATFORM_API",
  idempotencyKey: "evt-1",
};

describe("validateAnalyticsEvent", () => {
  it("accepts a well-formed event", () => {
    const res = validateAnalyticsEvent(baseValid);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.occurredAt).toBeInstanceOf(Date);
      expect(res.data.numericValue).toBeNull();
    }
  });

  it("rejects an unknown event type", () => {
    const res = validateAnalyticsEvent({ ...baseValid, eventType: "BOUNCE" });
    expect(res.success).toBe(false);
  });

  it("rejects a missing idempotency key", () => {
    const { idempotencyKey: _drop, ...rest } = baseValid;
    const res = validateAnalyticsEvent(rest);
    expect(res.success).toBe(false);
  });

  it("normalizes numeric values to string", () => {
    const res = validateAnalyticsEvent({ ...baseValid, numericValue: 12.5 });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.numericValue).toBe("12.5");
  });

  it("rejects an invalid currency code", () => {
    const res = validateAnalyticsEvent({ ...baseValid, currency: "EUROS" });
    expect(res.success).toBe(false);
  });
});

describe("deduplicateEvents", () => {
  it("collapses duplicate idempotency keys, keeping the first", () => {
    const events = [
      { idempotencyKey: "a", v: 1 },
      { idempotencyKey: "b", v: 2 },
      { idempotencyKey: "a", v: 99 },
    ];
    const { unique, duplicates } = deduplicateEvents(events);
    expect(unique).toHaveLength(2);
    expect(duplicates).toHaveLength(1);
    expect(unique[0].v).toBe(1);
  });
});

describe("analyticsEventSchema", () => {
  it("parses a full payload", () => {
    const parsed = analyticsEventSchema.safeParse({
      ...baseValid,
      numericValue: "10.00",
      currency: "EUR",
      externalEventId: "ext-1",
    });
    expect(parsed.success).toBe(true);
  });
});
