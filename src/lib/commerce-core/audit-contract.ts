/**
 * Typed audit-event contract for future attribution status transitions.
 *
 * This is a contract only: no database table backs it, and nothing in this
 * codebase writes it anywhere yet. `markConversionStatus()` in
 * `attribution.ts` does not call this module. It exists so that whenever
 * attribution resolution becomes load-bearing (see the ADR's cutover
 * conditions — Prisma migration, tenant enforcement, idempotency, reversal
 * rules, integration tests), the shape of "what must be recorded" is already
 * decided and reviewable, instead of being invented ad hoc at that time.
 */
import { z } from "zod";
import { conversionStatusSchema } from "./types";

export const attributionAuditEventSchema = z.object({
  /** Tenant the conversion belongs to. Required — no cross-tenant audit events. */
  tenantId: z.string().min(1),
  /** The conversion whose status changed. */
  conversionId: z.string().min(1),
  previousStatus: conversionStatusSchema,
  newStatus: conversionStatusSchema,
  /** Human-readable justification; never empty for a status change. */
  reason: z.string().min(1),
  /** Who/what caused the transition — a user id or a registered agent key. */
  actor: z.object({
    type: z.enum(["user", "agent", "system"]),
    id: z.string().min(1),
  }),
  occurredAt: z.date(),
  /** Required — status transitions must be replay-safe. */
  idempotencyKey: z.string().min(1),
  correlationId: z.string().min(1),
  traceId: z.string().min(1),
  /** Present only when the transition required prior human approval. */
  approvalId: z.string().min(1).optional(),
});

export type AttributionAuditEvent = z.infer<typeof attributionAuditEventSchema>;

/**
 * Validates and normalizes an audit event before it would be handed to a
 * (not-yet-existing) persistence layer. Throws on an invalid shape — audit
 * events must never be persisted best-effort.
 */
export function buildAttributionAuditEvent(input: AttributionAuditEvent): AttributionAuditEvent {
  return attributionAuditEventSchema.parse(input);
}
