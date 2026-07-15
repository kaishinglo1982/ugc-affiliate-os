import { describe, it, expect } from "vitest";
import { evaluateCompliance, COMPLIANCE_VERSION } from "@/features/products/domain/compliance";
import type { ComplianceInput } from "@/features/products/domain/compliance";

const base: ComplianceInput = {
  categoryRiskLevel: "low",
  categoryAllowed: true,
  nicheAllowed: true,
  targetMarketAllowed: true,
  affiliateProgramAllowsPromotion: true,
  title: "Nice Wireless Earbuds",
  description: "Great sound quality",
  brandName: null,
};

describe("compliance — mandatory blocks", () => {
  it("fails and escalates to critical for age-restricted items", () => {
    const r = evaluateCompliance({ ...base, title: "Vape Pen Starter Kit" });
    expect(r.status).toBe("failed");
    expect(r.riskLevel).toBe("critical");
    expect(r.ageRestrictionDetected).toBe(true);
    expect(r.manualReviewRequired).toBe(false);
  });

  it("fails for weapons", () => {
    const r = evaluateCompliance({ ...base, title: "Tactical Knife" });
    expect(r.status).toBe("failed");
    expect(r.riskLevel).toBe("critical");
  });

  it("fails for health claims used in promotion", () => {
    const r = evaluateCompliance({ ...base, description: "Cures back pain guaranteed results" });
    expect(r.status).toBe("failed");
    expect(r.healthClaimRiskDetected).toBe(true);
  });

  it("fails when category/niche/market not allowed", () => {
    const r = evaluateCompliance({ ...base, categoryAllowed: false });
    expect(r.status).toBe("failed");
    expect(r.categoryAllowed).toBe(false);
  });
});

describe("compliance — uncertain → manual review", () => {
  it("requires manual review when program allowance unknown", () => {
    const r = evaluateCompliance({ ...base, affiliateProgramAllowsPromotion: null });
    expect(r.status).toBe("manual_review");
    expect(r.manualReviewRequired).toBe(true);
    expect(r.riskLevel).toBe("high");
  });

  it("requires manual review for financial claims", () => {
    const r = evaluateCompliance({ ...base, title: "Get rich with this course" });
    expect(r.status).toBe("manual_review");
    expect(r.financialClaimRiskDetected).toBe(true);
  });
});

describe("compliance — allowed path", () => {
  it("passes allowed, low-risk products", () => {
    const r = evaluateCompliance(base);
    expect(r.status).toBe("passed");
    expect(r.riskLevel).toBe("low");
    expect(r.disclosureRequired).toBe(false);
  });

  it("always includes the NOT-legal-advice note", () => {
    const r = evaluateCompliance(base);
    expect(r.reasons.some((x) => x.includes("NOT legal advice"))).toBe(true);
  });

  it("sets expected version", () => {
    expect(COMPLIANCE_VERSION).toBe("1.0.0");
  });
});
