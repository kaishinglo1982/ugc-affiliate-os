import { describe, it, expect } from "vitest";
import { evaluateDataQuality } from "@/features/products/domain/data-quality";
import type { DataQualityInput } from "@/features/products/domain/data-quality";
import type { ProductDataQualityIssueType } from "@/features/products/domain/types";

function baseInput(overrides: Partial<DataQualityInput> = {}): DataQualityInput {
  return {
    product: {
      canonicalName: "Wireless Earbuds",
      description: "Great sound",
      brandName: "Acme",
      categoryId: "cat-1",
      targetCountryCodes: [],
    },
    offer: {
      priceAmount: null,
      currency: null,
      commissionType: "unknown",
      commissionRate: null,
      commissionAmount: null,
      availability: "unknown",
      affiliateUrl: null,
      productUrl: null,
      lastCheckedAt: null,
      status: "active",
    },
    now: new Date("2026-07-14T00:00:00.000Z"),
    ...overrides,
  };
}

describe("data quality — missing fields", () => {
  it("flags missing price, currency, commission, availability, target market", () => {
    const r = evaluateDataQuality(baseInput());
    const types = r.issues.map((i) => i.issueType);
    expect(types).toContain("missing_price");
    expect(types).toContain("missing_currency");
    expect(types).toContain("missing_commission");
    expect(types).toContain("missing_availability");
    expect(types).toContain("missing_target_market");
  });

  it("assigns correct severities", () => {
    const r = evaluateDataQuality(
      baseInput({
        product: {
          canonicalName: "",
          description: "",
          brandName: null,
          categoryId: null,
          targetCountryCodes: [],
        },
        offer: {
          priceAmount: null,
          currency: null,
          commissionType: "unknown",
          commissionRate: null,
          commissionAmount: null,
          availability: "unknown",
          affiliateUrl: null,
          productUrl: null,
          lastCheckedAt: null,
          status: "active",
        },
      }),
    );
    const byType = new Map<ProductDataQualityIssueType, string>();
    for (const i of r.issues) byType.set(i.issueType, i.severity);
    expect(byType.get("missing_title")).toBe("high");
    expect(byType.get("missing_currency")).toBe("high");
    expect(byType.get("missing_price")).toBe("medium");
    expect(byType.get("missing_description")).toBe("low");
    expect(byType.get("missing_brand")).toBe("low");
    expect(byType.get("missing_category")).toBe("low");
  });

  it("flags missing title when product name is empty", () => {
    const r = evaluateDataQuality(
      baseInput({ product: { ...baseInput().product, canonicalName: "" } }),
    );
    expect(r.issues.some((i) => i.issueType === "missing_title")).toBe(true);
  });

  it("detects invalid product url", () => {
    const r = evaluateDataQuality(
      baseInput({ offer: { ...baseInput().offer, productUrl: "not a url" } }),
    );
    expect(r.issues.some((i) => i.issueType === "invalid_product_url")).toBe(true);
  });

  it("detects stale offers older than 30 days", () => {
    const stale = new Date("2026-01-01T00:00:00.000Z");
    const r = evaluateDataQuality(
      baseInput({ offer: { ...baseInput().offer, lastCheckedAt: stale } }),
    );
    expect(r.issues.some((i) => i.issueType === "stale_offer")).toBe(true);
    expect(r.freshnessScore).toBe(0);
  });

  it("detects conflicting identity (commission without price)", () => {
    const r = evaluateDataQuality(
      baseInput({
        offer: {
          ...baseInput().offer,
          commissionRate: null,
          commissionAmount: null,
          commissionType: "percentage",
          priceAmount: null,
        },
      }),
    );
    expect(r.issues.some((i) => i.issueType === "conflicting_identity")).toBe(true);
    expect(r.consistencyScore).toBe(0);
  });

  it("detects inactive affiliate program", () => {
    const r = evaluateDataQuality(
      baseInput({ offer: { ...baseInput().offer, status: "invalid" } }),
    );
    expect(r.issues.some((i) => i.issueType === "inactive_affiliate_program")).toBe(true);
  });
});

describe("data quality — overall score", () => {
  it("produces an overall score within 0..100", () => {
    const r = evaluateDataQuality(baseInput());
    expect(r.overallScore).toBeGreaterThanOrEqual(0);
    expect(r.overallScore).toBeLessThanOrEqual(100);
  });

  it("scores higher for complete, fresh, valid data", () => {
    const good = evaluateDataQuality(
      baseInput({
        product: {
          canonicalName: "Wireless Earbuds",
          description: "Great sound",
          brandName: "Acme",
          categoryId: "cat-1",
          targetCountryCodes: ["DE", "US"],
        },
        offer: {
          priceAmount: null,
          currency: null,
          commissionType: "percentage",
          commissionRate: null,
          commissionAmount: null,
          availability: "in_stock",
          affiliateUrl: "https://example.com/a",
          productUrl: "https://example.com/p",
          lastCheckedAt: new Date("2026-07-10T00:00:00.000Z"),
          status: "active",
        },
      }),
    );
    expect(good.freshnessScore).toBe(100);
    expect(good.identityScore).toBe(100);
    expect(good.overallScore).toBeGreaterThan(0);
  });
});
