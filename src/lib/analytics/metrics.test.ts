import { describe, it, expect } from "vitest";
import { Decimal } from "@/lib/shared/decimal";
import {
  safeRatio,
  computeContentMetrics,
  METRIC_DEFINITIONS,
  METRIC_FORMULA_VERSION,
  getMetricDefinition,
} from "@/lib/analytics/metrics";

describe("safeRatio", () => {
  it("returns null when the denominator is zero", () => {
    expect(safeRatio(5n, 0n)).toBeNull();
  });

  it("returns null when the denominator is null (never assumes 0)", () => {
    expect(safeRatio(5n, null)).toBeNull();
  });

  it("returns null when the numerator is null (never assumes 0)", () => {
    expect(safeRatio(null, 10n)).toBeNull();
  });

  it("divides correctly with full precision", () => {
    const r = safeRatio(1n, 3n);
    expect(r?.eq(new Decimal(1).div(3))).toBe(true);
    expect(r?.toFixed(10)).toBe("0.3333333333");
  });

  it("handles Decimal numerator and denominator", () => {
    const r = safeRatio(new Decimal("10.5"), new Decimal("2"));
    expect(r?.toString()).toBe("5.25");
  });
});

describe("computeContentMetrics", () => {
  const base = {
    impressions: 1000n,
    views: 800n,
    engagements: 50n,
    linkClicks: 40n,
    conversions: 8n,
    videoStarts: 700n,
    videoCompletions: 350n,
    commissionRevenue: new Decimal("120.00"),
    estimatedNetRevenue: new Decimal("60.00"),
    attributedCosts: new Decimal("30.00"),
    publishedPosts: 10n,
  };

  it("computes every ratio", () => {
    const m = computeContentMetrics(base);
    expect(m.engagementRate?.toString()).toBe("0.05");
    expect(m.clickThroughRate?.toString()).toBe("0.04");
    expect(m.conversionRate?.toString()).toBe("0.2");
    expect(m.completionRate?.toString()).toBe("0.5");
    expect(m.revenuePerView?.toString()).toBe("0.15");
    expect(m.revenuePerClick?.toString()).toBe("3");
    expect(m.revenuePerPost?.toString()).toBe("12");
    expect(m.returnOnContentSpend?.toString()).toBe("2");
  });

  it("returns null for a ratio whose denominator is missing", () => {
    const m = computeContentMetrics({ ...base, impressions: 0n });
    expect(m.engagementRate).toBeNull();
    expect(m.clickThroughRate).toBeNull();
  });

  it("returns null for revenue per post when no posts exist", () => {
    const m = computeContentMetrics({ ...base, publishedPosts: 0n });
    expect(m.revenuePerPost).toBeNull();
  });
});

describe("metric definitions", () => {
  it("are versioned and complete", () => {
    expect(METRIC_DEFINITIONS).toHaveLength(8);
    for (const def of METRIC_DEFINITIONS) {
      expect(def.version).toBe(METRIC_FORMULA_VERSION);
      expect(def.formula.length).toBeGreaterThan(0);
      expect(def.definition.length).toBeGreaterThan(0);
    }
  });

  it("resolves by id", () => {
    expect(getMetricDefinition("ENGAGEMENT_RATE").label).toBe("Engagement Rate");
  });
});
