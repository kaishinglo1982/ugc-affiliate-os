/**
 * Central, versioned definitions for every analytics metric. All formulas live
 * here (single source of truth) and are referenced by their `METRIC_*` ids from
 * aggregation, experimentation, and recommendation code. Division-by-zero and
 * missing denominators always resolve to `null`, never to `0` — see
 * `safeRatio`. Rounding happens only at presentation time; internal math keeps
 * full precision via `Decimal`.
 */
import { Decimal, type DecimalValue } from "@/lib/shared/decimal";

export const METRIC_FORMULA_VERSION = "1.0.0";

export type MetricId =
  | "ENGAGEMENT_RATE"
  | "CLICK_THROUGH_RATE"
  | "CONVERSION_RATE"
  | "COMPLETION_RATE"
  | "REVENUE_PER_VIEW"
  | "REVENUE_PER_CLICK"
  | "REVENUE_PER_POST"
  | "RETURN_ON_CONTENT_SPEND";

export interface MetricDefinition {
  id: MetricId;
  label: string;
  /** Human-readable, unambiguous definition. */
  definition: string;
  unit: "ratio" | "currency" | "currency_per_unit";
  /** Positive means "higher is better". */
  direction: "higher_is_better" | "lower_is_better" | "neutral";
  formula: string;
  version: string;
}

export const METRIC_DEFINITIONS: MetricDefinition[] = [
  {
    id: "ENGAGEMENT_RATE",
    label: "Engagement Rate",
    definition: "Share of impressions that resulted in an engagement (like, comment, share, save, profile visit).",
    unit: "ratio",
    direction: "higher_is_better",
    formula: "engagements / impressions",
    version: METRIC_FORMULA_VERSION,
  },
  {
    id: "CLICK_THROUGH_RATE",
    label: "Click-Through Rate (CTR)",
    definition: "Share of impressions that resulted in a link click.",
    unit: "ratio",
    direction: "higher_is_better",
    formula: "linkClicks / impressions",
    version: METRIC_FORMULA_VERSION,
  },
  {
    id: "CONVERSION_RATE",
    label: "Conversion Rate",
    definition: "Share of link clicks that resulted in a conversion (sale/lead).",
    unit: "ratio",
    direction: "higher_is_better",
    formula: "conversions / linkClicks",
    version: METRIC_FORMULA_VERSION,
  },
  {
    id: "COMPLETION_RATE",
    label: "Video Completion Rate",
    definition: "Share of video starts that watched to completion.",
    unit: "ratio",
    direction: "higher_is_better",
    formula: "videoCompletions / videoStarts",
    version: METRIC_FORMULA_VERSION,
  },
  {
    id: "REVENUE_PER_VIEW",
    label: "Revenue per View",
    definition: "Commission revenue earned per view.",
    unit: "currency_per_unit",
    direction: "higher_is_better",
    formula: "commissionRevenue / views",
    version: METRIC_FORMULA_VERSION,
  },
  {
    id: "REVENUE_PER_CLICK",
    label: "Revenue per Click",
    definition: "Commission revenue earned per link click.",
    unit: "currency_per_unit",
    direction: "higher_is_better",
    formula: "commissionRevenue / linkClicks",
    version: METRIC_FORMULA_VERSION,
  },
  {
    id: "REVENUE_PER_POST",
    label: "Revenue per Post",
    definition: "Commission revenue earned per published post in the period.",
    unit: "currency_per_unit",
    direction: "higher_is_better",
    formula: "commissionRevenue / publishedPosts",
    version: METRIC_FORMULA_VERSION,
  },
  {
    id: "RETURN_ON_CONTENT_SPEND",
    label: "Return on Content Spend (ROCS)",
    definition: "Net revenue relative to attributed content costs.",
    unit: "ratio",
    direction: "higher_is_better",
    formula: "estimatedNetRevenue / attributedCosts",
    version: METRIC_FORMULA_VERSION,
  },
];

export function getMetricDefinition(id: MetricId): MetricDefinition {
  const found = METRIC_DEFINITIONS.find((m) => m.id === id);
  if (!found) throw new Error(`Unknown metric: ${id}`);
  return found;
}

/** Convert a bigint (or null) to a Decimal without precision loss. */
function toDecimal(value: bigint | DecimalValue | null | undefined): Decimal | null {
  if (value === null || value === undefined) return null;
  return new Decimal(value.toString());
}

/**
 * Safe ratio `numerator / denominator`. Returns `null` when the denominator is
 * null, zero, or a non-finite value — never `0`. A null numerator also yields
 * `null` because an unknown numerator cannot be assumed to be zero.
 */
export function safeRatio(
  numerator: bigint | DecimalValue | null | undefined,
  denominator: bigint | DecimalValue | null | undefined,
): Decimal | null {
  const num = toDecimal(numerator);
  const den = toDecimal(denominator);
  if (num === null || den === null) return null;
  if (den.isZero() || !den.isFinite()) return null;
  return num.div(den);
}

export interface ContentMetricInput {
  impressions: bigint | null;
  views: bigint | null;
  engagements: bigint | null;
  linkClicks: bigint | null;
  conversions: bigint | null;
  videoStarts: bigint | null;
  videoCompletions: bigint | null;
  commissionRevenue: DecimalValue | null;
  estimatedNetRevenue: DecimalValue | null;
  attributedCosts: DecimalValue | null;
  publishedPosts: bigint | null;
}

export interface ContentMetricOutput {
  engagementRate: Decimal | null;
  clickThroughRate: Decimal | null;
  conversionRate: Decimal | null;
  completionRate: Decimal | null;
  revenuePerView: Decimal | null;
  revenuePerClick: Decimal | null;
  revenuePerPost: Decimal | null;
  returnOnContentSpend: Decimal | null;
}

/** Computes all content performance ratios with strict null-safety. */
export function computeContentMetrics(input: ContentMetricInput): ContentMetricOutput {
  return {
    engagementRate: safeRatio(input.engagements, input.impressions),
    clickThroughRate: safeRatio(input.linkClicks, input.impressions),
    conversionRate: safeRatio(input.conversions, input.linkClicks),
    completionRate: safeRatio(input.videoCompletions, input.videoStarts),
    revenuePerView: safeRatio(input.commissionRevenue, input.views),
    revenuePerClick: safeRatio(input.commissionRevenue, input.linkClicks),
    revenuePerPost: safeRatio(input.commissionRevenue, input.publishedPosts),
    returnOnContentSpend: safeRatio(input.estimatedNetRevenue, input.attributedCosts),
  };
}
