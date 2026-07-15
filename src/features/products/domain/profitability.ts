/**
 * Framework-free profitability estimation.
 *
 * Pure Decimal math (no precision loss). Produces per-post commission, revenue,
 * net revenue and bounded estimates. If there is no data basis (no commission
 * and no conversion rate) it returns all-null with zero confidence.
 */
import { Decimal, type DecimalValue } from "@/lib/shared/decimal";
import type { CommissionType } from "@/features/products/domain/types";

export const PROFITABILITY_VERSION = "1.0.0";

export interface ProfitabilityInput {
  currency: string;
  estimatedCommissionPerConversion: Decimal | null;
  estimatedConversionRate: Decimal | null;
  estimatedContentCost: Decimal | null;
  estimatedPlatformCost: Decimal | null;
  assumptionsProvided: boolean;
  confidenceScore: number;
  evidence: string[];
}

export interface ProfitabilityResult {
  estimatedCommissionPerConversion: Decimal | null;
  estimatedRevenuePerPost: Decimal | null;
  estimatedNetRevenuePerPost: Decimal | null;
  lowerBound: Decimal | null;
  upperBound: Decimal | null;
  confidenceScore: number;
  assumptions: string[];
}

function toDecimal(value: DecimalValue | null): Decimal {
  return value === null ? new Decimal(0) : new Decimal(value);
}

function clampConfidence(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return Math.round(value * 1000) / 1000;
}

export function estimateProfitability(
  input: ProfitabilityInput,
  version: string = PROFITABILITY_VERSION,
): ProfitabilityResult {
  const assumptions: string[] = [...input.evidence];

  if (input.estimatedCommissionPerConversion === null && input.estimatedConversionRate === null) {
    return {
      estimatedCommissionPerConversion: null,
      estimatedRevenuePerPost: null,
      estimatedNetRevenuePerPost: null,
      lowerBound: null,
      upperBound: null,
      confidenceScore: 0,
      assumptions: ["Insufficient data basis — no estimate produced"],
    };
  }

  if (!input.assumptionsProvided) {
    assumptions.push("Assumptions not explicitly provided — estimates are indicative only");
  }

  const commission = toDecimal(input.estimatedCommissionPerConversion);
  const conversionRate = input.estimatedConversionRate;
  const contentCost = toDecimal(input.estimatedContentCost);
  const platformCost = toDecimal(input.estimatedPlatformCost);

  if (input.estimatedCommissionPerConversion === null) {
    assumptions.push("Commission per conversion unknown — net revenue not computed");
  }
  if (input.estimatedContentCost === null) {
    assumptions.push("Content cost unknown — treated as 0 for net revenue");
  }
  if (input.estimatedPlatformCost === null) {
    assumptions.push("Platform cost unknown — treated as 0 for net revenue");
  }

  const revenuePerPost =
    commission.gt(0) && conversionRate !== null
      ? commission.mul(conversionRate)
      : null;

  const netRevenue =
    input.estimatedCommissionPerConversion === null
      ? null
      : commission.minus(contentCost).minus(platformCost);

  let lowerBound: Decimal | null = null;
  let upperBound: Decimal | null = null;
  if (netRevenue !== null) {
    const highConfidence = clampConfidence(input.confidenceScore) >= 0.7;
    const lowerFactor = highConfidence ? 0.7 : 0.5;
    const upperFactor = highConfidence ? 1.3 : 1.5;
    lowerBound = netRevenue.mul(lowerFactor);
    upperBound = netRevenue.mul(upperFactor);
  }

  if (revenuePerPost === null) {
    assumptions.push("Conversion rate unknown — revenue-per-post not computed");
  }

  return {
    estimatedCommissionPerConversion: input.estimatedCommissionPerConversion,
    estimatedRevenuePerPost: revenuePerPost,
    estimatedNetRevenuePerPost: netRevenue,
    lowerBound,
    upperBound,
    confidenceScore: clampConfidence(input.confidenceScore),
    assumptions,
  };
}
