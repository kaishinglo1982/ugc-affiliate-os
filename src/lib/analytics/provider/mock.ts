/**
 * Mock analytics adapters for the five supported platforms. They return
 * deterministic, normalized metrics derived from the request so tests and the
 * dashboard are reproducible (no live network, no fake engagement). Live
 * adapters are skeletons disabled by default and throw a clear, structured
 * error rather than calling a real API.
 */
import { normalizeMetrics, getProviderMapping, type RawMetricRecord } from "./mapping";
import { AnalyticsSyncError } from "./failure";
import type {
  AnalyticsPlatform,
  AccountMetricsRequest,
  AccountMetricsResult,
  PostMetricsRequest,
  PostMetricsResult,
  SocialAnalyticsPort,
  SupportedMetricSet,
  AnalyticsConnectionValidationResult,
} from "./types";

function seededInt(seed: string, min: number, max: number): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return min + (h % (max - min + 1));
}

export class MockSocialAnalyticsAdapter implements SocialAnalyticsPort {
  readonly platform: AnalyticsPlatform;
  readonly mode = "MOCK" as const;

  constructor(platform: AnalyticsPlatform) {
    this.platform = platform;
  }

  private buildRaw(seed: string): RawMetricRecord {
    const supported = getProviderMapping(this.platform).supportedMetrics;
    const raw: RawMetricRecord = {};
    for (const metric of supported) {
      switch (metric) {
        case "impressions":
          raw.impressions = seededInt(seed + "imp", 5_000, 200_000);
          break;
        case "reach":
          raw.reach = seededInt(seed + "reach", 3_000, 150_000);
          break;
        case "views":
        case "video_views":
          raw[metric] = seededInt(seed + "views", 1_000, 80_000);
          break;
        case "video_plays":
          raw.video_plays = seededInt(seed + "plays", 1_000, 80_000);
          break;
        case "video_complete_views":
          raw.video_complete_views = seededInt(seed + "comp", 200, 40_000);
          break;
        case "likes":
        case "upvotes":
          raw[metric] = seededInt(seed + "likes", 50, 9_000);
          break;
        case "comments":
          raw.comments = seededInt(seed + "comments", 5, 1_200);
          break;
        case "shares":
          raw.shares = seededInt(seed + "shares", 2, 800);
          break;
        case "saves":
          raw.saves = seededInt(seed + "saves", 1, 600);
          break;
        case "profile_visits":
        case "subscribers_gained":
        case "profile_visits_test":
          raw[metric] = seededInt(seed + "prof", 10, 1_500);
          break;
        case "link_clicks":
          raw.link_clicks = seededInt(seed + "clicks", 20, 3_000);
          break;
        case "avg_watch_time":
        case "average_view_duration":
          raw[metric] = seededInt(seed + "watch", 3, 45);
          break;
        case "average_percentage_viewed":
          raw.average_percentage_viewed = seededInt(seed + "pct", 20, 90) / 100;
          break;
        default:
          break;
      }
    }
    return raw;
  }

  async getAccountMetrics(request: AccountMetricsRequest): Promise<AccountMetricsResult> {
    const seed = `${request.socialAccountId}:${request.periodStart.toISOString()}`;
    const raw = this.buildRaw(seed);
    return {
      socialAccountId: request.socialAccountId,
      platform: this.platform,
      measuredAt: new Date(),
      metrics: normalizeMetrics(this.platform, raw),
      externalSnapshotId: `mock-acct-${request.socialAccountId}`,
    };
  }

  async getPostMetrics(request: PostMetricsRequest): Promise<PostMetricsResult> {
    const seed = `${request.externalPostId}:${request.periodStart.toISOString()}`;
    const raw = this.buildRaw(seed);
    return {
      socialAccountId: request.socialAccountId,
      platform: this.platform,
      externalPostId: request.externalPostId,
      measuredAt: new Date(),
      metrics: normalizeMetrics(this.platform, raw),
      externalSnapshotId: `mock-post-${request.externalPostId}`,
    };
  }

  async validateConnection(_socialAccountId: string): Promise<AnalyticsConnectionValidationResult> {
    return { socialAccountId: _socialAccountId, valid: true, failureCode: null, detail: null };
  }

  async getSupportedMetrics(_socialAccountId: string): Promise<SupportedMetricSet> {
    return { platform: this.platform, metrics: getProviderMapping(this.platform).supportedMetrics };
  }
}

/**
 * Live adapter skeleton. Intentionally NOT implemented — live analytics
 * integrations stay disabled by default (SOCIAL_ANALYTICS_LIVE_ADAPTERS_ENABLED).
 * Every method fails with a structured error so the sync worker applies the
 * correct (non-retrying) policy instead of silently calling a real API.
 */
export class LiveSocialAnalyticsAdapter implements SocialAnalyticsPort {
  readonly platform: AnalyticsPlatform;
  readonly mode = "LIVE" as const;

  constructor(platform: AnalyticsPlatform) {
    this.platform = platform;
  }

  private notImplemented(): never {
    throw new AnalyticsSyncError(
      "PLATFORM_UNAVAILABLE",
      `Live analytics adapter for ${this.platform} is not implemented.`,
    );
  }

  getAccountMetrics(): Promise<AccountMetricsResult> {
    return this.notImplemented();
  }
  getPostMetrics(): Promise<PostMetricsResult> {
    return this.notImplemented();
  }
  validateConnection(): Promise<AnalyticsConnectionValidationResult> {
    return this.notImplemented();
  }
  getSupportedMetrics(): Promise<SupportedMetricSet> {
    return this.notImplemented();
  }
}

export function resolveAnalyticsProvider(
  platform: AnalyticsPlatform,
  mode: "LIVE" | "SANDBOX" | "MOCK",
): SocialAnalyticsPort {
  if (mode === "LIVE") return new LiveSocialAnalyticsAdapter(platform);
  return new MockSocialAnalyticsAdapter(platform);
}
