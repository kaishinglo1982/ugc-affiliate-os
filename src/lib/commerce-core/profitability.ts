/**
 * Central profitability calculation.
 *
 * netCommission   = confirmed commission − refunds − chargebacks
 * totalCost       = advertising + video + voice + models + platform + creator + software
 * contributionMargin = netCommission − totalCost
 *
 * Ratios (EPC, CPA, ROAS, conversion rate) return `null` instead of dividing
 * by zero. Money is rounded to cents, ratios to 4 decimals — deterministic
 * rounding at the single calculation boundary. Open commissions are tracked
 * separately and never counted as realized margin. Raw input values must be
 * non-negative; negative values are only expressed via refunds, chargebacks
 * or reversed conversions.
 */
import {
  profitabilityInputSchema,
  PROFITABILITY_VERSION,
  type ProfitabilityInput,
  type ProfitSnapshot,
} from "./types";

const MONEY_DECIMALS = 2;
const RATIO_DECIMALS = 4;

export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** MONEY_DECIMALS;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function roundRatio(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** RATIO_DECIMALS;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function safeRatio(numerator: number, denominator: number): number | null {
  if (denominator <= 0 || !Number.isFinite(numerator)) return null;
  return roundRatio(numerator / denominator);
}

export function calculateProfitability(
  input: ProfitabilityInput,
  version: string = PROFITABILITY_VERSION,
): ProfitSnapshot {
  const parsed = profitabilityInputSchema.parse(input);

  const netCommission = roundMoney(
    parsed.confirmedCommission - parsed.refunds - parsed.chargebacks,
  );
  const costs = parsed.costs;
  const totalCost = roundMoney(
    costs.advertising +
      costs.video +
      costs.voice +
      costs.models +
      costs.platform +
      costs.creator +
      costs.software,
  );
  const contributionMargin = roundMoney(netCommission - totalCost);

  return {
    currency: parsed.currency,
    netCommission,
    totalCost,
    contributionMargin,
    epc: safeRatio(netCommission, parsed.clicks),
    cpa: safeRatio(totalCost, parsed.conversions),
    roas: safeRatio(netCommission, totalCost),
    conversionRate: safeRatio(parsed.conversions, parsed.clicks),
    clicks: parsed.clicks,
    conversions: parsed.conversions,
    version,
  };
}
