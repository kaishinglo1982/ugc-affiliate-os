/**
 * Characterization tests asserting the pre-campaign estimate
 * (`estimateProfitability`) and the realized-profitability primitive
 * (`commerce-core/profitability.ts` `calculateProfitability`) stay
 * structurally distinct — see `audit/PROFITABILITY_OWNERSHIP_MATRIX.md`.
 * Neither function is modified; this only documents that they answer
 * different questions and cannot be silently substituted for one another.
 */
import { describe, expect, it } from "vitest";
import { Decimal } from "@/lib/shared/decimal";
import { estimateProfitability } from "@/features/products/domain/profitability";
import { calculateProfitability } from "@/lib/commerce-core";

describe("profitability ownership — estimate vs. realized stay distinct", () => {
  it("estimateProfitability answers a pre-campaign question using Decimal-typed money", () => {
    const result = estimateProfitability({
      currency: "EUR",
      estimatedCommissionPerConversion: new Decimal(10),
      estimatedConversionRate: new Decimal(0.02),
      estimatedContentCost: new Decimal(50),
      estimatedPlatformCost: new Decimal(10),
      assumptionsProvided: true,
      confidenceScore: 0.4,
      evidence: ["heuristic"],
    });
    expect(result.estimatedNetRevenuePerPost).toBeInstanceOf(Decimal);
    expect(result.assumptions.length).toBeGreaterThan(0);
  });

  it("calculateProfitability answers a realized-performance question using plain numbers", () => {
    const result = calculateProfitability({
      currency: "EUR",
      confirmedCommission: 100,
      openCommission: 0,
      refunds: 5,
      chargebacks: 0,
      costs: {
        advertising: 20,
        video: 0,
        voice: 0,
        models: 0,
        platform: 0,
        creator: 0,
        software: 0,
      },
      clicks: 200,
      conversions: 10,
    });
    expect(typeof result.netCommission).toBe("number");
    expect(result.netCommission).toBe(95);
  });

  it("the two result shapes share no field name — they cannot be silently merged or confused", () => {
    const estimate = estimateProfitability({
      currency: "EUR",
      estimatedCommissionPerConversion: new Decimal(10),
      estimatedConversionRate: new Decimal(0.02),
      estimatedContentCost: null,
      estimatedPlatformCost: null,
      assumptionsProvided: false,
      confidenceScore: 0.4,
      evidence: [],
    });
    const realized = calculateProfitability({
      currency: "EUR",
      confirmedCommission: 100,
      openCommission: 0,
      refunds: 0,
      chargebacks: 0,
      costs: { advertising: 0, video: 0, voice: 0, models: 0, platform: 0, creator: 0, software: 0 },
      clicks: 100,
      conversions: 5,
    });
    const estimateKeys = new Set(Object.keys(estimate));
    const realizedKeys = new Set(Object.keys(realized));
    const overlap = [...estimateKeys].filter((key) => realizedKeys.has(key));
    expect(overlap).toEqual([]);
  });

  it("estimateProfitability refuses to guess without any data basis", () => {
    const result = estimateProfitability({
      currency: "EUR",
      estimatedCommissionPerConversion: null,
      estimatedConversionRate: null,
      estimatedContentCost: null,
      estimatedPlatformCost: null,
      assumptionsProvided: false,
      confidenceScore: 0,
      evidence: [],
    });
    expect(result.confidenceScore).toBe(0);
    expect(result.estimatedNetRevenuePerPost).toBeNull();
  });

  it("calculateProfitability nets refunds and chargebacks that the pre-campaign estimate has no concept of", () => {
    const result = calculateProfitability({
      currency: "EUR",
      confirmedCommission: 100,
      openCommission: 0,
      refunds: 10,
      chargebacks: 5,
      costs: { advertising: 0, video: 0, voice: 0, models: 0, platform: 0, creator: 0, software: 0 },
      clicks: 50,
      conversions: 2,
    });
    expect(result.netCommission).toBe(85);
  });
});
