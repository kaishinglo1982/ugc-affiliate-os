import { describe, expect, it } from "vitest";
import {
  COMPLIANCE_REJECT_THRESHOLD,
  DECISION_THRESHOLDS,
  scoreProduct,
} from "@/lib/commerce-core/product-score";
import { productScoreInputSchema } from "@/lib/commerce-core/types";

describe("scoreProduct", () => {
  it("scores a strong product as scale with high score", () => {
    const result = scoreProduct({
      demand: 90,
      trendGrowth: 85,
      commission: 80,
      audienceFit: 85,
      contentFit: 90,
      conversionProbability: 75,
      repurchasePotential: 70,
      competitionRisk: 5,
      returnRisk: 5,
      productionCostRisk: 5,
      advertisingCostRisk: 5,
      complianceRisk: 5,
    });
    expect(result.decision).toBe("scale");
    expect(result.score).toBeGreaterThanOrEqual(DECISION_THRESHOLDS.scale);
    expect(result.positiveContribution).toBeGreaterThan(80);
    expect(result.negativeContribution).toBeLessThan(20);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("scores a weak product as reject", () => {
    const result = scoreProduct({
      demand: 20,
      trendGrowth: 10,
      commission: 15,
      audienceFit: 25,
      contentFit: 30,
      conversionProbability: 20,
      repurchasePotential: 10,
      competitionRisk: 85,
      returnRisk: 80,
      productionCostRisk: 70,
      advertisingCostRisk: 75,
      complianceRisk: 60,
    });
    expect(result.decision).toBe("reject");
    expect(result.score).toBeLessThan(DECISION_THRESHOLDS.watch);
    expect(result.negativeContribution).toBeGreaterThan(result.positiveContribution);
  });

  it("forces rejection for critical compliance risk", () => {
    const result = scoreProduct({
      demand: 95,
      trendGrowth: 90,
      commission: 90,
      audienceFit: 90,
      contentFit: 90,
      conversionProbability: 90,
      repurchasePotential: 90,
      competitionRisk: 10,
      returnRisk: 10,
      productionCostRisk: 10,
      advertisingCostRisk: 10,
      complianceRisk: COMPLIANCE_REJECT_THRESHOLD,
    });
    expect(result.decision).toBe("reject");
    expect(
      result.reasons.some((reason) => reason.includes("Automatic rejection")),
    ).toBe(true);
  });

  it("handles incomplete data with reduced confidence", () => {
    const complete = scoreProduct({
      demand: 80,
      trendGrowth: 80,
      commission: 80,
      audienceFit: 80,
      contentFit: 80,
      conversionProbability: 80,
      repurchasePotential: 80,
      competitionRisk: 20,
      returnRisk: 20,
      productionCostRisk: 20,
      advertisingCostRisk: 20,
      complianceRisk: 20,
    });
    const partial = scoreProduct({ demand: 80, commission: 80 });
    expect(partial.confidence).toBeLessThan(complete.confidence);
    expect(partial.confidence).toBeGreaterThan(0);
    expect(partial.confidence).toBeLessThan(1);
  });

  it("rejects values outside 0..100 via zod validation", () => {
    expect(() => scoreProduct({ demand: 101 })).toThrow();
    expect(() => scoreProduct({ demand: -1 })).toThrow();
    expect(() => scoreProduct({ demand: 50.5 })).toThrow(); // must be integer
  });

  it("rejects non-numeric input", () => {
    expect(() => scoreProduct({ demand: "high" as unknown as number })).toThrow();
  });

  it("produces the same result for the same input (deterministic)", () => {
    const input = {
      demand: 70,
      trendGrowth: 60,
      commission: 75,
      audienceFit: 65,
      contentFit: 80,
      conversionProbability: 55,
      repurchasePotential: 40,
      competitionRisk: 45,
      returnRisk: 30,
      productionCostRisk: 35,
      advertisingCostRisk: 50,
      complianceRisk: 25,
    };
    const first = scoreProduct(input);
    const second = scoreProduct(input);
    expect(second).toEqual(first);
    expect(first.score).toBeTypeOf("number");
    expect(first.confidence).toBeTypeOf("number");
  });

  it("maps watch decisions between 35 and 55", () => {
    const watch = scoreProduct({
      demand: 70,
      trendGrowth: 70,
      commission: 70,
      audienceFit: 70,
      contentFit: 70,
      conversionProbability: 70,
      repurchasePotential: 70,
      competitionRisk: 25,
      returnRisk: 25,
      productionCostRisk: 25,
      advertisingCostRisk: 25,
      complianceRisk: 25,
    });
    expect(watch.score).toBe(45);
    expect(watch.decision).toBe("watch");
  });

  it("treats empty input as neutral watch with minimum confidence", () => {
    const result = scoreProduct({});
    expect(result.score).toBe(50);
    expect(result.decision).toBe("watch");
    expect(result.confidence).toBe(0.3);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("validates via zod schema independently", () => {
    expect(productScoreInputSchema.safeParse({ demand: 100 }).success).toBe(true);
    expect(productScoreInputSchema.safeParse({ demand: 101 }).success).toBe(false);
    expect(productScoreInputSchema.safeParse({ demand: -1 }).success).toBe(false);
  });
});
