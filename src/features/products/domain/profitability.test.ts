import { describe, it, expect } from "vitest";
import { estimateProfitability, PROFITABILITY_VERSION } from "@/features/products/domain/profitability";
import { Decimal } from "@/lib/shared/decimal";

describe("profitability — no data basis", () => {
  it("returns all-null estimates with zero confidence when no data", () => {
    const r = estimateProfitability({
      currency: "EUR",
      estimatedCommissionPerConversion: null,
      estimatedConversionRate: null,
      estimatedContentCost: null,
      estimatedPlatformCost: null,
      assumptionsProvided: false,
      confidenceScore: 0.9,
      evidence: [],
    });
    expect(r.estimatedCommissionPerConversion).toBeNull();
    expect(r.estimatedRevenuePerPost).toBeNull();
    expect(r.estimatedNetRevenuePerPost).toBeNull();
    expect(r.lowerBound).toBeNull();
    expect(r.upperBound).toBeNull();
    expect(r.confidenceScore).toBe(0);
    expect(r.assumptions.some((a) => a.includes("Insufficient data basis"))).toBe(true);
  });
});

describe("profitability — computation", () => {
  it("computes net revenue and bounds using Decimal math without precision loss", () => {
    const r = estimateProfitability({
      currency: "EUR",
      estimatedCommissionPerConversion: new Decimal("10.00"),
      estimatedConversionRate: new Decimal("0.05"),
      estimatedContentCost: new Decimal("2.50"),
      estimatedPlatformCost: new Decimal("1.00"),
      assumptionsProvided: true,
      confidenceScore: 0.9,
      evidence: [],
    });
    // net = 10 - 2.5 - 1 = 6.5
    expect(r.estimatedNetRevenuePerPost?.toString()).toBe("6.5");
    // revenue per post = 10 * 0.05 = 0.5
    expect(r.estimatedRevenuePerPost?.toString()).toBe("0.5");
    // high confidence bounds [0.7, 1.3] -> 4.55 .. 8.45
    expect(r.lowerBound?.toString()).toBe("4.55");
    expect(r.upperBound?.toString()).toBe("8.45");
    expect(r.confidenceScore).toBe(0.9);
  });

  it("treats missing costs as 0 and widens bounds at low confidence", () => {
    const r = estimateProfitability({
      currency: "EUR",
      estimatedCommissionPerConversion: new Decimal("10.00"),
      estimatedConversionRate: null,
      estimatedContentCost: null,
      estimatedPlatformCost: null,
      assumptionsProvided: false,
      confidenceScore: 0.3,
      evidence: [],
    });
    expect(r.estimatedNetRevenuePerPost?.toString()).toBe("10");
    expect(r.estimatedRevenuePerPost).toBeNull();
    // low confidence bounds [0.5, 1.5] -> 5 .. 15
    expect(r.lowerBound?.toString()).toBe("5");
    expect(r.upperBound?.toString()).toBe("15");
  });

  it("exposes version constant", () => {
    expect(PROFITABILITY_VERSION).toBe("1.0.0");
  });
});
