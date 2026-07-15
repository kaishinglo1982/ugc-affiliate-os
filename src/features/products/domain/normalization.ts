/**
 * Framework-free text / URL / currency normalization for product data.
 *
 * No Next.js, Prisma, React, or provider SDKs are imported here. Money/rating
 * values are typed as `Decimal` (from `@/lib/shared/decimal`); unknown/missing
 * values stay `null`. All functions are pure and deterministic.
 */
import { Decimal } from "@/lib/shared/decimal";
import type { NormalizedOffer, CommissionType, Availability } from "@/features/products/domain/types";

/** Query params that leak affiliate identity / tracking and must be stripped. */
export const RESTRICTED_URL_PARAMS: Set<string> = new Set([
  "ref",
  "aff",
  "af",
  "aff_id",
  "tag",
  "utm_*",
  "clickid",
  "subid",
  "sid",
  "tracking",
  "clk",
  "trk",
  "gclid",
  "fbclid",
  "msclkid",
  "twclid",
  "scid",
  "mc_*",
  "igshid",
  "via",
]);

const HTML_TAG_RE = /<[^>]*>/g;
const WHITESPACE_RE = /\s+/g;
const ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&#x27;": "'",
  "&#x2F;": "/",
  "&#47;": "/",
  "&apos;": "'",
  "&nbsp;": " ",
};
const NAMED_ENTITY_RE = /&(?:amp|lt|gt|quot|#39|#x27|#x2F|#47|apos|nbsp);/g;
const NUMERIC_ENTITY_RE = /&#(\d+);|&#x([0-9a-fA-F]+);/g;

export function stripHtml(input: string): string {
  if (!input) return "";
  let out = input.replace(HTML_TAG_RE, " ");
  out = out.replace(NAMED_ENTITY_RE, (m) => ENTITY_MAP[m] ?? m);
  out = out.replace(NUMERIC_ENTITY_RE, (_m, dec: string | undefined, hex: string | undefined) => {
    const code = dec !== undefined ? Number(dec) : Number.parseInt(hex ?? "", 16);
    if (!Number.isFinite(code)) return _m;
    try {
      return String.fromCodePoint(code);
    } catch {
      return _m;
    }
  });
  return normalizeWhitespace(out);
}

export function normalizeWhitespace(input: string): string {
  return input.replace(WHITESPACE_RE, " ").trim();
}

export function normalizeUnicode(input: string): string {
  if (!input) return "";
  return input.normalize("NFKC");
}

export function normalizeProductName(input: string): string {
  const cleaned = normalizeWhitespace(normalizeUnicode(stripHtml(input)));
  return cleaned.length > 500 ? cleaned.slice(0, 500).trim() : cleaned;
}

export function normalizeBrand(input: string | null): string | null {
  if (input === null || input.trim() === "") return null;
  const cleaned = normalizeWhitespace(normalizeUnicode(stripHtml(input)));
  return cleaned === "" ? null : cleaned;
}

export function normalizeManufacturer(input: string | null): string | null {
  return normalizeBrand(input);
}

export function normalizeDescription(input: string | null): string | null {
  if (input === null || input.trim() === "") return null;
  let cleaned = normalizeWhitespace(normalizeUnicode(stripHtml(input)));
  if (cleaned.length > 5000) cleaned = cleaned.slice(0, 5000).trim();
  return cleaned === "" ? null : cleaned;
}

function isRestrictedParam(name: string): boolean {
  const lower = name.toLowerCase();
  if (RESTRICTED_URL_PARAMS.has(lower)) return true;
  for (const p of RESTRICTED_URL_PARAMS) {
    if (p.endsWith("*") && lower.startsWith(p.slice(0, -1))) return true;
  }
  return false;
}

export function stripTrackingParams(input: string): string {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return input;
  }
  const kept: Array<[string, string]> = [];
  url.searchParams.forEach((value, key) => {
    if (!isRestrictedParam(key)) kept.push([key, value]);
  });
  const newUrl = new URL(url.origin + url.pathname);
  for (const [k, v] of kept) newUrl.searchParams.append(k, v);
  return newUrl.toString();
}

export function validateUrl(input: string | null): { valid: boolean; safe: boolean; reason?: string } {
  if (!input) return { valid: false, safe: false, reason: "empty" };
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { valid: false, safe: false, reason: "invalid_url" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { valid: false, safe: false, reason: "unsupported_protocol" };
  }
  const host = url.hostname.toLowerCase();
  const isPrivate =
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "[::1]" ||
    host === "0.0.0.0" ||
    host.endsWith(".local") ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^169\.254\./.test(host);
  if (isPrivate) {
    return { valid: false, safe: false, reason: "private_host" };
  }
  let hasRestricted = false;
  url.searchParams.forEach((_value, key) => {
    if (isRestrictedParam(key)) hasRestricted = true;
  });
  return { valid: true, safe: !hasRestricted, reason: hasRestricted ? "tracking_params_present" : undefined };
}

export function normalizeUrl(input: string | null): string | null {
  if (!input) return null;
  const result = validateUrl(input);
  if (!result.valid) return null;
  return stripTrackingParams(input);
}

export const ISO4217_REGEX = /^[A-Z]{3}$/;

/** A reasonable set of commonly traded ISO-4217 codes (~40). */
export const KNOWN_CURRENCIES: Set<string> = new Set([
  "USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "NZD", "CNY", "HKD",
  "SGD", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "RON", "BGN", "TRY",
  "RUB", "INR", "BRL", "MXN", "ZAR", "KRW", "TWD", "THB", "MYR", "IDR",
  "PHP", "VND", "AED", "SAR", "ILS", "UAH", "ISK", "HRK", "ISK", "QAR",
  "KWD", "CLP", "COP", "ARS", "EGP", "NGN", "MAD", "CZK",
]);

export function validateCurrency(code: string | null): boolean {
  if (!code) return false;
  if (!ISO4217_REGEX.test(code)) return false;
  return KNOWN_CURRENCIES.has(code);
}

/** ~100 common ISO-3166-1 alpha-2 country codes. */
export const KNOWN_COUNTRY_CODES: Set<string> = new Set([
  "AD", "AE", "AL", "AO", "AR", "AT", "AU", "BA", "BB", "BE", "BG", "BH", "BO", "BR",
  "CA", "CH", "CL", "CN", "CO", "CR", "CY", "CZ", "DE", "DK", "DO", "DZ", "EC", "EE",
  "EG", "ES", "FI", "FR", "GB", "GD", "GE", "GH", "GR", "GT", "HK", "HN", "HU", "ID",
  "IE", "IL", "IN", "IS", "IT", "JM", "JO", "JP", "KE", "KR", "KW", "KY", "KZ", "LB",
  "LC", "LI", "LK", "LT", "LU", "LV", "MA", "MC", "MD", "ME", "MG", "MK", "ML", "MT",
  "MU", "MX", "MY", "MZ", "NA", "NG", "NI", "NL", "NO", "NZ", "OM", "PA", "PE", "PG",
  "PH", "PK", "PL", "PT", "QA", "RO", "RS", "RU", "SA", "SE", "SG", "SI", "SK", "SM",
  "SN", "SV", "TH", "TN", "TR", "TW", "UA", "UG", "US", "UY", "VA", "VC", "VE", "VN",
  "ZA", "ZM", "ZW",
]);

export function validateCountryCode(code: string): boolean {
  return /^[A-Z]{2}$/.test(code) && KNOWN_COUNTRY_CODES.has(code);
}

export function validateLanguageCode(code: string): boolean {
  return /^[a-z]{2}$/.test(code);
}

const RATING_MAX = new Decimal(5);
const RATING_MIN = new Decimal(0);

function clampRating(value: Decimal | null): Decimal | null {
  if (value === null) return null;
  if (value.gt(RATING_MAX)) return RATING_MAX;
  if (value.lt(RATING_MIN)) return RATING_MIN;
  return value;
}

function clampRatingCount(value: bigint | null): bigint | null {
  if (value === null) return null;
  return value < 0n ? 0n : value;
}

export function normalizeOffer(offer: NormalizedOffer): NormalizedOffer {
  const currencyValid = validateCurrency(offer.currency);
  return {
    ...offer,
    title: normalizeProductName(offer.title),
    description: normalizeDescription(offer.description),
    productUrl: normalizeUrl(offer.productUrl) ?? offer.productUrl,
    affiliateUrl: offer.affiliateUrl === null ? null : (normalizeUrl(offer.affiliateUrl) ?? offer.affiliateUrl),
    currency: currencyValid ? offer.currency : null,
    averageRating: clampRating(offer.averageRating),
    ratingCount: clampRatingCount(offer.ratingCount),
  };
}

export type { CommissionType, Availability };
