import { describe, expect, it } from "vitest";
import {
  attributionAuditEventSchema,
  buildAttributionAuditEvent,
} from "@/lib/commerce-core/audit-contract";

function validEvent() {
  return {
    tenantId: "tenant-1",
    conversionId: "conv-1",
    previousStatus: "pending" as const,
    newStatus: "confirmed" as const,
    reason: "Provider confirmed the sale",
    actor: { type: "agent" as const, id: "performance-analyst" },
    occurredAt: new Date("2026-08-17T12:00:00.000Z"),
    idempotencyKey: "idem-1",
    correlationId: "corr-1",
    traceId: "trace-1",
  };
}

describe("attribution audit event contract", () => {
  it("accepts a fully populated event without an approvalId", () => {
    const event = buildAttributionAuditEvent(validEvent());
    expect(event.tenantId).toBe("tenant-1");
    expect(event.approvalId).toBeUndefined();
  });

  it("accepts an approvalId when the transition required approval", () => {
    const event = buildAttributionAuditEvent({ ...validEvent(), approvalId: "approval-1" });
    expect(event.approvalId).toBe("approval-1");
  });

  it("rejects an event missing tenantId", () => {
    const { tenantId: _tenantId, ...rest } = validEvent();
    expect(attributionAuditEventSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects an event missing the idempotency key", () => {
    const { idempotencyKey: _idempotencyKey, ...rest } = validEvent();
    expect(attributionAuditEventSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects an event missing correlationId or traceId", () => {
    const { correlationId: _correlationId, ...rest } = validEvent();
    expect(attributionAuditEventSchema.safeParse(rest).success).toBe(false);
    const { traceId: _traceId, ...rest2 } = validEvent();
    expect(attributionAuditEventSchema.safeParse(rest2).success).toBe(false);
  });

  it("rejects an event with an empty reason", () => {
    expect(
      attributionAuditEventSchema.safeParse({ ...validEvent(), reason: "" }).success,
    ).toBe(false);
  });

  it("rejects an invalid conversion status", () => {
    expect(
      attributionAuditEventSchema.safeParse({ ...validEvent(), newStatus: "cancelled" }).success,
    ).toBe(false);
  });

  it("rejects an unknown actor type", () => {
    expect(
      attributionAuditEventSchema.safeParse({
        ...validEvent(),
        actor: { type: "robot", id: "x" },
      }).success,
    ).toBe(false);
  });
});
