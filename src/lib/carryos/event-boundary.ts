import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import type { OutboxEvent, RetryPolicy } from "./phases-21-30";

export const eventEnvelopeSchema = z.object({
  eventId: z.string().min(1),
  workspaceId: z.string().min(1),
  eventType: z.string().min(1),
  aggregateId: z.string().min(1),
  correlationId: z.string().min(1),
  idempotencyKey: z.string().min(1),
  occurredAt: z.coerce.date(),
  payload: z.record(z.string(), z.unknown()),
});
export type EventEnvelope = z.infer<typeof eventEnvelopeSchema>;

export class CarryOSWorkspaceBoundaryError extends Error {}

export function assertSameWorkspace(expectedWorkspaceId: string, actualWorkspaceId: string): void {
  if (expectedWorkspaceId !== actualWorkspaceId) {
    throw new CarryOSWorkspaceBoundaryError("Cross-workspace operation rejected");
  }
}

export function createRequestHash(input: unknown): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export function buildOutboxEvent(
  input: Omit<OutboxEvent, "eventId" | "occurredAt"> & { eventId?: string; occurredAt?: Date },
): OutboxEvent {
  const event: OutboxEvent = {
    ...input,
    eventId: input.eventId ?? randomUUID(),
    occurredAt: input.occurredAt ?? new Date(),
  };
  return eventEnvelopeSchema.parse(event) as OutboxEvent;
}

export function shouldRetry(
  policy: RetryPolicy,
  attempt: number,
  failureDomain: string,
): boolean {
  return (
    attempt >= 1 &&
    attempt < policy.maxAttempts &&
    policy.retryableFailureDomains.includes(failureDomain)
  );
}
