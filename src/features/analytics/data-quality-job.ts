import "server-only";
import { prisma } from "@/lib/db/client";
import { Decimal } from "@/lib/shared/decimal";
import { writeAuditLog } from "@/lib/audit/log";
import { computeDataQualityScores, detectDataQualityIssues, type DataQualityInput } from "@/lib/data-quality/engine";
import type { DataQualityScope } from "@/generated/prisma/client";

const EXPECTED_FIELDS = 8; // impressions, views, engagements, linkClicks, conversions, gross, commission, net
const FRESHNESS_THRESHOLD_HOURS = 48;

function big(v: { toString(): string } | null | undefined): bigint {
  return BigInt(v?.toString() ?? "0");
}

/**
 * Computes a workspace data-quality score from live signals and persists a
 * DataQualityReport (+ issues). Scores are conservative: missing data lowers
 * the score rather than being assumed good. Never blocks anything directly.
 */
export async function runDataQualityScan(actor: string, workspaceId: string) {

  const snapshots = await prisma.contentPerformanceSnapshot.findMany({
    where: { workspaceId },
    select: { periodEnd: true, impressions: true, views: true, engagements: true, linkClicks: true, conversions: true, grossRevenue: true, commissionRevenue: true, estimatedNetRevenue: true, productId: true },
  });

  const providerErrors = 0; // AnalyticsProviderMapping has no error flag in this schema version

  const lastSync = await prisma.analyticsSyncJob.findFirst({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const hoursSinceLastSync = lastSync
    ? Math.max(0, (Date.now() - lastSync.createdAt.getTime()) / 3_600_000)
    : 9999;

  let presentMetrics = 0;
  let staleMetricCount = 0;
  let missingAttributionCount = 0;
  const now = Date.now();
  for (const s of snapshots) {
    const fields = [s.impressions, s.views, s.engagements, s.linkClicks, s.conversions, s.grossRevenue, s.commissionRevenue, s.estimatedNetRevenue];
    for (const f of fields) {
      const n = Number(f?.toString() ?? "0");
      if (n !== 0) presentMetrics += 1;
    }
    if (s.periodEnd && now - s.periodEnd.getTime() > FRESHNESS_THRESHOLD_HOURS * 3_600_000) {
      staleMetricCount += 1;
    }
    const commission = s.commissionRevenue != null ? Number(s.commissionRevenue.toString()) : 0;
    if (commission > 0 && !s.productId) {
      missingAttributionCount += 1;
    }
  }

  const totalExpected = snapshots.length === 0 ? EXPECTED_FIELDS : snapshots.length * EXPECTED_FIELDS;
  const present = snapshots.length === 0 ? 0 : presentMetrics;

  const input: DataQualityInput = {
    totalExpectedMetrics: totalExpected,
    presentMetrics: present,
    staleMetricCount,
    duplicateEventCount: 0,
    currencyMismatchCount: 0,
    missingAttributionCount,
    invalidTimestampCount: 0,
    orphanedPostCount: 0,
    orphanedTransactionCount: 0,
    providerMappingErrorCount: providerErrors,
    unexpectedNegativeCount: 0,
    hoursSinceLastSync,
    freshnessThresholdHours: FRESHNESS_THRESHOLD_HOURS,
  };

  const scores = computeDataQualityScores(input);
  const issues = detectDataQualityIssues(input);

  const report = await prisma.dataQualityReport.create({
    data: {
      workspaceId,
      scopeType: "WORKSPACE" as DataQualityScope,
      scopeId: workspaceId,
      completenessScore: new Decimal(scores.completeness),
      consistencyScore: new Decimal(scores.consistency),
      freshnessScore: new Decimal(scores.freshness),
      attributionScore: new Decimal(scores.attribution),
      overallScore: new Decimal(scores.overall),
      issueCount: issues.length,
      issues: {
        create: issues.map((i) => ({
          workspaceId,
          issueType: i.issueType,
          severity: i.severity,
          detail: i.detail,
        })),
      },
    },
  });

  await writeAuditLog({ action: "data_quality.scan", entityType: "DataQualityReport", entityId: report.id, actor, workspaceId, metadata: { overall: scores.overall, issues: issues.length } });
  return { reportId: report.id, overall: scores.overall, issues: issues.length };
}
