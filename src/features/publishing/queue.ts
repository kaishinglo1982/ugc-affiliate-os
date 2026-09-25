import "server-only";
import { prisma } from "@/lib/db/client";
import { resolveSocialProvider } from "@/lib/providers/social/mock-provider";
import { featureFlags } from "@/lib/config/feature-flags";
import { isValidPostTransition, type SocialPostStatus } from "@/features/publishing/status";
import { writeAuditLog } from "@/lib/audit/log";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
import { withWorkspaceTransaction } from "@/lib/db/workspace-transaction";
import {
  classifyAttempt,
  nextRetryAt,
} from "@/lib/domain/publishing/job-policy";
import type { SocialAccount, SocialPost } from "@/generated/prisma/client";

/** Thrown for domain/guard failures in the publish pipeline; not for DB errors. */
export class PublishError extends Error {}

async function assertPublishingEnabled(): Promise<void> {
  if (!featureFlags.socialPublishingEnabled) {
    throw new PublishError("Social Publishing ist derzeit deaktiviert.");
  }
}

/**
 * Resolves the adapter used to publish. Live platform adapters stay disabled by
 * default (SOCIAL_LIVE_ADAPTERS_ENABLED=false); the mock provider is always used
 * unless live adapters are explicitly enabled AND the account is in LIVE mode.
 */
async function assertPostRelationsInWorkspace(postId: string, workspaceId: string): Promise<void> {
  const post = await prisma.socialPost.findFirst({
    where: { id: postId, workspaceId },
    select: { accountId: true, campaignId: true, mediaAssetId: true },
  });
  if (!post) throw new PublishError("Post nicht gefunden.");

  const [account, campaign, mediaAsset] = await Promise.all([
    prisma.socialAccount.findFirst({ where: { id: post.accountId, workspaceId }, select: { id: true } }),
    post.campaignId
      ? prisma.campaign.findFirst({ where: { id: post.campaignId, workspaceId }, select: { id: true } })
      : Promise.resolve(null),
    post.mediaAssetId
      ? prisma.mediaAsset.findFirst({ where: { id: post.mediaAssetId, workspaceId }, select: { id: true } })
      : Promise.resolve(null),
  ]);

  if (!account) throw new PublishError("Social-Account gehört nicht zum aktuellen Workspace.");
  if (post.campaignId && !campaign) throw new PublishError("Kampagne gehört nicht zum aktuellen Workspace.");
  if (post.mediaAssetId && !mediaAsset) throw new PublishError("Media-Asset gehört nicht zum aktuellen Workspace.");
}

function resolvePublisher(account: SocialAccount) {
  if (featureFlags.liveAdaptersEnabled && account.mode === "LIVE") {
    // Live adapters are intentionally out of scope for the mock-first Phase 5
    // build and would be selected per-platform here. We fall back to the mock
    // so the pipeline never silently calls a real network endpoint.
    return resolveSocialProvider(account.platform);
  }
  return resolveSocialProvider(account.platform);
}

/**
 * Explicit "Freigabe" checkpoint. A post can only be approved from READY, and the
 * approving owner is recorded — this is what makes a later publication traceable
 * and is the single gate that stands between a draft and any external publish.
 */
export async function approvePost(postId: string, actor: string): Promise<SocialPost> {
  await assertPublishingEnabled();
  const workspaceId = await resolveWorkspaceId();
  const post = await prisma.socialPost.findFirst({ where: { id: postId, workspaceId } });
  if (!post) throw new PublishError("Post nicht gefunden.");
  if (!isValidPostTransition(post.status as SocialPostStatus, "APPROVED")) {
    throw new PublishError(`Post kann aus Status "${post.status}" nicht freigegeben werden.`);
  }
  const updated = await prisma.socialPost.update({
    where: { id: post.id, workspaceId },
    data: { status: "APPROVED", approvedBy: actor, approvedAt: new Date() },
  });
  await writeAuditLog({
    action: "social_post.approve",
    entityType: "SocialPost",
    entityId: postId,
    actor,
    metadata: { from: post.status },
  });
  return updated;
}

/**
 * Enqueues an approved post for publishing. Creates a durable PublishJob and
 * moves the post to SCHEDULED. A post must be APPROVED first — there is no path
 * from DRAFT/READY directly to the queue. An already-active job blocks a new one.
 */
export async function enqueuePublish(postId: string, actor: string): Promise<SocialPost> {
  await assertPublishingEnabled();
  const workspaceId = await resolveWorkspaceId();
  const post = await prisma.socialPost.findFirst({ where: { id: postId, workspaceId } });
  if (!post) throw new PublishError("Post nicht gefunden.");
  if (post.status !== "APPROVED") {
    throw new PublishError("Nur freigegebene Posts können veröffentlicht werden.");
  }
  const active = await prisma.publishJob.findFirst({
    where: { postId, workspaceId, status: { in: ["PENDING", "PROCESSING"] } },
    select: { id: true },
  });
  if (active) throw new PublishError("Für diesen Post läuft bereits ein Publish-Job.");

  await withWorkspaceTransaction(workspaceId, async (tx) => {
    await Promise.all([
      tx.publishJob.create({ data: { workspaceId, postId, status: "PENDING" } }),
      tx.socialPost.update({ where: { id: post.id, workspaceId }, data: { status: "SCHEDULED" } }),
    ]);
  });
  await writeAuditLog({
    action: "social_post.enqueue",
    entityType: "SocialPost",
    entityId: postId,
    actor,
    metadata: { from: post.status },
  });
  const refreshed = await prisma.socialPost.findFirst({ where: { id: postId, workspaceId } });
  if (!refreshed) throw new PublishError("Post nicht gefunden.");
  return refreshed;
}

export interface PublishWorkerReport {
  processed: number;
  succeeded: number;
  failed: number;
  deadLettered: number;
}

/**
 * Worker: drains publishable jobs (PENDING, or FAILED whose back-off has elapsed)
 * in FIFO order, calls the platform adapter, and records the outcome. Failed
 * attempts are retried with exponential back-off until they are dead-lettered
 * (PUBLISH_MAX_ATTEMPTS), at which point a human must intervene manually.
 */
export async function processPublishQueue(limit = 10): Promise<PublishWorkerReport> {
  await assertPublishingEnabled();
  const workspaceId = await resolveWorkspaceId();
  const now = new Date();
  const jobs = await prisma.publishJob.findMany({
    where: {
      workspaceId,
      OR: [{ status: "PENDING" }, { status: "FAILED", nextAttemptAt: { lte: now } }],
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    include: { post: { include: { account: true, mediaAsset: { select: { url: true } } } } },
  });

  const report: PublishWorkerReport = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    deadLettered: 0,
  };

  for (const job of jobs) {
    report.processed += 1;
    const post = job.post;
    await prisma.publishJob.update({ where: { id: job.id, workspaceId }, data: { status: "PROCESSING" } });

      await assertPostRelationsInWorkspace(post.id, workspaceId);
    const publisher = resolvePublisher(post.account);
    let success = false;
    let externalPostUrl: string | undefined;
    let errorMessage: string | undefined;
    try {
      const result = await publisher.publish({
        postId: post.id,
        platform: post.account.platform,
        caption: post.caption,
        hashtags: post.hashtags,
        mediaUrl: post.mediaAsset?.url ?? null,
      });
      success = result.success;
      externalPostUrl = result.externalPostUrl;
      errorMessage = result.errorMessage;
    } catch (error) {
      success = false;
      errorMessage = error instanceof Error ? error.message : "Unbekannter Fehler";
    }

    const attempts = job.attempts + 1;
    const outcome = classifyAttempt(success, job.attempts);

    if (outcome === "succeeded") {
      await withWorkspaceTransaction(workspaceId, async (tx) => {
        await Promise.all([
          tx.publishJob.update({
          where: { id: job.id, workspaceId },
          data: {
            status: "SUCCEEDED",
            attempts,
            externalPostUrl: externalPostUrl ?? null,
            lastError: null,
            nextAttemptAt: null,
          },
          }),
          tx.socialPost.update({
          where: { id: post.id, workspaceId },
          data: {
            status: "PUBLISHED",
            publishedAt: new Date(),
            errorMessage: null,
            attempts: { increment: 1 },
          },
          }),
        ]);
      });
      await writeAuditLog({
        action: "social_post.publish",
        entityType: "SocialPost",
        entityId: post.id,
        metadata: { success: true, platform: post.account.platform, jobId: job.id },
      });
      report.succeeded += 1;
    } else if (outcome === "retryable") {
      const nextAttemptAt = nextRetryAt(job.attempts, new Date());
      await prisma.publishJob.update({
        where: { id: job.id, workspaceId },
        data: {
          status: "FAILED",
          attempts,
          lastError: errorMessage ?? "Fehlgeschlagen",
          nextAttemptAt,
        },
      });
      await prisma.socialPost.update({
        where: { id: post.id, workspaceId },
        data: { status: "FAILED", errorMessage: errorMessage ?? "Fehlgeschlagen", attempts: { increment: 1 } },
      });
      await writeAuditLog({
        action: "social_post.publish_retry",
        entityType: "SocialPost",
        entityId: post.id,
        metadata: { attempt: attempts, nextAttemptAt: nextAttemptAt.toISOString() },
      });
      report.failed += 1;
    } else {
      await prisma.publishJob.update({
        where: { id: job.id, workspaceId },
        data: {
          status: "DEAD",
          attempts,
          lastError: errorMessage ?? "Endgültig fehlgeschlagen",
          nextAttemptAt: null,
        },
      });
      await prisma.socialPost.update({
        where: { id: post.id, workspaceId },
        data: { status: "FAILED", errorMessage: errorMessage ?? "Endgültig fehlgeschlagen" },
      });
      await writeAuditLog({
        action: "social_post.publish_dead",
        entityType: "SocialPost",
        entityId: post.id,
        metadata: { attempts, platform: post.account.platform },
      });
      report.deadLettered += 1;
    }
  }

  return report;
}

/**
 * Manually revives a dead-lettered job so the worker will pick it up again.
 * Dead-letter jobs are NEVER auto-retried — this explicit action is the only
 * way back, preserving the "human intervention required" guarantee.
 */
export async function retryDeadLetterJob(jobId: string, actor: string): Promise<void> {
  const workspaceId = await resolveWorkspaceId();
  const job = await prisma.publishJob.findFirst({ where: { id: jobId, workspaceId } });
  if (!job) throw new PublishError("Job nicht gefunden.");
  if (job.status !== "DEAD") {
    throw new PublishError("Nur tote Jobs können manuell wiederholt werden.");
  }
  await prisma.publishJob.update({
    where: { id: job.id, workspaceId },
    data: { status: "PENDING", attempts: 0, lastError: null, nextAttemptAt: null },
  });
  await writeAuditLog({
    action: "social_post.job_retry",
    entityType: "PublishJob",
    entityId: jobId,
    actor,
    metadata: { postId: job.postId },
  });
}
