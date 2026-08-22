import "server-only";
import { prisma } from "@/lib/db/client";
import { resolveSocialProvider } from "@/lib/providers/social/mock-provider";
import { featureFlags } from "@/lib/config/feature-flags";
import { isValidPostTransition, type SocialPostStatus } from "@/features/publishing/status";
import { writeAuditLog } from "@/lib/audit/log";
import { classifyAttempt, nextRetryAt } from "@/lib/domain/publishing/job-policy";
import type { SocialAccount, SocialPost } from "@/generated/prisma/client";

export class PublishError extends Error {}

async function assertPublishingEnabled(): Promise<void> {
  if (!featureFlags.socialPublishingEnabled) {
    throw new PublishError("Social Publishing ist derzeit deaktiviert.");
  }
}

function resolvePublisher(account: SocialAccount) {
  return resolveSocialProvider(account.platform);
}

export async function approvePost(
  postId: string,
  actor: string,
  workspaceId: string,
): Promise<SocialPost> {
  await assertPublishingEnabled();
  const post = await prisma.socialPost.findFirst({ where: { id: postId, workspaceId } });
  if (!post) throw new PublishError("Post nicht gefunden.");
  if (!isValidPostTransition(post.status as SocialPostStatus, "APPROVED")) {
    throw new PublishError(`Post kann aus Status "${post.status}" nicht freigegeben werden.`);
  }
  const updated = await prisma.socialPost.update({
    where: { id: post.id },
    data: { status: "APPROVED", approvedBy: actor, approvedAt: new Date() },
  });
  await writeAuditLog({
    action: "social_post.approve",
    entityType: "SocialPost",
    entityId: post.id,
    actor,
    workspaceId,
    metadata: { from: post.status },
  });
  return updated;
}

export async function enqueuePublish(
  postId: string,
  actor: string,
  workspaceId: string,
): Promise<SocialPost> {
  await assertPublishingEnabled();
  const post = await prisma.socialPost.findFirst({ where: { id: postId, workspaceId } });
  if (!post) throw new PublishError("Post nicht gefunden.");
  if (post.status !== "APPROVED") {
    throw new PublishError("Nur freigegebene Posts können veröffentlicht werden.");
  }
  const active = await prisma.publishJob.findFirst({
    where: { postId: post.id, workspaceId, status: { in: ["PENDING", "PROCESSING"] } },
    select: { id: true },
  });
  if (active) throw new PublishError("Für diesen Post läuft bereits ein Publish-Job.");

  await prisma.$transaction([
    prisma.publishJob.create({ data: { workspaceId, postId: post.id, status: "PENDING" } }),
    prisma.socialPost.update({ where: { id: post.id }, data: { status: "SCHEDULED" } }),
  ]);
  await writeAuditLog({
    action: "social_post.enqueue",
    entityType: "SocialPost",
    entityId: post.id,
    actor,
    workspaceId,
    metadata: { from: post.status },
  });
  const refreshed = await prisma.socialPost.findFirst({ where: { id: post.id, workspaceId } });
  if (!refreshed) throw new PublishError("Post nicht gefunden.");
  return refreshed;
}

export interface PublishWorkerReport {
  processed: number;
  succeeded: number;
  failed: number;
  deadLettered: number;
}

export async function processPublishQueue(
  workspaceId: string,
  limit = 10,
): Promise<PublishWorkerReport> {
  await assertPublishingEnabled();
  const now = new Date();
  const jobs = await prisma.publishJob.findMany({
    where: {
      workspaceId,
      OR: [{ status: "PENDING" }, { status: "FAILED", nextAttemptAt: { lte: now } }],
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    include: {
      post: {
        include: { account: true, mediaAsset: { select: { url: true } } },
      },
    },
  });

  const report: PublishWorkerReport = { processed: 0, succeeded: 0, failed: 0, deadLettered: 0 };

  for (const job of jobs) {
    const post = job.post;
    if (post.workspaceId !== workspaceId || post.account.workspaceId !== workspaceId) {
      continue;
    }

    report.processed += 1;
    const claimed = await prisma.publishJob.updateMany({
      where: {
        id: job.id,
        workspaceId,
        status: { in: ["PENDING", "FAILED"] },
      },
      data: { status: "PROCESSING" },
    });
    if (claimed.count !== 1) {
      report.processed -= 1;
      continue;
    }

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
      errorMessage = error instanceof Error ? error.message : "Unbekannter Fehler";
    }

    const attempts = job.attempts + 1;
    const outcome = classifyAttempt(success, job.attempts);

    if (outcome === "succeeded") {
      await prisma.$transaction([
        prisma.publishJob.update({
          where: { id: job.id },
          data: {
            status: "SUCCEEDED",
            attempts,
            externalPostUrl: externalPostUrl ?? null,
            lastError: null,
            nextAttemptAt: null,
          },
        }),
        prisma.socialPost.update({
          where: { id: post.id },
          data: {
            status: "PUBLISHED",
            publishedAt: new Date(),
            errorMessage: null,
            attempts: { increment: 1 },
          },
        }),
      ]);
      await writeAuditLog({
        action: "social_post.publish",
        entityType: "SocialPost",
        entityId: post.id,
        workspaceId,
        metadata: { success: true, platform: post.account.platform, jobId: job.id },
      });
      report.succeeded += 1;
    } else if (outcome === "retryable") {
      const retryAt = nextRetryAt(job.attempts, new Date());
      await prisma.$transaction([
        prisma.publishJob.update({
          where: { id: job.id },
          data: {
            status: "FAILED",
            attempts,
            lastError: errorMessage ?? "Fehlgeschlagen",
            nextAttemptAt: retryAt,
          },
        }),
        prisma.socialPost.update({
          where: { id: post.id },
          data: {
            status: "FAILED",
            errorMessage: errorMessage ?? "Fehlgeschlagen",
            attempts: { increment: 1 },
          },
        }),
      ]);
      await writeAuditLog({
        action: "social_post.publish_retry",
        entityType: "SocialPost",
        entityId: post.id,
        workspaceId,
        metadata: { attempt: attempts, nextAttemptAt: retryAt.toISOString() },
      });
      report.failed += 1;
    } else {
      await prisma.$transaction([
        prisma.publishJob.update({
          where: { id: job.id },
          data: {
            status: "DEAD",
            attempts,
            lastError: errorMessage ?? "Endgültig fehlgeschlagen",
            nextAttemptAt: null,
          },
        }),
        prisma.socialPost.update({
          where: { id: post.id },
          data: {
            status: "FAILED",
            errorMessage: errorMessage ?? "Endgültig fehlgeschlagen",
          },
        }),
      ]);
      await writeAuditLog({
        action: "social_post.publish_dead",
        entityType: "SocialPost",
        entityId: post.id,
        workspaceId,
        metadata: { attempts, platform: post.account.platform },
      });
      report.deadLettered += 1;
    }
  }

  return report;
}

export async function retryDeadLetterJob(
  jobId: string,
  actor: string,
  workspaceId: string,
): Promise<void> {
  const job = await prisma.publishJob.findFirst({ where: { id: jobId, workspaceId } });
  if (!job) throw new PublishError("Job nicht gefunden.");
  if (job.status !== "DEAD") {
    throw new PublishError("Nur tote Jobs können manuell wiederholt werden.");
  }
  const updated = await prisma.publishJob.updateMany({
    where: { id: job.id, workspaceId, status: "DEAD" },
    data: { status: "PENDING", attempts: 0, lastError: null, nextAttemptAt: null },
  });
  if (updated.count !== 1) throw new PublishError("Job konnte nicht wiederholt werden.");
  await writeAuditLog({
    action: "social_post.job_retry",
    entityType: "PublishJob",
    entityId: job.id,
    actor,
    workspaceId,
    metadata: { postId: job.postId },
  });
}
