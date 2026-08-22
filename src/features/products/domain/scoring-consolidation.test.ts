/**
 * Characterization tests for the documented differences between the
 * production scoring engine (`scoreOpportunity`) and the unwired
 * `commerce-core/product-score.ts` primitive. See
 * `audit/SCORING_CONSOLIDATION_MATRIX.md` for the full comparison — these
 * tests encode that document's claims so an unnoticed drift (a renamed
 * signal, a changed weight, a merged version string) fails loudly instead of
 * silently invalidating the matrix. No production function is exercised
 * beyond its existing public constants/functions; nothing is replaced.
 */
import { describe, expect, it } from "vitest";
import { OPPORTUNITY_WEIGHTS, SCORING_VERSION } from "@/features/products/domain/types";
import { scoreOpportunity } from "@/features/products/domain/opportunity-scoring";
import {
  NEGATIVE_WEIGHTS,
  POSITIVE_WEIGHTS,
  PRODUCT_SCORING_VERSION,
  productScoreInputSchema,
  scoreProduct,
} from "@/lib/commerce-core";

describe("scoring consolidation matrix — documented signal mapping", () => {
  it("both weight sets still sum to 1 independently", () => {
    const opportunitySum = Object.values(OPPORTUNITY_WEIGHTS).reduce((a, b) => a + b, 0);
    const positiveSum = Object.values(POSITIVE_WEIGHTS).reduce((a, b) => a + b, 0);
    const negativeSum = Object.values(NEGATIVE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(opportunitySum).toBeCloseTo(1, 9);
    expect(positiveSum).toBeCloseTo(1, 9);
    expect(negativeSum).toBeCloseTo(1, 9);
  });

  it("the cleanly-mappable signals still exist under their documented commerce-core names", () => {
    // commissionScore -> commission, demandScore -> demand, contentFitScore ->
    // contentFit, audienceFitScore -> audienceFit (per the matrix's "Übernehmbar" rows).
    expect(Object.keys(POSITIVE_WEIGHTS)).toEqual(
      expect.arrayContaining(["commission", "demand", "contentFit", "audienceFit"]),
    );
  });

  it("competitionScore and complianceScore map to inverted-polarity risk signals, not direct equivalents", () => {
    // Documented as needing polarity inversion, not a same-name rename.
    expect(Object.keys(NEGATIVE_WEIGHTS)).toEqual(
      expect.arrayContaining(["competitionRisk", "complianceRisk"]),
    );
    expect(Object.keys(OPPORTUNITY_WEIGHTS)).toEqual(
      expect.arrayContaining(["competitionScore", "complianceScore"]),
    );
  });

  it("profitabilityScore and dataQualityScore have no commerce-core scoring equivalent by design", () => {
    const commerceCoreSignalNames = new Set([
      ...Object.keys(POSITIVE_WEIGHTS),
      ...Object.keys(NEGATIVE_WEIGHTS),
    ]);
    expect(commerceCoreSignalNames.has("profitability")).toBe(false);
    expect(commerceCoreSignalNames.has("dataQuality")).toBe(false);
    // Confirmed structurally too: the Zod input schema has no such keys.
    const shapeKeys = Object.keys(productScoreInputSchema.shape);
    expect(shapeKeys).not.toContain("profitability");
    expect(shapeKeys).not.toContain("dataQuality");
  });

  it("commerce-core's five extra signals have no production-scoring equivalent today", () => {
    const extraSignals = [
      "conversionProbability",
      "repurchasePotential",
      "returnRisk",
      "productionCostRisk",
      "advertisingCostRisk",
    ];
    const opportunityComponentNames = Object.keys(OPPORTUNITY_WEIGHTS);
    for (const signal of extraSignals) {
      expect(opportunityComponentNames).not.toContain(signal);
    }
  });

  it("the two version strings currently coincide — this is coincidental, not evidence of shared versioning", () => {
    // If this fails, the matrix's "coincidental naming" claim needs updating either way —
    // that is the point of this test.
    expect(SCORING_VERSION).toBe(PRODUCT_SCORING_VERSION);
  });

  it("production scoring never returns a categorical action decision; commerce-core always does", () => {
    const opportunityResult = scoreOpportunity({
      commissionScore: 80,
      demandScore: 80,
      competitionScore: 50,
      contentFitScore: 80,
      audienceFitScore: 60,
      trendScore: 50,
      profitabilityScore: 70,
      dataQualityScore: 60,
      complianceScore: 100,
      complianceCritical: false,
      confidenceScore: 0.8,
      sampleSize: 500n,
      evidence: {},
    });
    expect(opportunityResult).not.toHaveProperty("decision");

    const commerceCoreResult = scoreProduct({ demand: 80, commission: 80 });
    expect(commerceCoreResult.decision).toMatch(/^(scale|test|watch|reject)$/);
  });
});
