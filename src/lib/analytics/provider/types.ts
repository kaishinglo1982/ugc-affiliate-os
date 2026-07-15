/**
 * Provider-agnostic analytics port and shared types. Adapters translate a
 * platform's raw payload into the normalized internal vocabulary defined by
 * `NormalizedPlatformMetrics` — the single vocabulary every downstream consumer
 * (aggregation, data-quality, anomaly detection) understands. No adapter may
 * leak platform-specific field names past this boundary.
 */
import type { DecimalValue } from "@/lib/shared/decimal";
import type { AnalyticsSyncFailureCode } from "./failure";

export const ANALYTICS_PLATFORMS = [
  "INSTAGRAM",
  "FACEBOOK",
  "TIKTOK",
  "YOUTUBE_SHORTS",
  "REDDIT",
] as const;

export type AnalyticsPlatform = (typeof ANALYTICS_PLATFORMS)[number];

export function isAnalyticsPlatform(value: string): value is AnalyticsPlatform {
  return (ANALYTICS_PLATFORMS as readonly string[]).includes(value);
}

/** The unified internal metric vocabulary. Every field is nullable: a missing
 *  value stays `null` and is never coerced to `0` downstream. */
export interface NormalizedPlatformMetrics {
  impressions: bigint | null;
  reach: bigint | null;
  views: bigint | null;
  videoStarts: bigint | null;
  videoCompletions: bigint | null;
  likes: bigint | null;
  comments: bigint | null;
  shares: bigint | null;
  saves: bigint | null;
  profileVisits: bigint | null;
  linkClicks: bigint | null;
  averageWatchTimeSeconds: DecimalValue | null;
  totalWatchTimeSeconds: DecimalValue | null;
  completionRate: DecimalValue | null;
}

export interface AccountMetricsRequest {
  workspaceId: string;
  socialAccountId: string;
  platform: AnalyticsPlatform;
  periodStart: Date;
  periodEnd: Date;
}

export interface PostMetricsRequest {
  workspaceId: string;
  socialAccountId: string;
  platform: AnalyticsPlatform;
  externalPostId: string;
  periodStart: Date;
  periodEnd: Date;
}

export interface AccountMetricsResult {
  socialAccountId: string;
  platform: AnalyticsPlatform;
  measuredAt: Date;
  metrics: NormalizedPlatformMetrics;
  externalSnapshotId: string | null;
}

export interface PostMetricsResult {
  socialAccountId: string;
  platform: AnalyticsPlatform;
  externalPostId: string;
  measuredAt: Date;
  metrics: NormalizedPlatformMetrics;
  externalSnapshotId: string | null;
}

export interface SupportedMetricSet {
  platform: AnalyticsPlatform;
  metrics: string[];
}

export interface AnalyticsConnectionValidationResult {
  socialAccountId: string;
  valid: boolean;
  failureCode: AnalyticsSyncFailureCode | null;
  detail: string | null;
}

export interface SocialAnalyticsPort {
  readonly platform: AnalyticsPlatform;
  readonly mode: "LIVE" | "SANDBOX" | "MOCK";
  getAccountMetrics(request: AccountMetricsRequest): Promise<AccountMetricsResult>;
  getPostMetrics(request: PostMetricsRequest): Promise<PostMetricsResult>;
  validateConnection(socialAccountId: string): Promise<AnalyticsConnectionValidationResult>;
  getSupportedMetrics(socialAccountId: string): Promise<SupportedMetricSet>;
}
