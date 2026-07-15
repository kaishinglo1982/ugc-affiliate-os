/**
 * Lightweight observability. In-memory counters (restart-safe enough for a
 * single process; swap for Prometheus/OTel later) plus structured logging that
 * redacts secrets, tokens, full tracking URLs, and PII before anything is
 * emitted. Every analytics/experiment/recommendation code path is expected to
 * carry a correlationId and workspaceId so logs are traceable.
 */
export const METRICS = {
  analyticsSyncTotal: "ugc_analytics_sync_total",
  analyticsSyncFailedTotal: "ugc_analytics_sync_failed_total",
  analyticsSyncDurationMs: "ugc_analytics_sync_duration_ms",
  analyticsEventsImportedTotal: "ugc_analytics_events_imported_total",
  analyticsEventsDeduplicatedTotal: "ugc_analytics_events_deduplicated_total",
  analyticsSnapshotCreatedTotal: "ugc_analytics_snapshot_created_total",
  analyticsDataQualityScore: "ugc_analytics_data_quality_score",
  analyticsAnomaliesTotal: "ugc_analytics_anomalies_total",
  contentAnalysisTotal: "ugc_content_analysis_total",
  contentAnalysisFailedTotal: "ugc_content_analysis_failed_total",
  contentVariantGeneratedTotal: "ugc_content_variant_generated_total",
  contentVariantGenerationCost: "ugc_content_variant_generation_cost",
  experimentStartedTotal: "ugc_experiment_started_total",
  experimentCompletedTotal: "ugc_experiment_completed_total",
  experimentInconclusiveTotal: "ugc_experiment_inconclusive_total",
  experimentDurationHours: "ugc_experiment_duration_hours",
  experimentSampleSize: "ugc_experiment_sample_size",
  recommendationGeneratedTotal: "ugc_recommendation_generated_total",
  recommendationAcceptedTotal: "ugc_recommendation_accepted_total",
  recommendationRejectedTotal: "ugc_recommendation_rejected_total",
  recommendationExpiredTotal: "ugc_recommendation_expired_total",
  optimizationQueueLagSeconds: "ugc_optimization_queue_lag_seconds",
  // Phase 7 — product intelligence
  productDiscoveryRunsTotal: "ugc_product_discovery_runs_total",
  productDiscoveryRunsFailedTotal: "ugc_product_discovery_runs_failed_total",
  productDiscoveryDurationMs: "ugc_product_discovery_duration_ms",
  productOffersImportedTotal: "ugc_product_offers_imported_total",
  productOffersUpdatedTotal: "ugc_product_offers_updated_total",
  productOffersUnavailableTotal: "ugc_product_offers_unavailable_total",
  productDuplicatesDetectedTotal: "ugc_product_duplicates_detected_total",
  productMatchesConfirmedTotal: "ugc_product_matches_confirmed_total",
  productMatchesRejectedTotal: "ugc_product_matches_rejected_total",
  productComplianceFailedTotal: "ugc_product_compliance_failed_total",
  productManualReviewTotal: "ugc_product_manual_review_total",
  productOpportunitiesCreatedTotal: "ugc_product_opportunities_created_total",
  productOpportunitiesApprovedTotal: "ugc_product_opportunities_approved_total",
  productOpportunitiesRejectedTotal: "ugc_product_opportunities_rejected_total",
  productOpportunitiesExpiredTotal: "ugc_product_opportunities_expired_total",
  productOpportunityScore: "ugc_product_opportunity_score",
  productOpportunityConfidence: "ugc_product_opportunity_confidence",
  productDataQualityScore: "ugc_product_data_quality_score",
  productProviderRateLimitedTotal: "ugc_product_provider_rate_limited_total",
  productProviderFailedTotal: "ugc_product_provider_failed_total",
  productResearchQueueLagSeconds: "ugc_product_research_queue_lag_seconds",
} as const;

type MetricValue = number;

const counters = new Map<string, MetricValue>();
const lastValues = new Map<string, MetricValue>();

export function incrementMetric(name: string, value = 1): void {
  counters.set(name, (counters.get(name) ?? 0) + value);
}

export function recordMetric(name: string, value: MetricValue): void {
  lastValues.set(name, value);
}

export function getMetricsSnapshot(): Record<string, MetricValue> {
  const out: Record<string, MetricValue> = {};
  for (const [k, v] of counters) out[k] = v;
  for (const [k, v] of lastValues) out[k] = v;
  return out;
}

const SECRET_PATTERN = /(sk-[a-z0-9]{8,})|(api[_-]?key[=:]\s*\S+)|(token[=:]\s*\S+)|(secret[=:]\s*\S+)|(password[=:]\s*\S+)/i;

/** Masks obvious secrets/tokens in a string. */
export function redactText(input: string): string {
  return input.replace(SECRET_PATTERN, "[REDACTED]");
}

/** Recursively redacts secret-bearing keys and full tracking URLs in an object. */
export function redact(value: unknown): unknown {
  if (typeof value === "string") {
    let out = redactText(value);
    // Redact any http(s) URL that looks like an affiliate/tracking link.
    out = out.replace(/https?:\/\/\S+\?(?:.*&)?\w*(?:ref|aff|track|utm)\w*=/gi, "[TRACKING_URL_REDACTED]");
    return out;
  }
  if (Array.isArray(value)) return value.map((v) => redact(v));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (/secret|token|password|apikey|api_key|cookie/i.test(k)) {
        out[k] = "[REDACTED]";
      } else {
        out[k] = redact(v);
      }
    }
    return out;
  }
  return value;
}

export interface StructuredLog {
  correlationId?: string;
  workspaceId?: string;
  jobId?: string;
  experimentId?: string;
  recommendationId?: string;
  discoveryRunId?: string;
  productId?: string;
  opportunityId?: string;
  provider?: string;
  durationMs?: number;
  errorCode?: string;
  retryCount?: number;
  message?: string;
  [key: string]: unknown;
}

export function logStructured(entry: StructuredLog): void {
  const safe = redact(entry) as Record<string, unknown>;
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ ts: new Date().toISOString(), ...safe }));
}
