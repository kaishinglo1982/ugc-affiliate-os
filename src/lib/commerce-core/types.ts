/**
 * UGC Commerce Core — shared domain types and Zod schemas.
 *
 * Framework-free (no Prisma, no server-only) so the core can run anywhere:
 * route handlers, workers, CLI scripts and Vitest. Money values are plain
 * numbers rounded to cents at the boundary of the pure calculation modules;
 * the persistence layer (Prisma Decimal) is applied later when snapshots are
 * stored.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Product scoring
// ---------------------------------------------------------------------------

export type ProductDecision = "scale" | "test" | "watch" | "reject";

export const productDecisionSchema = z.enum(["scale", "test", "watch", "reject"]);

/** 0..100 signal values. Missing signals lower confidence but never throw. */
export const productSignalSchema = z
  .number()
  .int()
  .min(0)
  .max(100);

/**
 * Product signals used by the deterministic scoring model. Positive signals
 * raise the score, negative signals (risk) lower it. All values are 0..100.
 */
export const productScoreInputSchema = z.object({
  demand: productSignalSchema.optional(),
  trendGrowth: productSignalSchema.optional(),
  commission: productSignalSchema.optional(),
  audienceFit: productSignalSchema.optional(),
  contentFit: productSignalSchema.optional(),
  conversionProbability: productSignalSchema.optional(),
  repurchasePotential: productSignalSchema.optional(),
  competitionRisk: productSignalSchema.optional(),
  returnRisk: productSignalSchema.optional(),
  productionCostRisk: productSignalSchema.optional(),
  advertisingCostRisk: productSignalSchema.optional(),
  complianceRisk: productSignalSchema.optional(),
});

export type ProductScoreInput = z.infer<typeof productScoreInputSchema>;

export interface ProductScoreResult {
  score: number;
  confidence: number;
  decision: ProductDecision;
  positiveContribution: number;
  negativeContribution: number;
  reasons: string[];
}

// ---------------------------------------------------------------------------
// Attribution
// ---------------------------------------------------------------------------

export type ConversionStatus = "pending" | "confirmed" | "reversed";

export const conversionStatusSchema = z.enum(["pending", "confirmed", "reversed"]);

/** One recorded touchpoint (click on an affiliate link / published post). */
export interface TrackingTouch {
  tenantId: string;
  touchId: string;
  occurredAt: Date;
  campaignId?: string | null;
  productId?: string | null;
  affiliateLinkId: string;
  characterId?: string | null;
  socialAccountId?: string | null;
  contentAssetId?: string | null;
  publishedPostId?: string | null;
  clickId?: string | null;
  provider?: string | null;
}

/** Provider conversion event before attribution. */
export interface ConversionEvent {
  conversionId: string;
  tenantId: string;
  provider: string;
  providerConversionId: string;
  affiliateLinkId: string;
  clickId?: string | null;
  occurredAt: Date;
  grossRevenue: number;
  commission: number;
  currency: string;
  status: ConversionStatus;
}

export interface AttributionOptions {
  /** Lookback window in hours; touches older than this are ignored. */
  lookbackHours?: number;
  /**
   * Allow attribution by affiliate link only (no click id match). Off by
   * default — click ids must match unless explicitly permitted.
   */
  allowLinkFallback?: boolean;
  /** Currency the caller wants results normalized to (ISO 4217). */
  currencyCode?: string;
}

export type AttributionReason =
  | "click_match"
  | "link_fallback"
  | "reversed"
  | "outside_lookback"
  | "unknown_click"
  | "cross_tenant"
  | "duplicate"
  | "not_attributable";

export interface AttributedConversion {
  conversion: ConversionEvent;
  /** Resolved touchpoint, null when the conversion was not attributable. */
  touch: TrackingTouch | null;
  attributed: boolean;
  reason: AttributionReason;
  /** Currency applied after normalization; unchanged when no rate applied. */
  currency: string;
}

export interface AttributionSummary {
  total: number;
  attributed: number;
  pending: number;
  confirmed: number;
  reversed: number;
  duplicate: number;
  crossTenantRejected: number;
  outsideLookback: number;
  unknownClick: number;
}

export interface AttributionResult {
  conversions: AttributedConversion[];
  summary: AttributionSummary;
}

// ---------------------------------------------------------------------------
// Profitability
// ---------------------------------------------------------------------------

export interface ProfitCosts {
  advertising: number;
  video: number;
  voice: number;
  models: number;
  platform: number;
  creator: number;
  software: number;
}

export const profitCostsSchema = z.object({
  advertising: z.number().min(0).default(0),
  video: z.number().min(0).default(0),
  voice: z.number().min(0).default(0),
  models: z.number().min(0).default(0),
  platform: z.number().min(0).default(0),
  creator: z.number().min(0).default(0),
  software: z.number().min(0).default(0),
});

export const profitabilityInputSchema = z.object({
  currency: z.string().min(3).max(3),
  confirmedCommission: z.number().min(0).default(0),
  openCommission: z.number().min(0).default(0),
  refunds: z.number().min(0).default(0),
  chargebacks: z.number().min(0).default(0),
  costs: profitCostsSchema,
  clicks: z.number().int().min(0).default(0),
  conversions: z.number().int().min(0).default(0),
});

export type ProfitabilityInput = z.infer<typeof profitabilityInputSchema>;

/**
 * Central profitability snapshot. Money values are rounded to cents, ratios
 * to 4 decimals. `null` means "not computable" (division by zero).
 */
export interface ProfitSnapshot {
  currency: string;
  netCommission: number;
  totalCost: number;
  contributionMargin: number;
  epc: number | null;
  cpa: number | null;
  roas: number | null;
  conversionRate: number | null;
  clicks: number;
  conversions: number;
  /** Calculation version used to produce this snapshot. */
  version: string;
}

export const PROFITABILITY_VERSION = "1.0.0";
export const PRODUCT_SCORING_VERSION = "1.0.0";
export const ATTRIBUTION_VERSION = "1.0.0";
