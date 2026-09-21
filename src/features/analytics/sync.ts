import "server-only";
import { tenantPrismaForWorkspace } from "@/lib/db/tenant-client";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
import { featureFlags } from "@/lib/config/feature-flags";
import { AnalyticsSyncError, classifyProviderError } from "@/lib/analytics/provider/failure";
import {
  isAnalyticsPlatform,
  type AnalyticsPlatform,
} from "@/lib/analytics/provider/types";
import { resolveAnalyticsProvider } from "@/lib/analytics/provider/mock";
import { normalizeMetrics } from "@/lib/analytics/provider/mapping";
import { validateAnalyticsEvent, deduplicateEvents } from "@/lib/analytics/event";
import { syncRetryPolicy } from "@/features/analytics/sync-policy";
import { writeAuditLog } from "@/lib/audit/log";
import { incrementMetric, logStructured, METRICS } from "@/lib/observability/metrics";
import type {
  SyncJobType,
  AnalyticsSyncFailureCode,
} from "@/generated/prisma/client";

export class SyncJobError extends Error {}

function requireAnalyticsEnabled(): void {
  if (!featureFlags.analyticsEnabled) {
    throw new SyncJobError("Analytics ist derzeit deaktiviert.");
  }
}

function requireBackfillEnabled(): void {
  if (!featureFlags.analyticsBackfillEnabled) {
    throw new SyncJobError("Backfill ist derzeit deaktiviert.");
  }
}

export interface SyncJobRequest {
  workspaceId: string;
  jobType: SyncJobType;
  socialAccountId?: string;
  externalPostId?: string;
  periodStart?: Date;
  periodEnd?: Date;
}

let idempotencyCounter = 0;
function newIdempotencyKey(prefix: string): string {
  idempotencyCounter += 1;
  return `${prefix}:${Date.now()}:${idempotencyCounter}`;
}

export async function requestSyncJob(request: SyncJobRequest): Promise<{ id: string }> {
  requireAnalyticsEnabled();
  if (request.jobType === "POST_BACKFILL") requireBackfillEnabled();
  const db = tenantPrismaForWorkspace(request.workspaceId);
  const job = await db.analyticsSyncJob.create({
    data: {
      workspaceId: request.workspaceId,
      jobType: request.jobType,
      socialAccountId: request.socialAccountId ?? null,
      externalPostId: request.externalPostId ?? null,
      periodStart: request.periodStart,
      periodEnd: request.periodEnd,
      idempotencyKey: newIdempotencyKey(`sync-${request.jobType}`),
      correlationId: newIdempotencyKey("corr"),
    },
  });
  await writeAuditLog({
    action: "analytics.sync.requested",
    entityType: "AnalyticsSyncJob",
    entityId: job.id,
    metadata: { jobType: request.jobType },
  });
  incrementMetric(METRICS.analyticsSyncTotal);
  return { id: job.id };
}

/** Imports validated, deduplicated events. Idempotent: existing idempotency
 *  keys are skipped at the database level too. Returns inserted/duplicate counts. */
export async function importAnalyticsEvents(
  workspaceId: string,
  rawEvents: unknown[],
): Promise<{ imported: number; duplicates: number }> {
  requireAnalyticsEnabled();
  const validated: import("@/lib/analytics/event").ValidatedAnalyticsEvent[] = [];
  for (const raw of rawEvents) {
    const result = validateAnalyticsEvent(raw);
    if (result.success) validated.push(result.data);
  }

  const { unique, duplicates } = deduplicateEvents(validated);
  const db = tenantPrismaForWorkspace(workspaceId);

  let inserted = 0;
  if (unique.length > 0) {
    const existing = await db.analyticsEvent.findMany({
      where: { idempotencyKey: { in: unique.map((e) => e.idempotencyKey) } },
      select: { idempotencyKey: true },
    });
    const existingKeys = new Set(existing.map((e) => e.idempotencyKey));
    const toInsert = unique.filter((e) => !existingKeys.has(e.idempotencyKey));
    if (toInsert.length > 0) {
      await db.analyticsEvent.createMany({
        data: toInsert.map((e) => ({
          workspaceId,
          eventType: e.eventType,
          platform: (e.platform as AnalyticsPlatform) ?? null,
          socialAccountId: e.socialAccountId ?? null,
          brandId: e.brandId ?? null,
          nicheId: e.nicheId ?? null,
          campaignId: e.campaignId ?? null,
          publishingJobId: e.publishingJobId ?? null,
          externalPostId: e.externalPostId ?? null,
          contentAssetId: e.contentAssetId ?? null,
          contentVariantId: e.contentVariantId ?? null,
          productId: e.productId ?? null,
          affiliateProgramId: e.affiliateProgramId ?? null,
          affiliateLinkId: e.affiliateLinkId ?? null,
          experimentId: e.experimentId ?? null,
          experimentVariantId: e.experimentVariantId ?? null,
          numericValue: e.numericValue,
          currency: e.currency ?? null,
          occurredAt: e.occurredAt,
          sourceTimezone: e.sourceTimezone ?? null,
          importedAt: new Date(),
          source: e.source,
          externalEventId: e.externalEventId ?? null,
          idempotencyKey: e.idempotencyKey,
          metadataReferenceId: e.metadataReferenceId ?? null,
        })),
      });
      inserted = toInsert.length;
    }
  }

  const dbDuplicates = unique.length - inserted;
  const totalDuplicates = duplicates.length + dbDuplicates;
  incrementMetric(METRICS.analyticsEventsImportedTotal, inserted);
  incrementMetric(METRICS.analyticsEventsDeduplicatedTotal, totalDuplicates);

  await writeAuditLog({
    action: "analytics.event.imported",
    entityType: "AnalyticsEvent",
    entityId: workspaceId,
    metadata: { imported: inserted, duplicates: totalDuplicates },
  });
  return { imported: inserted, duplicates: totalDuplicates };
}

export interface SyncReport {
  processed: number;
  succeeded: number;
  failed: number;
  deadLettered: number;
}

export async function processSyncQueue(limit = 10, workspaceId?: string): Promise<SyncReport> {
  requireAnalyticsEnabled();
  const now = new Date();
  const activeWorkspaceId = workspaceId ?? (await resolveWorkspaceId());
  const db = tenantPrismaForWorkspace(activeWorkspaceId);
  const jobs = await db.analyticsSyncJob.findMany({
    where: {
      workspaceId: activeWorkspaceId,
      OR: [{ status: "PENDING" }, { status: "FAILED", nextAttemptAt: { lte: now } }],
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  const report: SyncReport = { processed: 0, succeeded: 0, failed: 0, deadLettered: 0 };
  for (const job of jobs) {
    report.processed += 1;
    await db.analyticsSyncJob.update({ where: { id: job.id }, data: { status: "PROCESSING" } });
    try {
      await runJob(job);
      await db.analyticsSyncJob.update({ where: { id: job.id }, data: { status: "SUCCEEDED", attempts: { increment: 1 }, failureCode: null, lastError: null, nextAttemptAt: null } });
      report.succeeded += 1;
    } catch (error) {
      const syncErr = error instanceof AnalyticsSyncError ? error : classifyProviderError(error);
      const decision = syncRetryPolicy(syncErr.code, job.attempts, job.maxAttempts, new Date());
      const nextStatus = decision.kind === "dead" ? "DEAD" : "FAILED";
      await db.analyticsSyncJob.update({
        where: { id: job.id },
        data: {
          status: nextStatus,
          attempts: { increment: 1 },
          failureCode: syncErr.code as AnalyticsSyncFailureCode,
          lastError: syncErr.message,
          nextAttemptAt: decision.nextAttemptAt,
        },
      });
      await writeAuditLog({
        action: "analytics.sync.failed",
        entityType: "AnalyticsSyncJob",
        entityId: job.id,
        metadata: { code: syncErr.code, attempts: job.attempts + 1 },
      });
      incrementMetric(METRICS.analyticsSyncFailedTotal);
      if (nextStatus === "DEAD") report.deadLettered += 1;
      else report.failed += 1;
    }
  }
  return report;
}

async function runJob(job: {
  id: string;
  jobType: SyncJobType;
  socialAccountId: string | null;
  externalPostId: string | null;
  workspaceId: string;
  periodStart: Date | null;
  periodEnd: Date | null;
}): Promise<void> {
  if (job.jobType === "ACCOUNT_SYNC" || job.jobType === "POST_SYNC") {
    if (!job.socialAccountId) throw new SyncJobError("Social-Account erforderlich.");
    const db = tenantPrismaForWorkspace(job.workspaceId);
    const account = await db.socialAccount.findUnique({ where: { id: job.socialAccountId } });
    if (!account) throw new AnalyticsSyncError("POST_NOT_FOUND", "Social-Account nicht gefunden.");
    if (!isAnalyticsPlatform(account.platform)) {
      throw new AnalyticsSyncError("UNSUPPORTED_METRIC", `Plattform ${account.platform} wird nicht unterstützt.`);
    }
    const platform = account.platform as AnalyticsPlatform;
    const mode = featureFlags.analyticsLiveAdaptersEnabled && account.mode === "LIVE" ? "LIVE" : "MOCK";
    const provider = resolveAnalyticsProvider(platform, mode);
    const periodStart = job.periodStart ?? new Date(Date.now() - 24 * 3600 * 1000);
    const periodEnd = job.periodEnd ?? new Date();

    const result =
      job.jobType === "ACCOUNT_SYNC"
        ? await provider.getAccountMetrics({ workspaceId: job.workspaceId, socialAccountId: account.id, platform, periodStart, periodEnd })
        : await provider.getPostMetrics({ workspaceId: job.workspaceId, socialAccountId: account.id, platform, externalPostId: job.externalPostId ?? "", periodStart, periodEnd });

    const m = result.metrics;
    await db.platformMetricSnapshot.create({
      data: {
        workspaceId: job.workspaceId,
        platform,
        socialAccountId: account.id,
        externalPostId: job.jobType === "POST_SYNC" ? job.externalPostId ?? "" : "",
        publishingJobId: null,
        contentAssetId: null,
        measuredAt: result.measuredAt,
        periodStart,
        periodEnd,
        impressions: m.impressions,
        reach: m.reach,
        views: m.views,
        videoStarts: m.videoStarts,
        videoCompletions: m.videoCompletions,
        likes: m.likes,
        comments: m.comments,
        shares: m.shares,
        saves: m.saves,
        profileVisits: m.profileVisits,
        linkClicks: m.linkClicks,
        averageWatchTimeSeconds: m.averageWatchTimeSeconds != null ? String(m.averageWatchTimeSeconds) : null,
        totalWatchTimeSeconds: m.totalWatchTimeSeconds != null ? String(m.totalWatchTimeSeconds) : null,
        completionRate: m.completionRate != null ? String(m.completionRate) : null,
        source: "PLATFORM_API",
        externalSnapshotId: result.externalSnapshotId,
      },
    });
    incrementMetric(METRICS.analyticsSnapshotCreatedTotal);
    await writeAuditLog({
      action: "analytics.snapshot.created",
      entityType: "PlatformMetricSnapshot",
      entityId: job.id,
      metadata: { platform },
    });
    return;
  }

  // METRIC_NORMALIZATION / EVENT_DEDUPLICATION / AGGREGATION / ANOMALY_DETECTION
  // are orchestration steps handled by their own workers; for the queue we mark
  // them succeeded so the pipeline can proceed. They are idempotent by design.
  logStructured({ jobId: job.id, jobType: job.jobType, message: "sync step processed" });
}
