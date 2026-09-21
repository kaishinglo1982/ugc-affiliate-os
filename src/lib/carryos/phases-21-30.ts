import { z } from "zod";

export const phase21EventTypes = [
  "PRODUCT_RESEARCH_COMPLETED",
  "OPPORTUNITY_SCORED",
  "CONTENT_APPROVED",
  "MEDIA_COMPLETED",
  "PUBLISH_REQUESTED",
  "PUBLISHED",
  "ATTRIBUTION_RECORDED",
  "ANALYTICS_SYNCED",
  "WORKFLOW_FAILED",
] as const;
export type Phase21EventType = (typeof phase21EventTypes)[number];

export const outboxEventSchema = z.object({
  eventId: z.string().min(1),
  workspaceId: z.string().min(1),
  eventType: z.enum(phase21EventTypes),
  aggregateId: z.string().min(1),
  correlationId: z.string().min(1),
  idempotencyKey: z.string().min(1),
  occurredAt: z.coerce.date(),
  payload: z.record(z.string(), z.unknown()),
});
export type OutboxEvent = z.infer<typeof outboxEventSchema>;

export const idempotencyRecordSchema = z.object({
  workspaceId: z.string().min(1),
  key: z.string().min(1).max(200),
  operation: z.string().min(1).max(200),
  requestHash: z.string().min(1),
});
export type IdempotencyRecord = z.infer<typeof idempotencyRecordSchema>;

export const retryPolicySchema = z.object({
  maxAttempts: z.number().int().min(1).max(20),
  initialDelayMs: z.number().int().nonnegative(),
  maxDelayMs: z.number().int().nonnegative(),
  backoffMultiplier: z.number().min(1).max(10),
  retryableFailureDomains: z.array(z.string().min(1)).max(50),
});
export type RetryPolicy = z.infer<typeof retryPolicySchema>;

export const approvalBoundarySchema = z.object({
  workspaceId: z.string().min(1),
  action: z.string().min(1),
  requestedBy: z.string().min(1),
  approvalId: z.string().min(1).optional(),
  requiredApprovers: z.number().int().min(1).max(20),
  approvedApprovers: z.number().int().min(0).max(20),
  expiresAt: z.coerce.date().optional(),
});
export type ApprovalBoundary = z.infer<typeof approvalBoundarySchema>;

export const publishingRequestSchema = z.object({
  workspaceId: z.string().min(1),
  accountId: z.string().min(1),
  postId: z.string().min(1),
  platform: z.string().min(1),
  scheduledAt: z.coerce.date().optional(),
  disclosurePresent: z.boolean(),
  approved: z.boolean(),
  killSwitchEnabled: z.boolean(),
});
export type PublishingRequest = z.infer<typeof publishingRequestSchema>;

export const attributionEventSchema = z.object({
  workspaceId: z.string().min(1),
  linkId: z.string().min(1),
  eventId: z.string().min(1),
  occurredAt: z.coerce.date(),
  source: z.string().max(200).optional(),
  clickId: z.string().max(200).optional(),
});
export type AttributionEvent = z.infer<typeof attributionEventSchema>;

export const analyticsSyncResultSchema = z.object({
  workspaceId: z.string().min(1),
  provider: z.string().min(1),
  accountId: z.string().min(1),
  syncedAt: z.coerce.date(),
  recordsRead: z.number().int().nonnegative(),
  recordsWritten: z.number().int().nonnegative(),
  cursor: z.string().optional(),
});
export type AnalyticsSyncResult = z.infer<typeof analyticsSyncResultSchema>;

export const experimentAssignmentSchema = z.object({
  workspaceId: z.string().min(1),
  experimentId: z.string().min(1),
  subjectId: z.string().min(1),
  variantId: z.string().min(1),
  assignmentKey: z.string().min(1),
});
export type ExperimentAssignment = z.infer<typeof experimentAssignmentSchema>;

export const opportunityPrioritySchema = z.object({
  workspaceId: z.string().min(1),
  opportunityId: z.string().min(1),
  expectedValueMinor: z.number().int(),
  confidence: z.number().min(0).max(1),
  effortScore: z.number().min(0).max(1),
  riskScore: z.number().min(0).max(1),
  priorityScore: z.number().finite(),
});
export type OpportunityPriority = z.infer<typeof opportunityPrioritySchema>;

export const operationalHealthSchema = z.object({
  workspaceId: z.string().min(1),
  component: z.string().min(1),
  status: z.enum(["HEALTHY", "DEGRADED", "FAILED"]),
  checkedAt: z.coerce.date(),
  correlationId: z.string().min(1),
  details: z.record(z.string(), z.unknown()),
});
export type OperationalHealth = z.infer<typeof operationalHealthSchema>;

export function isOutboxPublishable(event: OutboxEvent): boolean {
  return event.eventId.length > 0 && event.workspaceId.length > 0 && event.idempotencyKey.length > 0;
}

export function isIdempotencyConflict(existingHash: string, incomingHash: string): boolean {
  return existingHash !== incomingHash;
}

export function calculateRetryDelay(policy: RetryPolicy, attempt: number): number {
  if (!Number.isInteger(attempt) || attempt < 1) return 0;
  const raw = policy.initialDelayMs * policy.backoffMultiplier ** (attempt - 1);
  return Math.min(raw, policy.maxDelayMs);
}

export function isApprovalSatisfied(boundary: ApprovalBoundary, now = new Date()): boolean {
  if (boundary.approvedApprovers < boundary.requiredApprovers) return false;
  if (boundary.expiresAt && boundary.expiresAt.getTime() <= now.getTime()) return false;
  return true;
}

export function canPublish(request: PublishingRequest): boolean {
  return request.approved && request.disclosurePresent && !request.killSwitchEnabled;
}

export function isAttributionEventValid(event: AttributionEvent): boolean {
  return event.workspaceId.length > 0 && event.linkId.length > 0 && event.eventId.length > 0;
}

export function isAnalyticsSyncConsistent(result: AnalyticsSyncResult): boolean {
  return result.recordsWritten <= result.recordsRead;
}

export function isExperimentAssignmentStable(input: ExperimentAssignment): boolean {
  return input.assignmentKey.length > 0 && input.variantId.length > 0;
}

export function calculateOpportunityPriority(input: Omit<OpportunityPriority, "priorityScore">): number {
  const value = Math.max(-1, Math.min(1, input.expectedValueMinor / 100000));
  const confidence = input.confidence;
  const effort = input.effortScore;
  const risk = input.riskScore;
  return value * confidence - effort * 0.25 - risk * 0.25;
}

export function isOperationallyHealthy(input: OperationalHealth): boolean {
  return input.status === "HEALTHY" && input.correlationId.length > 0;
}
