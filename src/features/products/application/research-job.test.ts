import { describe, it, expect } from "vitest";
import { STEP_NAMES } from "./steps";

describe("STEP_NAMES ordering", () => {
  it("lists research-job steps in the required execution order", () => {
    expect(STEP_NAMES).toEqual([
      "refreshOffers",
      "discovery",
      "recomputeMatches",
      "compliance",
      "contentFit",
      "profitability",
      "opportunityScoring",
      "expireOpportunities",
      "dataQuality",
    ]);
  });

  it("has exactly nine steps", () => {
    expect(STEP_NAMES.length).toBe(9);
  });
});
