/**
 * Safe currency-normalization result for financially-relevant callers.
 *
 * `normalizeCurrency()` in `attribution.ts` intentionally passes an unchanged
 * value/currency through when no exchange rate is configured — that is the
 * right default for a display/attribution-matching context, where silently
 * mixing currencies would be worse than showing the original one. It is the
 * WRONG default for a caller about to persist or report a financial number,
 * because "unchanged" and "correctly converted" become indistinguishable.
 *
 * `normalizeCurrencyStrict()` wraps the same conversion but returns a
 * discriminated result instead of a bare value, so a financially-relevant
 * caller cannot accidentally treat a missing rate as a successful
 * conversion. `normalizeCurrency()` itself is unchanged — this is an
 * additive, opt-in variant with no existing caller.
 */
import { normalizeCurrency, type CurrencyRates } from "./attribution";

export type CurrencyNormalizationResult =
  | { ok: true; value: number; currency: string }
  | { ok: false; reason: "same_currency_no_conversion_needed"; value: number; currency: string }
  | { ok: false; reason: "no_target_currency_requested"; value: number; currency: string }
  | { ok: false; reason: "invalid_currency_code"; fromCurrency: string; toCurrency: string }
  | { ok: false; reason: "rate_unavailable"; fromCurrency: string; toCurrency: string };

const ISO_CURRENCY_RE = /^[A-Z]{3}$/;

/**
 * Strict variant of `normalizeCurrency`: only `ok: true` means an actual
 * conversion happened using a configured rate. Every other outcome is a
 * distinct, named reason a financially-relevant caller must handle
 * explicitly instead of assuming the returned value is comparable across
 * currencies.
 */
export function normalizeCurrencyStrict(
  value: number,
  fromCurrency: string,
  toCurrency: string | undefined,
  rates: CurrencyRates | undefined,
): CurrencyNormalizationResult {
  if (!toCurrency) {
    return { ok: false, reason: "no_target_currency_requested", value, currency: fromCurrency };
  }
  if (fromCurrency === toCurrency) {
    return { ok: false, reason: "same_currency_no_conversion_needed", value, currency: toCurrency };
  }
  if (!ISO_CURRENCY_RE.test(fromCurrency) || !ISO_CURRENCY_RE.test(toCurrency)) {
    return { ok: false, reason: "invalid_currency_code", fromCurrency, toCurrency };
  }
  const rate = rates?.[fromCurrency];
  if (typeof rate !== "number" || rate <= 0 || !Number.isFinite(rate)) {
    return { ok: false, reason: "rate_unavailable", fromCurrency, toCurrency };
  }
  const result = normalizeCurrency(value, fromCurrency, toCurrency, rates);
  return { ok: true, value: result.value, currency: result.currency };
}
