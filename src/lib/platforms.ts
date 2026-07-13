/**
 * Revenue/AffiliateLink store platform as free-text labels ("TikTok"), while
 * SocialAccount/SocialPost use the SocialPlatform enum ("TIKTOK"). This is the
 * single canonical mapping between the two so cross-entity filters agree.
 */
export const PLATFORM_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "TIKTOK", label: "TikTok" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "YOUTUBE_SHORTS", label: "YouTube Shorts" },
  { value: "PINTEREST", label: "Pinterest" },
  { value: "FACEBOOK", label: "Facebook" },
  { value: "REDDIT", label: "Reddit" },
  { value: "X", label: "X" },
  { value: "LINKEDIN", label: "LinkedIn" },
];

const ENUM_TO_LABEL = new Map(PLATFORM_OPTIONS.map((o) => [o.value, o.label]));
const LABEL_TO_ENUM = new Map(PLATFORM_OPTIONS.map((o) => [o.label.toLowerCase(), o.value]));

/** e.g. "TIKTOK" -> "TikTok" (falls back to the raw value for unmapped platforms). */
export function platformLabel(enumOrText: string): string {
  return ENUM_TO_LABEL.get(enumOrText) ?? enumOrText;
}

/** e.g. "TikTok" -> "TIKTOK" (falls back to the raw value for unmapped platforms). */
export function platformEnumValue(label: string): string {
  return LABEL_TO_ENUM.get(label.toLowerCase()) ?? label;
}
