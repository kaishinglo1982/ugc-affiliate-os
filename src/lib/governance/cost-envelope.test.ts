import { describe, it, expect } from "vitest";
import {
  centsFromDecimalString,
  centsToDecimalString,
  evaluateCostAgainstEnvelope,
  type CostEnvelopeSnapshot,
} from "./cost-envelope";

const activeEnvelope = (
  overrides?: Partial<CostEnvelopeSnapshot>,
): CostEnvelopeSnapshot => ({
  currency: "EUR",
  minimum: "1.00",
  maximum: "50.00",
  status: "ACTIVE",
  expiresAt: null,
  ...overrides,
});

describe("centsFromDecimalString", () => {
  it("converts 2-dp decimal strings to exact cents", () => {
    expect(centsFromDecimalString("0.00")).toBe(0);
    expect(centsFromDecimalString("12.30")).toBe(1230);
    expect(centsFromDecimalString("1234.5")).toBe(123450);
    expect(centsFromDecimalString("7")).toBe(700);
  });

  it("rejects non-money input", () => {
    expect(() => centsFromDecimalString("1.234")).toThrow();
    expect(() => centsFromDecimalString("abc")).toThrow();
  });
});

describe("centsToDecimalString", () => {
  it("round-trips with centsFromDecimalString", () => {
    for (const cents of [0, 1, 99, 100, 12345]) {
      expect(centsFromDecimalString(centsToDecimalString(cents))).toBe(cents);
    }
  });
});

describe("evaluateCostAgainstEnvelope", () => {
  it("allows a cost inside the bracket", () => {
    const decision = evaluateCostAgainstEnvelope({
      cost: "25.00",
      currency: "EUR",
      envelope: activeEnvelope(),
    });
    expect(decision).toEqual({ allowed: true, reason: "OK" });
  });

  it("rejects a missing envelope (fail-closed)", () => {
    const decision = evaluateCostAgainstEnvelope({
      cost: "25.00",
      currency: "EUR",
      envelope: null,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("MISSING_ENVELOPE");
  });

  it("rejects costs above the maximum", () => {
    const decision = evaluateCostAgainstEnvelope({
      cost: "50.01",
      currency: "EUR",
      envelope: activeEnvelope(),
    });
    expect(decision).toEqual({ allowed: false, reason: "ABOVE_MAXIMUM" });
  });

  it("rejects costs below the minimum", () => {
    const decision = evaluateCostAgainstEnvelope({
      cost: "0.99",
      currency: "EUR",
      envelope: activeEnvelope(),
    });
    expect(decision).toEqual({ allowed: false, reason: "BELOW_MINIMUM" });
  });

  it("rejects currency mismatches", () => {
    const decision = evaluateCostAgainstEnvelope({
      cost: "25.00",
      currency: "USD",
      envelope: activeEnvelope(),
    });
    expect(decision).toEqual({ allowed: false, reason: "CURRENCY_MISMATCH" });
  });

  it("rejects consumed, cancelled and expired envelopes", () => {
    for (const status of ["CONSUMED", "CANCELLED"] as const) {
      const decision = evaluateCostAgainstEnvelope({
        cost: "25.00",
        currency: "EUR",
        envelope: activeEnvelope({ status }),
      });
      expect(decision).toEqual({ allowed: false, reason: "NOT_ACTIVE" });
    }

    const past = new Date(Date.now() - 60_000);
    const decision = evaluateCostAgainstEnvelope({
      cost: "25.00",
      currency: "EUR",
      envelope: activeEnvelope({ expiresAt: past }),
      now: new Date(),
    });
    expect(decision).toEqual({ allowed: false, reason: "EXPIRED" });
  });
});
