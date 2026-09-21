import { describe, expect, it } from "vitest";
import { assertSameWorkspace, buildOutboxEvent, createRequestHash, shouldRetry, CarryOSWorkspaceBoundaryError } from "./event-boundary";
import { retryPolicySchema } from "./phases-21-30";

describe("CarryOS event boundary", () => {
  it("rejects cross-workspace access", () => {
    expect(() => assertSameWorkspace("w1", "w2")).toThrow(CarryOSWorkspaceBoundaryError);
  });

  it("builds an event with generated identity", () => {
    const event = buildOutboxEvent({
      workspaceId: "w1", eventType: "PUBLISHED", aggregateId: "post-1",
      correlationId: "corr-1", idempotencyKey: "publish:post-1", payload: {},
    });
    expect(event.eventId).toBeTruthy();
    expect(event.workspaceId).toBe("w1");
  });

  it("creates stable request hashes", () => {
    expect(createRequestHash({ a: 1 })).toBe(createRequestHash({ a: 1 }));
    expect(createRequestHash({ a: 1 })).not.toBe(createRequestHash({ a: 2 }));
  });

  it("only retries eligible attempts and failure domains", () => {
    const policy = retryPolicySchema.parse({
      maxAttempts: 3, initialDelayMs: 100, maxDelayMs: 500,
      backoffMultiplier: 2, retryableFailureDomains: ["API"],
    });
    expect(shouldRetry(policy, 1, "API")).toBe(true);
    expect(shouldRetry(policy, 3, "API")).toBe(false);
    expect(shouldRetry(policy, 1, "DATABASE")).toBe(false);
  });
});
