import { describe, expect, it } from "vitest";
import {
  calculateProfitability,
  roundMoney,
  roundRatio,
} from "@/lib/commerce-core/profitability";
import { profitabilityInputSchema } from "@/lib/commerce-core/types";

const base = {
  currency: "EUR",
  confirmedCommission: 0,
  openCommission: 0,
  refunds: 0,
  chargebacks: 0,
  costs: {
    advertising: 0,
    video: 0,
    voice: 0,
    models: 0,
    platform: 0,
    creator: 0,
    software: 0,
  },
  clicks: 0,
  conversions: 0,
};

describe("calculateProfitability", () => {
  it("computes a profitable case", () => {
    const snapshot = calculateProfitability({
      ...base,
      confirmedCommission: 500,
      costs: {
        advertising: 100,
        video: 40,
        voice: 10,
        models: 20,
        platform: 5,
        creator: 25,
        software: 0,
      },
      clicks: 1000,
      conversions: 25,
    });
    expect(snapshot.netCommission).toBe(500);
    expect(snapshot.totalCost).toBe(200);
    expect(snapshot.contributionMargin).toBe(300);
    expect(snapshot.epc).toBe(0.5);
    expect(snapshot.cpa).toBe(8);
    expect(snapshot.roas).toBe(2.5);
    expect(snapshot.conversionRate).toBe(0.025);
  });

  it("computes a loss case with negative margin", () => {
    const snapshot = calculateProfitability({
      ...base,
      confirmedCommission: 100,
      costs: { ...base.costs, advertising: 250 },
      clicks: 500,
      conversions: 5,
    });
    expect(snapshot.contributionMargin).toBe(-150);
    expect(snapshot.roas).toBe(0.4);
  });

  it("returns null ratios when there are no clicks", () => {
    const snapshot = calculateProfitability({
      ...base,
      confirmedCommission: 100,
      costs: { ...base.costs, video: 10 },
      clicks: 0,
      conversions: 0,
    });
    expect(snapshot.epc).toBeNull();
    expect(snapshot.cpa).toBeNull();
    expect(snapshot.conversionRate).toBeNull();
    expect(snapshot.roas).toBe(10);
  });

  it("returns null ratios when there are no conversions", () => {
    const snapshot = calculateProfitability({
      ...base,
      confirmedCommission: 100,
      costs: { ...base.costs, advertising: 50 },
      clicks: 100,
      conversions: 0,
    });
    expect(snapshot.cpa).toBeNull();
    expect(snapshot.conversionRate).toBe(0);
  });

  it("handles zero costs with null ROAS", () => {
    const snapshot = calculateProfitability({
      ...base,
      confirmedCommission: 100,
      clicks: 10,
      conversions: 2,
    });
    expect(snapshot.totalCost).toBe(0);
    expect(snapshot.roas).toBeNull();
    expect(snapshot.epc).toBe(10);
    expect(snapshot.conversionRate).toBe(0.2);
  });

  it("applies refunds and chargebacks to the net commission", () => {
    const snapshot = calculateProfitability({
      ...base,
      confirmedCommission: 300,
      refunds: 50,
      chargebacks: 30,
      costs: { ...base.costs, creator: 100 },
      clicks: 300,
      conversions: 10,
    });
    expect(snapshot.netCommission).toBe(220);
    expect(snapshot.totalCost).toBe(100);
    expect(snapshot.contributionMargin).toBe(120);
  });

  it("does not include open commissions in realized margin", () => {
    const snapshot = calculateProfitability({
      ...base,
      confirmedCommission: 100,
      openCommission: 900,
      clicks: 100,
      conversions: 10,
    });
    expect(snapshot.netCommission).toBe(100);
  });

  it("rounds money to cents and ratios to 4 decimals", () => {
    expect(roundMoney(1.005)).toBe(1.01);
    expect(roundMoney(1.004)).toBe(1.0);
    expect(roundRatio(0.123456)).toBe(0.1235);
    const snapshot = calculateProfitability({
      ...base,
      confirmedCommission: 100.009,
      costs: { ...base.costs, advertising: 30.004 },
      clicks: 7,
      conversions: 3,
    });
    expect(snapshot.netCommission).toBe(100.01);
    expect(snapshot.totalCost).toBe(30.0);
    expect(snapshot.epc).toBe(14.2871);
  });

  it("produces deterministic output", () => {
    const input = {
      ...base,
      confirmedCommission: 250,
      costs: { ...base.costs, advertising: 80, video: 20 },
      clicks: 500,
      conversions: 12,
    };
    expect(calculateProfitability(input)).toEqual(calculateProfitability(input));
  });

  it("rejects negative commissions and costs via zod", () => {
    expect(() => calculateProfitability({ ...base, confirmedCommission: -5 })).toThrow();
    expect(() =>
      calculateProfitability({ ...base, costs: { ...base.costs, advertising: -1 } }),
    ).toThrow();
    expect(() => calculateProfitability({ ...base, refunds: -1 })).toThrow();
    expect(() => calculateProfitability({ ...base, clicks: -1 })).toThrow();
  });

  it("validates the schema independently", () => {
    expect(profitabilityInputSchema.safeParse(base).success).toBe(true);
    expect(
      profitabilityInputSchema.safeParse({ ...base, confirmedCommission: -1 }).success,
    ).toBe(false);
    expect(profitabilityInputSchema.safeParse({ ...base, currency: "EUR" }).success).toBe(true);
  });
});
