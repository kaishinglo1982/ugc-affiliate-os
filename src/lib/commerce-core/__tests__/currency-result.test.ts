import { describe, expect, it } from "vitest";
import { normalizeCurrencyStrict } from "@/lib/commerce-core/currency-result";

describe("normalizeCurrencyStrict", () => {
  it("returns ok:true only when a real rate was applied", () => {
    const result = normalizeCurrencyStrict(100, "USD", "EUR", { USD: 0.9 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(90);
      expect(result.currency).toBe("EUR");
    }
  });

  it("never silently reports success when the exchange rate is missing", () => {
    const result = normalizeCurrencyStrict(100, "USD", "EUR", undefined);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("rate_unavailable");
    }
  });

  it("never silently reports success when the rate table has no entry for the source currency", () => {
    const result = normalizeCurrencyStrict(100, "USD", "EUR", { GBP: 0.8 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("rate_unavailable");
  });

  it("distinguishes same-currency (no conversion needed) from a missing rate", () => {
    const result = normalizeCurrencyStrict(100, "EUR", "EUR", undefined);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("same_currency_no_conversion_needed");
  });

  it("distinguishes no target currency requested from a missing rate", () => {
    const result = normalizeCurrencyStrict(100, "USD", undefined, { USD: 0.9 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("no_target_currency_requested");
  });

  it("rejects non-ISO currency codes distinctly from a missing rate", () => {
    const result = normalizeCurrencyStrict(100, "usd", "EUR", { usd: 0.9 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid_currency_code");
  });

  it("rejects a non-positive or non-finite rate the same as a missing rate", () => {
    const zero = normalizeCurrencyStrict(100, "USD", "EUR", { USD: 0 });
    const negative = normalizeCurrencyStrict(100, "USD", "EUR", { USD: -1 });
    const infinite = normalizeCurrencyStrict(100, "USD", "EUR", { USD: Number.POSITIVE_INFINITY });
    for (const result of [zero, negative, infinite]) {
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("rate_unavailable");
    }
  });
});
