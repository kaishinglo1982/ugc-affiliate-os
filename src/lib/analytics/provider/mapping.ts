/**
 * Per-platform metric mapping. Each platform reports a different raw vocabulary;
 * these rules translate that raw payload into `NormalizedPlatformMetrics`. The
 * mapping is versioned per platform and stored (as JSON) in
 * `AnalyticsProviderMapping` so a changed platform API can be tracked without
 * silently breaking historical comparisons. Missing raw fields become `null` —
 * they are never assumed to be `0`.
 */
import type { DecimalValue } from "@/lib/shared/decimal";
import type { AnalyticsPlatform, NormalizedPlatformMetrics } from "./types";

export type RawMetricRecord = Record<string, unknown>;

interface ProviderMapping {
  version: number;
  supportedMetrics: string[];
  map: (raw: RawMetricRecord) => NormalizedPlatformMetrics;
}

function toBigInt(value: unknown): bigint | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "bigint") return value;
  const n = typeof value === "string" ? Number(value) : (value as number);
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  return BigInt(Math.max(0, Math.round(n)));
}

function toDecimal(value: unknown): DecimalValue | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "string" ? Number(value) : (value as number);
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  return n;
}

function emptyMetrics(): NormalizedPlatformMetrics {
  return {
    impressions: null,
    reach: null,
    views: null,
    videoStarts: null,
    videoCompletions: null,
    likes: null,
    comments: null,
    shares: null,
    saves: null,
    profileVisits: null,
    linkClicks: null,
    averageWatchTimeSeconds: null,
    totalWatchTimeSeconds: null,
    completionRate: null,
  };
}

export const PROVIDER_MAPPINGS: Record<AnalyticsPlatform, ProviderMapping> = {
  INSTAGRAM: {
    version: 1,
    supportedMetrics: ["impressions", "reach", "views", "likes", "comments", "shares", "saves", "profile_visits", "link_clicks"],
    map: (raw) => ({
      ...emptyMetrics(),
      impressions: toBigInt(raw.impressions),
      reach: toBigInt(raw.reach),
      views: toBigInt(raw.video_views ?? raw.views),
      likes: toBigInt(raw.likes),
      comments: toBigInt(raw.comments),
      shares: toBigInt(raw.shares),
      saves: toBigInt(raw.saves),
      profileVisits: toBigInt(raw.profile_visits),
      linkClicks: toBigInt(raw.link_clicks),
    }),
  },
  FACEBOOK: {
    version: 1,
    supportedMetrics: ["impressions", "reach", "video_plays", "video_complete_views", "likes", "comments", "shares", "link_clicks", "profile_visits", "avg_watch_time"],
    map: (raw) => ({
      ...emptyMetrics(),
      impressions: toBigInt(raw.impressions),
      reach: toBigInt(raw.reach),
      videoStarts: toBigInt(raw.video_plays),
      videoCompletions: toBigInt(raw.video_complete_views),
      likes: toBigInt(raw.likes),
      comments: toBigInt(raw.comments),
      shares: toBigInt(raw.shares),
      linkClicks: toBigInt(raw.link_clicks),
      profileVisits: toBigInt(raw.profile_visits),
      averageWatchTimeSeconds: toDecimal(raw.avg_watch_time),
      totalWatchTimeSeconds: toDecimal(
        raw.total_watch_time ??
          (toBigInt(raw.video_plays) !== null && toDecimal(raw.avg_watch_time) !== null
            ? Number(toBigInt(raw.video_plays)) * Number(toDecimal(raw.avg_watch_time))
            : null),
      ),
    }),
  },
  TIKTOK: {
    version: 1,
    supportedMetrics: ["video_views", "video_complete_views", "likes", "comments", "shares", "profile_visits"],
    map: (raw) => ({
      ...emptyMetrics(),
      views: toBigInt(raw.video_views),
      videoStarts: toBigInt(raw.video_views),
      videoCompletions: toBigInt(raw.video_complete_views),
      likes: toBigInt(raw.likes),
      comments: toBigInt(raw.comments),
      shares: toBigInt(raw.shares),
      profileVisits: toBigInt(raw.profile_visits),
    }),
  },
  YOUTUBE_SHORTS: {
    version: 1,
    supportedMetrics: ["views", "likes", "comments", "shares", "subscribers_gained", "average_view_duration", "average_percentage_viewed"],
    map: (raw) => ({
      ...emptyMetrics(),
      views: toBigInt(raw.views),
      likes: toBigInt(raw.likes),
      comments: toBigInt(raw.comments),
      shares: toBigInt(raw.shares),
      profileVisits: toBigInt(raw.subscribers_gained),
      averageWatchTimeSeconds: toDecimal(raw.average_view_duration),
      completionRate: toDecimal(raw.average_percentage_viewed),
    }),
  },
  REDDIT: {
    version: 1,
    supportedMetrics: ["impressions", "views", "upvotes", "comments", "shares"],
    map: (raw) => ({
      ...emptyMetrics(),
      impressions: toBigInt(raw.impressions),
      views: toBigInt(raw.views),
      likes: toBigInt(raw.upvotes),
      comments: toBigInt(raw.comments),
      shares: toBigInt(raw.shares),
    }),
  },
};

export function getProviderMapping(platform: AnalyticsPlatform): ProviderMapping {
  return PROVIDER_MAPPINGS[platform];
}

/** Normalizes a raw platform payload into the internal vocabulary. */
export function normalizeMetrics(
  platform: AnalyticsPlatform,
  raw: RawMetricRecord,
): NormalizedPlatformMetrics {
  return PROVIDER_MAPPINGS[platform].map(raw);
}
