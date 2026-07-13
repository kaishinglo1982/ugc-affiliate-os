/** Pure, unit-testable affiliate link construction — no DB/network access. */

export interface UtmParams {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
}

/** Appends UTM parameters to a destination URL without clobbering existing query params. */
export function buildTrackedUrl(destinationUrl: string, utm: UtmParams): string {
  let url: URL;
  try {
    url = new URL(destinationUrl);
  } catch {
    throw new Error(`Ungültige URL: ${destinationUrl}`);
  }

  const mapping: Array<[string, string | undefined]> = [
    ["utm_source", utm.utmSource],
    ["utm_medium", utm.utmMedium],
    ["utm_campaign", utm.utmCampaign],
    ["utm_content", utm.utmContent],
    ["utm_term", utm.utmTerm],
  ];

  for (const [key, value] of mapping) {
    if (value) url.searchParams.set(key, value);
  }

  return url.toString();
}

const SLUG_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/** Short, URL-safe slug for the internal redirect abstraction (not cryptographically
 * unique on its own — callers should retry on collision). */
export function generateShortSlug(length = 7): string {
  let slug = "";
  for (let i = 0; i < length; i++) {
    slug += SLUG_ALPHABET[Math.floor(Math.random() * SLUG_ALPHABET.length)];
  }
  return slug;
}
