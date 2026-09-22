import "server-only";
import { withWorkspaceTransaction } from "@/lib/db/workspace-transaction";
import { getCurrentUser } from "@/lib/auth/current-user";
import { writeAuditLog } from "@/lib/audit/log";
import { detectAnomalies, type AnomalyContext, type AnomalyScope } from "@/lib/anomaly/rules";
import type { ScopeType } from "@/generated/prisma/client";

export class AnomalyJobError extends Error {}

function big(v: { toString(): string } | null | undefined): bigint {
  return BigInt(v?.toString() ?? "0");
}

/**
 * Scans recent content performance for anomalies using the rule engine. Each
 * content asset is compared against the workspace baseline (neutral expected
 * ranges), and detections are persisted as OPEN AnalyticsAnomaly rows. Existing
 * open anomalies of the same scope+type are not duplicated. Never auto-blocks.
 */
export async function runAnomalyDetection(workspaceId: string, actor: string) {
  return withWorkspaceTransaction(workspaceId, async (tx) => {
  const snapshots = await tx.contentPerformanceSnapshot.findMany({
    where: { workspaceId },
    select: {
      contentAssetId: true,
      views: true,
      linkClicks: true,
      conversions: true,
      sampleSize: true,
    },
  });

  if (snapshots.length === 0) {
    await writeAuditLog({ action: "anomaly.detection.run", entityType: "AnalyticsAnomaly", entityId: "batch", actor, metadata: { detected: 0, reason: "no_snapshots" } });
    return { detected: 0 };
  }

  // Workspace baseline (per-asset means) used as neutral expected ranges.
  const sumViews = snapshots.reduce((s, x) => s + big(x.views), 0n);
  const sumClicks = snapshots.reduce((s, x) => s + big(x.linkClicks), 0n);
  const sumConv = snapshots.reduce((s, x) => s + big(x.conversions), 0n);
  const n = BigInt(snapshots.length);
  const meanViews = Number(sumViews / n);
  const meanClicks = Number(sumClicks / n);
  const meanConv = Number(sumConv / n);

  let detected = 0;
  for (const asset of snapshots) {
    const sampleSize = Number(big(asset.sampleSize));
    if (sampleSize <= 0) continue;
    const ctx: AnomalyContext = {
      sampleSize,
      minimumSampleSize: 50,
      viewsObserved: Number(big(asset.views)),
      viewsExpectedMin: Math.round(meanViews),
      viewsExpectedMax: Math.round(meanViews * 1.5),
      linkClicksObserved: Number(big(asset.linkClicks)),
      linkClicksExpectedMax: Math.round(meanClicks * 1.5),
      conversionsObserved: Number(big(asset.conversions)),
      conversionsExpectedMin: Math.round(meanConv),
      refundsObserved: null,
      refundsExpectedMax: null,
      costObserved: null,
      costExpectedMax: null,
      hasAnalyticsData: true,
      importDelayHours: null,
      affiliateLinkErrorCount: 0,
    };
    const scope: AnomalyScope = { scopeType: "CONTENT_ASSET" as ScopeType, scopeId: asset.contentAssetId };
    const drafts = detectAnomalies(ctx, scope);

    for (const d of drafts) {
      const existing = await tx.analyticsAnomaly.findFirst({
        where: {
          workspaceId,
          scopeType: d.scopeType,
          scopeId: d.scopeId,
          anomalyType: d.anomalyType,
          status: { not: "RESOLVED" },
        },
      });
      if (existing) continue;
      await tx.analyticsAnomaly.create({
        data: {
          workspaceId,
          anomalyType: d.anomalyType,
          scopeType: d.scopeType,
          scopeId: d.scopeId,
          severity: d.severity,
          observedValue: d.observedValue != null ? d.observedValue : null,
          expectedRangeMin: d.expectedRangeMin != null ? d.expectedRangeMin : null,
          expectedRangeMax: d.expectedRangeMax != null ? d.expectedRangeMax : null,
          explanation: d.explanation,
          evidenceReferences: d.evidenceReferences,
          status: "OPEN",
        },
      });
      detected += 1;
    }
  }

  await writeAuditLog({ action: "anomaly.detection.run", entityType: "AnalyticsAnomaly", entityId: "batch", actor, metadata: { detected } });
  return { detected };
}
