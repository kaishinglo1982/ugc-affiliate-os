import { describe, it, expect } from "vitest";
import { analyzeContentFit } from "@/features/products/domain/content-fit";

describe("content-fit — disallowed category", () => {
  it("returns all-zero scores and zero confidence when not allowed", () => {
    const r = analyzeContentFit({
      categoryId: "cat-1",
      categoryAllowed: false,
      contentGenerationAllowed: true,
      confidenceScore: 0.9,
      evidence: [],
    });
    expect(r.demonstrabilityScore).toBe(0);
    expect(r.visualAppealScore).toBe(0);
    expect(r.confidenceScore).toBe(0);
    expect(r.recommendedHookTypes).toHaveLength(0);
    expect(r.evidenceReferences).toContain("Content generation not allowed for category");
  });

  it("returns zeros when content generation not allowed", () => {
    const r = analyzeContentFit({
      categoryId: "cat-1",
      categoryAllowed: true,
      contentGenerationAllowed: false,
      confidenceScore: 0.9,
      evidence: [],
    });
    expect(r.shortVideoFitScore).toBe(0);
    expect(r.confidenceScore).toBe(0);
  });
});

describe("content-fit — allowed category heuristics", () => {
  it("produces deterministic scores in 0..100 and recommendations", () => {
    const input = {
      categoryId: "electronics",
      categoryAllowed: true,
      contentGenerationAllowed: true,
      confidenceScore: 0.8,
      evidence: [],
      demonstrabilityHint: 80,
      visualAppealHint: 70,
      problemSolutionHint: 60,
      testimonialHint: 50,
      tutorialHint: 65,
      shortVideoHint: 75,
    };
    const a = analyzeContentFit(input);
    const b = analyzeContentFit(input);
    expect(a).toEqual(b);

    for (const score of [
      a.demonstrabilityScore,
      a.visualAppealScore,
      a.problemSolutionFitScore,
      a.testimonialFitScore,
      a.tutorialFitScore,
      a.shortVideoFitScore,
    ]) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
    expect(a.confidenceScore).toBe(0.8);
    expect(a.recommendedHookTypes.length).toBeGreaterThan(0);
    expect(a.recommendedScriptStructures.length).toBeGreaterThan(0);
    expect(a.recommendedContentFormats.length).toBeGreaterThan(0);
  });
});
