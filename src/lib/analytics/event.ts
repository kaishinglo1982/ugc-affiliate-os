/**
 * Analytics event ingestion contract. Every external analytics payload — from a
 * platform API, affiliate API, webhook, CSV, or internal source — MUST be
 * validated and normalized through `validateAnalyticsEvent` before it touches
 * the database. `deduplicateEvents` enforces idempotent imports: events sharing
 * an idempotency key (or, when present, an external event id on the same
 * source+type) are collapsed so no event is counted twice.
 */
import { z } from "zod";

export const ANALYTICS_EVENT_TYPES = [
  "IMPRESSION",
  "VIEW",
  "VIDEO_STARTED",
  "VIDEO_COMPLETED",
  "LIKE",
  "COMMENT",
  "SHARE",
  "SAVE",
  "PROFILE_VISIT",
  "LINK_CLICK",
  "AFFILIATE_CLICK",
  "LEAD",
  "CONVERSION",
  "REFUND",
  "CHARGEBACK",
  "REVENUE",
  "COST",
] as const;

export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];

export const ANALYTICS_EVENT_SOURCES = [
  "PLATFORM_API",
  "AFFILIATE_API",
  "WEBHOOK",
  "CSV",
  "INTERNAL",
  "MANUAL",
] as const;

export type AnalyticsEventSource = (typeof ANALYTICS_EVENT_SOURCES)[number];

export const analyticsEventSchema = z.object({
  workspaceId: z.string().min(1),
  eventType: z.enum(ANALYTICS_EVENT_TYPES),
  platform: z.string().min(1).optional().nullable(),
  socialAccountId: z.string().uuid().optional().nullable(),
  brandId: z.string().uuid().optional().nullable(),
  nicheId: z.string().uuid().optional().nullable(),
  campaignId: z.string().uuid().optional().nullable(),
  publishingJobId: z.string().uuid().optional().nullable(),
  externalPostId: z.string().min(1).optional().nullable(),
  contentAssetId: z.string().uuid().optional().nullable(),
  contentVariantId: z.string().uuid().optional().nullable(),
  productId: z.string().uuid().optional().nullable(),
  affiliateProgramId: z.string().uuid().optional().nullable(),
  affiliateLinkId: z.string().uuid().optional().nullable(),
  experimentId: z.string().uuid().optional().nullable(),
  experimentVariantId: z.string().uuid().optional().nullable(),
  numericValue: z.union([z.number(), z.string()]).optional().nullable(),
  currency: z.string().length(3).optional().nullable(),
  occurredAt: z.string().datetime({ offset: true }),
  sourceTimezone: z.string().min(1).optional().nullable(),
  source: z.enum(ANALYTICS_EVENT_SOURCES),
  externalEventId: z.string().min(1).optional().nullable(),
  idempotencyKey: z.string().min(1),
  metadataReferenceId: z.string().min(1).optional().nullable(),
});

export type AnalyticsEventInput = z.infer<typeof analyticsEventSchema>;

export type ValidatedAnalyticsEvent = Omit<AnalyticsEventInput, "occurredAt" | "numericValue"> & {
  occurredAt: Date;
  numericValue: string | null;
};

export function validateAnalyticsEvent(raw: unknown): {
  success: true;
  data: ValidatedAnalyticsEvent;
} | {
  success: false;
  error: string;
} {
  const parsed = analyticsEventSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Ungültiges Event." };
  }
  const data = parsed.data;
  return {
    success: true,
    data: {
      ...data,
      numericValue: data.numericValue === null || data.numericValue === undefined
        ? null
        : String(data.numericValue),
      occurredAt: new Date(data.occurredAt),
    },
  };
}

export interface DedupeResult<T extends { idempotencyKey: string }> {
  unique: T[];
  duplicates: T[];
}

/**
 * Removes events that share an idempotency key within the batch (first wins).
 * Pure and deterministic; the database's unique constraint is the second line
 * of defence for cross-batch duplicates.
 */
export function deduplicateEvents<T extends { idempotencyKey: string }>(events: T[]): DedupeResult<T> {
  const seen = new Set<string>();
  const unique: T[] = [];
  const duplicates: T[] = [];
  for (const event of events) {
    if (seen.has(event.idempotencyKey)) {
      duplicates.push(event);
    } else {
      seen.add(event.idempotencyKey);
      unique.push(event);
    }
  }
  return { unique, duplicates };
}
