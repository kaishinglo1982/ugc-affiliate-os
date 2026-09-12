/**
 * Last-touch attribution engine.
 *
 * Pure and deterministic. Every conversion is matched to the newest touch
 * within the lookback window. Rules, in order:
 *
 * 1. Tenant isolation: a touch from another tenant can never attribute a
 *    conversion (cross-tenant rejection).
 * 2. Deduplication: one conversion per tenant + provider + provider
 *    conversion id; duplicates are reported but never attributed.
 * 3. Reversed conversions are never attributed.
 * 4. Click id match has priority; link fallback is only applied when
 *    explicitly enabled via `allowLinkFallback`.
 * 5. Touches older than the lookback window are ignored.
 *
 * Currency normalization applies optional rates; without a rate table the
 * event currency passes through unchanged and no value is silently mixed.
 */
import {
  ATTRIBUTION_VERSION,
  type AttributedConversion,
  type AttributionOptions,
  type AttributionReason,
  type AttributionResult,
  type AttributionSummary,
  type ConversionEvent,
  type ConversionStatus,
  type TrackingTouch,
} from "./types";

export const DEFAULT_LOOKBACK_HOURS = 24 * 30; // 30 days

export interface CurrencyRates {
  /** Rates to convert FROM `currencyCode` TO this currency. */
  [currencyCode: string]: number;
}

export interface AttributionDeps {
  currencyRates?: CurrencyRates;
  now?: Date;
}

const ISO_CURRENCY_RE = /^[A-Z]{3}$/;

/**
 * Normalize a currency to the target currency using the provided rates.
 * Returns the original value/currency unchanged when no rate applies —
 * currencies are never silently mixed.
 */
export function normalizeCurrency(
  value: number,
  fromCurrency: string,
  toCurrency: string | undefined,
  rates: CurrencyRates | undefined,
): { value: number; currency: string; normalized: boolean } {
  if (!toCurrency) return { value, currency: fromCurrency, normalized: false };
  if (fromCurrency === toCurrency) {
    return { value, currency: toCurrency, normalized: false };
  }
  if (!ISO_CURRENCY_RE.test(fromCurrency) || !ISO_CURRENCY_RE.test(toCurrency)) {
    return { value, currency: fromCurrency, normalized: false };
  }
  const rate = rates?.[fromCurrency];
  if (typeof rate !== "number" || rate <= 0 || !Number.isFinite(rate)) {
    return { value, currency: fromCurrency, normalized: false };
  }
  return { value: Math.round(value * rate * 100) / 100, currency: toCurrency, normalized: true };
}

function withinLookback(touch: TrackingTouch, conversion: ConversionEvent, lookbackHours: number): boolean {
  const windowMs = lookbackHours * 60 * 60 * 1000;
  const diffMs = conversion.occurredAt.getTime() - touch.occurredAt.getTime();
  return diffMs >= 0 && diffMs <= windowMs;
}

function newestFirst(a: TrackingTouch, b: TrackingTouch): number {
  return b.occurredAt.getTime() - a.occurredAt.getTime();
}

function sameTenant(touch: TrackingTouch, conversion: ConversionEvent): boolean {
  return touch.tenantId === conversion.tenantId;
}

function sameLink(touch: TrackingTouch, conversion: ConversionEvent): boolean {
  return touch.affiliateLinkId === conversion.affiliateLinkId;
}

function sameClick(touch: TrackingTouch, conversion: ConversionEvent): boolean {
  return (
    conversion.clickId !== null &&
    conversion.clickId !== undefined &&
    touch.clickId === conversion.clickId
  );
}

/**
 * Attributed conversion for one tenant. `touch` is the newest qualifying
 * touchpoint; `null` means the conversion was not attributable.
 */
export function resolveAttribution(
  touches: TrackingTouch[],
  conversions: ConversionEvent[],
  options: AttributionOptions = {},
  deps: AttributionDeps = {},
): AttributionResult {
  const lookbackHours = options.lookbackHours ?? DEFAULT_LOOKBACK_HOURS;
  const summary: AttributionSummary = {
    total: conversions.length,
    attributed: 0,
    pending: 0,
    confirmed: 0,
    reversed: 0,
    duplicate: 0,
    crossTenantRejected: 0,
    outsideLookback: 0,
    unknownClick: 0,
  };

  const seen = new Set<string>();
  const attributed: AttributedConversion[] = [];

  for (const conversion of conversions) {
    const dedupKey = `${conversion.tenantId}::${conversion.provider}::${conversion.providerConversionId}`;
    if (seen.has(dedupKey)) {
      summary.duplicate += 1;
      attributed.push(toAttributed(conversion, null, "duplicate"));
      continue;
    }
    seen.add(dedupKey);

    if (conversion.status === "reversed") {
      summary.reversed += 1;
      attributed.push(toAttributed(conversion, null, "reversed"));
      continue;
    }
    if (conversion.status === "confirmed") summary.confirmed += 1;
    else summary.pending += 1;

    const candidates = touches
      .filter((touch) => sameTenant(touch, conversion))
      .sort(newestFirst);

    if (candidates.length === 0) {
      summary.crossTenantRejected += 1;
      attributed.push(toAttributed(conversion, null, "cross_tenant"));
      continue;
    }

    let touch: TrackingTouch | null = null;
    let reason: AttributionReason = "unknown_click";

    const clickMatch = candidates.find((t) => sameClick(t, conversion));
    if (clickMatch && withinLookback(clickMatch, conversion, lookbackHours)) {
      touch = clickMatch;
      reason = "click_match";
    } else if (options.allowLinkFallback) {
      const linkMatch = candidates.find((t) => sameLink(t, conversion));
      if (linkMatch && withinLookback(linkMatch, conversion, lookbackHours)) {
        touch = linkMatch;
        reason = "link_fallback";
      }
    }

    if (!touch) {
      const hasCandidate = candidates.some((t) => withinLookback(t, conversion, lookbackHours));
      reason = hasCandidate ? "unknown_click" : "outside_lookback";
      if (reason === "outside_lookback") summary.outsideLookback += 1;
      else summary.unknownClick += 1;
      attributed.push(toAttributed(conversion, null, reason));
      continue;
    }

    summary.attributed += 1;
    attributed.push(toAttributed(conversion, touch, reason, options.currencyCode, deps.currencyRates));
  }

  return { conversions: attributed, summary };
}

function toAttributed(
  conversion: ConversionEvent,
  touch: TrackingTouch | null,
  reason: AttributionReason,
  targetCurrency?: string,
  rates?: CurrencyRates,
): AttributedConversion {
  const { value, currency } = normalizeCurrency(
    conversion.commission,
    conversion.currency,
    targetCurrency,
    rates,
  );
  return {
    conversion: { ...conversion, commission: value },
    touch,
    attributed: touch !== null,
    reason,
    currency,
  };
}

/**
 * Idempotent status transition for a single conversion in a list. `pending`
 * may become `confirmed` or `reversed`; `confirmed` may become `reversed`.
 * Reversed conversions are final. Returns a new array; unknown ids are
 * ignored (returns the input unchanged).
 */
export function markConversionStatus(
  conversions: ConversionEvent[],
  conversionId: string,
  newStatus: ConversionStatus,
): ConversionEvent[] {
  let changed = false;
  const next = conversions.map((conversion) => {
    if (conversion.conversionId !== conversionId) return conversion;
    if (conversion.status === newStatus) return conversion;
    if (conversion.status === "reversed") return conversion;
    if (conversion.status === "confirmed" && newStatus === "pending") return conversion;
    changed = true;
    return { ...conversion, status: newStatus };
  });
  return changed ? next : conversions;
}

export const attributionVersion = (): string => ATTRIBUTION_VERSION;
