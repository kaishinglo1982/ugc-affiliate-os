/**
 * Data quality scoring. Every score is in [0,1]; the overall score is a weighted
 * combination of four sub-scores. Issues are detected explicitly with severity
 * so dashboards can block recommendations when quality is too low. Scores are
 * conservative: unknown data is penalized, never assumed good.
 */
import type { AnomalySeverity, DataQualityIssueType } from "@/generated/prisma/client";

export interface DataQualityInput {
  totalExpectedMetrics: number;
  presentMetrics: number;
  staleMetricCount: number;
  duplicateEventCount: number;
  currencyMismatchCount: number;
  missingAttributionCount: number;
  invalidTimestampCount: number;
  orphanedPostCount: number;
  orphanedTransactionCount: number;
  providerMappingErrorCount: number;
  unexpectedNegativeCount: number;
  hoursSinceLastSync: number;
  freshnessThresholdHours: number;
}

export interface DataQualityScores {
  completeness: number;
  consistency: number;
  freshness: number;
  attribution: number;
  overall: number;
}

export interface DataQualityIssueDraft {
  issueType: DataQualityIssueType;
  severity: AnomalySeverity;
  detail: string;
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export function computeDataQualityScores(input: DataQualityInput): DataQualityScores {
  const completeness =
    input.totalExpectedMetrics === 0 ? 1 : clamp01(input.presentMetrics / input.totalExpectedMetrics);

  const consistencyPenalties =
    input.duplicateEventCount +
    input.currencyMismatchCount +
    input.providerMappingErrorCount +
    input.invalidTimestampCount +
    input.unexpectedNegativeCount;
  const consistencyBase = Math.max(input.totalExpectedMetrics, 1);
  const consistency = clamp01(1 - consistencyPenalties / (consistencyBase * 2));

  const freshness =
    input.freshnessThresholdHours <= 0
      ? 0
      : clamp01(1 - input.hoursSinceLastSync / input.freshnessThresholdHours);

  const attribution =
    input.totalExpectedMetrics === 0 ? 1 : clamp01(1 - input.missingAttributionCount / input.totalExpectedMetrics);

  const overall =
    completeness * 0.3 + consistency * 0.3 + freshness * 0.2 + attribution * 0.2;

  return {
    completeness: round3(completeness),
    consistency: round3(consistency),
    freshness: round3(freshness),
    attribution: round3(attribution),
    overall: round3(overall),
  };
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function severityFor(count: number, highThreshold: number): AnomalySeverity {
  if (count <= 0) return "LOW";
  return count >= highThreshold ? "HIGH" : "MEDIUM";
}

export function detectDataQualityIssues(input: DataQualityInput): DataQualityIssueDraft[] {
  const issues: DataQualityIssueDraft[] = [];

  if (input.totalExpectedMetrics > 0 && input.presentMetrics < input.totalExpectedMetrics) {
    issues.push({
      issueType: "MISSING_METRICS",
      severity: severityFor(input.totalExpectedMetrics - input.presentMetrics, 5),
      detail: `${input.totalExpectedMetrics - input.presentMetrics} erwartete Metriken fehlen.`,
    });
  }
  if (input.staleMetricCount > 0) {
    issues.push({
      issueType: "STALE_METRICS",
      severity: severityFor(input.staleMetricCount, 5),
      detail: `${input.staleMetricCount} Metriken sind veraltet.`,
    });
  }
  if (input.duplicateEventCount > 0) {
    issues.push({
      issueType: "DUPLICATE_EVENTS",
      severity: severityFor(input.duplicateEventCount, 10),
      detail: `${input.duplicateEventCount} doppelte Events erkannt.`,
    });
  }
  if (input.currencyMismatchCount > 0) {
    issues.push({
      issueType: "CURRENCY_MISMATCH",
      severity: severityFor(input.currencyMismatchCount, 3),
      detail: `${input.currencyMismatchCount} Währungsabweichungen.`,
    });
  }
  if (input.missingAttributionCount > 0) {
    issues.push({
      issueType: "MISSING_ATTRIBUTION",
      severity: severityFor(input.missingAttributionCount, 5),
      detail: `${input.missingAttributionCount} fehlende Attributionen.`,
    });
  }
  if (input.invalidTimestampCount > 0) {
    issues.push({
      issueType: "INVALID_TIMESTAMP",
      severity: severityFor(input.invalidTimestampCount, 3),
      detail: `${input.invalidTimestampCount} ungültige Zeitstempel.`,
    });
  }
  if (input.orphanedPostCount > 0) {
    issues.push({
      issueType: "ORPHANED_POST",
      severity: severityFor(input.orphanedPostCount, 3),
      detail: `${input.orphanedPostCount} verwaiste Posts.`,
    });
  }
  if (input.orphanedTransactionCount > 0) {
    issues.push({
      issueType: "ORPHANED_TRANSACTION",
      severity: severityFor(input.orphanedTransactionCount, 3),
      detail: `${input.orphanedTransactionCount} verwaiste Transaktionen.`,
    });
  }
  if (input.providerMappingErrorCount > 0) {
    issues.push({
      issueType: "PROVIDER_MAPPING_ERROR",
      severity: severityFor(input.providerMappingErrorCount, 3),
      detail: `${input.providerMappingErrorCount} Mapping-Fehler.`,
    });
  }
  if (input.unexpectedNegativeCount > 0) {
    issues.push({
      issueType: "UNEXPECTED_NEGATIVE_VALUE",
      severity: severityFor(input.unexpectedNegativeCount, 5),
      detail: `${input.unexpectedNegativeCount} unerwartet negative Werte.`,
    });
  }

  return issues;
}
