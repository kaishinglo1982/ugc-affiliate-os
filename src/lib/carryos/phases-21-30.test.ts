import { describe, expect, it } from "vitest";
import {
  outboxEventSchema,
  idempotencyRecordSchema,
  retryPolicySchema,
  approvalBoundarySchema,
  publishingRequestSchema,
  attributionEventSchema,
  analyticsSyncResultSchema,
  experimentAssignmentSchema,
  opportunityPrioritySchema,
  operationalHealthSchema,
  isOutboxPublishable,
  isIdempotencyConflict,
  calculateRetryDelay,
  isApprovalSatisfied,
  canPublish,
  isAttributionEventValid,
  isAnalyticsSyncConsistent,
  isExperimentAssignmentStable,
  calculateOpportunityPriority,
  isOperationallyHealthy,
} from "./phases-21-30";

describe("CarryOS UGC phases 21-30 governance contracts", () => {
  const now = new Date("2026-09-22T00:00:00.000Z");

  it("validates an outbox event and requires idempotency", () => {
    const event = outboxEventSchema.parse({
      eventId: "evt-1", workspaceId: "w1", eventType: "PUBLISHED",
      aggregateId: "post-1", correlationId: "corr-1", idempotencyKey: "publish:post-1",
      occurredAt: now, payload: { status: "ok" },
    });
    expect(isOutboxPublishable(event)).toBe(true);
  });

  it("detects idempotency conflicts without treating a replay as a conflict", () => {
    expect(isIdempotencyConflict("hash-a", "hash-a")).toBe(false);
    expect(isIdempotencyConflict("hash-a", "hash-b")).toBe(true);
    expect(idempotencyRecordSchema.parse({
      workspaceId: "w1", key: "k1", operation: "publish", requestHash: "hash-a",
    })).toBeTruthy();
  });

  it("caps exponential retry delay", () => {
    const policy = retryPolicySchema.parse({
      maxAttempts: 5, initialDelayMs: 100, maxDelayMs: 1000,
      backoffMultiplier: 2, retryableFailureDomains: ["API", "PROVIDER"],
    });
    expect(calculateRetryDelay(policy, 1)).toBe(100);
    expect(calculateRetryDelay(policy, 4)).toBe(800);
    expect(calculateRetryDelay(policy, 5)).toBe(1000);
    expect(calculateRetryDelay(policy, 0)).toBe(0);
  });

  it("requires all approvals and rejects expired approvals", () => {
    const base = approvalBoundarySchema.parse({
      workspaceId: "w1", action: "publish", requestedBy: "u1",
      requiredApprovers: 2, approvedApprovers: 2,
      expiresAt: new Date("2026-09-23T00:00:00.000Z"),
    });
    expect(isApprovalSatisfied(base, now)).toBe(true);
    expect(isApprovalSatisfied({ ...base, approvedApprovers: 1 }, now)).toBe(false);
    expect(isApprovalSatisfied({ ...base, expiresAt: new Date("2026-09-21T00:00:00.000Z") }, now)).toBe(false);
  });

  it("fails publishing closed-loop safety checks", () => {
    const base = publishingRequestSchema.parse({
      workspaceId: "w1", accountId: "a1", postId: "p1", platform: "TIKTOK",
      disclosurePresent: true, approved: true, killSwitchEnabled: false,
    });
    expect(canPublish(base)).toBe(true);
    expect(canPublish({ ...base, disclosurePresent: false })).toBe(false);
    expect(canPublish({ ...base, killSwitchEnabled: true })).toBe(false);
  });

  it("keeps attribution and analytics validation tenant-scoped", () => {
    const attribution = attributionEventSchema.parse({
      workspaceId: "w1", linkId: "link-1", eventId: "evt-1", occurredAt: now,
    });
    expect(isAttributionEventValid(attribution)).toBe(true);

    const sync = analyticsSyncResultSchema.parse({
      workspaceId: "w1", provider: "provider", accountId: "a1",
      syncedAt: now, recordsRead: 10, recordsWritten: 10,
    });
    expect(isAnalyticsSyncConsistent(sync)).toBe(true);
    expect(isAnalyticsSyncConsistent({ ...sync, recordsWritten: 11 })).toBe(false);
  });

  it("keeps experiment assignments deterministic by explicit assignment key", () => {
    const assignment = experimentAssignmentSchema.parse({
      workspaceId: "w1", experimentId: "exp-1", subjectId: "subject-1",
      variantId: "variant-a", assignmentKey: "exp-1:subject-1",
    });
    expect(isExperimentAssignmentStable(assignment)).toBe(true);
  });

  it("calculates a bounded opportunity priority score", () => {
    const input = opportunityPrioritySchema.parse({
      workspaceId: "w1", opportunityId: "opp-1", expectedValueMinor: 50000,
      confidence: 0.8, effortScore: 0.2, riskScore: 0.1, priorityScore: 0,
    });
    const score = calculateOpportunityPriority(input);
    expect(score).toBeCloseTo(0.335);
    expect(Number.isFinite(score)).toBe(true);
  });

  it("requires correlation-aware healthy operational checks", () => {
    const health = operationalHealthSchema.parse({
      workspaceId: "w1", component: "ugc-runtime", status: "HEALTHY",
      checkedAt: now, correlationId: "corr-1", details: { latencyMs: 120 },
    });
    expect(isOperationallyHealthy(health)).toBe(true);
    expect(isOperationallyHealthy({ ...health, status: "DEGRADED" })).toBe(false);
  });
});
