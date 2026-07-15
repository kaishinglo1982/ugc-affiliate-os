import { describe, it, expect } from "vitest";
import {
  scoreOpportunity,
  assertWeightsSumToOne,
} from "@/features/products/domain/opportunity-scoring";
import { OPPORTUNITY_WEIGHTS } from "@/features/products/domain/types";
import type { OpportunityInput } from "@/features/products/domain/opportunity-scoring";

describe("opportunity scoring — weights", () => {
  it("weights sum to exactly 1", () => {
    const sum = Object.values(OPPORTUNITY_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 12);
    expect(() => assertWeightsSumToOne()).not.toThrow();
  });
});

function baseInput(overrides: Partial<OpportunityInput> = {}): OpportunityInput {
  return {
    commissionScore: 80,
    demandScore: 70,
    competitionScore: 60,
    contentFitScore: 90,
    audienceFitScore: 75,
    trendScore: 65,
    profitabilityScore: 85,
    dataQualityScore: 100,
    complianceScore: 100,
    confidenceScore: 0.9,
    sampleSize: 100n,
    complianceCritical: false,
    evidence: {},
    ...overrides,
  };
}

describe("opportunity scoring — total computation", () => {
  it("computes a deterministic total from weighted components", () => {
    const r = scoreOpportunity(baseInput());
    // Expected = sum(score*weight)
    const expected =
      80 * 0.15 + 70 * 0.15 + 60 * 0.1 + 90 * 0.15 + 75 * 0.1 + 65 * 0.1 + 85 * 0.15 + 100 * 0.05 + 100 * 0.05;
    expect(r.totalScore).toBe(Math.round(expected));
    expect(r.components).toHaveLength(Object.keys(OPPORTUNITY_WEIGHTS).length);
    expect(r.totalScore).toBeGreaterThanOrEqual(0);
    expect(r.totalScore).toBeLessThanOrEqual(100);
  });

  it("forces total to 0 when compliance is critical", () => {
    const r = scoreOpportunity(baseInput({ complianceCritical: true }));
    expect(r.totalScore).toBe(0);
    expect(r.explanation).toContain("Critical compliance risk blocks opportunity");
  });

  it("clamps every component score to 0..100", () => {
    const r = scoreOpportunity(
      baseInput({
        commissionScore: 999,
        demandScore: -50,
        dataQualityScore: 250,
      }),
    );
    for (const c of r.components) {
      expect(c.score).toBeGreaterThanOrEqual(0);
      expect(c.score).toBeLessThanOrEqual(100);
    }
  });

  it("lowers confidence when data quality is low", () => {
    const high = scoreOpportunity(baseInput({ dataQualityScore: 100, sampleSize: 100n }));
    const low = scoreOpportunity(baseInput({ dataQualityScore: 10, sampleSize: 100n }));
    expect(low.confidenceScore).toBeLessThan(high.confidenceScore);
  });

  it("lowers confidence when sample size is small / missing", () => {
    const big = scoreOpportunity(baseInput({ sampleSize: 100n }));
    const small = scoreOpportunity(baseInput({ sampleSize: 5n }));
    const none = scoreOpportunity(baseInput({ sampleSize: null }));
    expect(small.confidenceScore).toBeLessThan(big.confidenceScore);
    expect(none.confidenceScore).toBeLessThan(big.confidenceScore);
  });

  it("never promises revenue in the explanation", () => {
    const r = scoreOpportunity(baseInput());
    expect(r.explanation.toLowerCase()).not.toMatch(/guaranteed revenue|promis.*revenue/);
    expect(r.explanation).toContain("no revenue is promised");
  });
});
