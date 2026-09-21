"use server";

import { revalidatePath } from "next/cache";
import { videoJobFormSchema, idSchema } from "@/lib/validation/videos";
import { resolveVideoProvider } from "@/lib/providers/video/registry";
import { ok, fail, newRequestId, type Result } from "@/types/result";
import { getCurrentUser } from "@/lib/auth/current-user";
import { writeAuditLog } from "@/lib/audit/log";
import { withWorkspaceDb } from "@/lib/db/workspace-context";
import type { VideoJob, VideoJobStatus } from "@/generated/prisma/client";

export async function createVideoJobAction(
  _prevState: Result<{ id: string }> | null,
  formData: FormData,
): Promise<Result<{ id: string }>> {
  const requestId = newRequestId();
  const user = await getCurrentUser();
  if (!user) return fail("Nicht authentifiziert.", requestId);

  const parsed = videoJobFormSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return fail("Eingabe ungültig.", requestId, parsed.error.flatten().fieldErrors);
  }
  const input = parsed.data;

  const job = await withWorkspaceDb(async (tx, workspaceId) => {
    const productId = input.productId || null;
    const campaignId = input.campaignId || null;
    const scriptId = input.scriptId || null;

    if (productId) {
      const product = await tx.product.findFirst({ where: { id: productId, workspaceId }, select: { id: true } });
      if (!product) throw new Error("VIDEO_PRODUCT_OUTSIDE_WORKSPACE");
    }
    if (campaignId) {
      const campaign = await tx.campaign.findUnique({ where: { id: campaignId }, select: { id: true } });
      if (!campaign) throw new Error("VIDEO_CAMPAIGN_OUTSIDE_WORKSPACE");
    }
    if (scriptId) {
      const script = await tx.script.findUnique({ where: { id: scriptId }, select: { id: true } });
      if (!script) throw new Error("VIDEO_SCRIPT_OUTSIDE_WORKSPACE");
    }
    if (!productId && !campaignId && !scriptId) {
      throw new Error("VIDEO_WORKSPACE_OWNERSHIP_REQUIRED");
    }

    return tx.videoJob.create({
      data: {
        scriptId,
        productId,
        campaignId,
        provider: input.provider,
        format: input.format,
        aspectRatio: input.aspectRatio,
        durationSec: input.durationSec,
        style: input.style || null,
        avatar: input.avatar || null,
        voice: input.voice || null,
        language: input.language,
        subtitles: input.subtitles ?? true,
        music: input.music || null,
        status: "QUEUED",
      },
    });
  });

  const provider = resolveVideoProvider(input.provider);
  await provider.submit({
    jobId: job.id,
    format: input.format,
    aspectRatio: input.aspectRatio,
    durationSec: input.durationSec,
    style: input.style,
    avatar: input.avatar,
    simulateOutcome: input.simulateOutcome,
  });

  await writeAuditLog({
    action: "video_job.create",
    entityType: "VideoJob",
    entityId: job.id,
    requestId,
    actor: user.email,
    metadata: { provider: input.provider },
  });

  revalidatePath("/app/videos");
  return ok({ id: job.id }, requestId);
}

export async function pollVideoJobAction(id: string): Promise<Result<VideoJob>> {
  const requestId = newRequestId();
  const user = await getCurrentUser();
  if (!user) return fail("Nicht authentifiziert.", requestId);

  const job = await withWorkspaceDb((tx) => tx.videoJob.findUnique({ where: { id } }));
  if (!job) return fail("Video-Job nicht gefunden.", requestId);
  if (["COMPLETED", "FAILED", "CANCELLED"].includes(job.status)) return ok(job, requestId);

  const provider = resolveVideoProvider(job.provider);
  const state = await provider.poll(id);

  const updated = await withWorkspaceDb(async (tx) => {
    const ownedJob = await tx.videoJob.findUnique({ where: { id }, select: { id: true } });
    if (!ownedJob) throw new Error("VIDEO_JOB_OUTSIDE_WORKSPACE");

    const next = await tx.videoJob.update({
      where: { id },
      data: {
        status: state.status as VideoJobStatus,
        progress: state.progress,
        resultUrl: state.resultUrl ?? job.resultUrl,
        errorMessage: state.errorMessage ?? null,
        completedAt: state.status === "COMPLETED" ? new Date() : job.completedAt,
      },
    });

    if (state.status === "COMPLETED" && state.resultUrl) {
      const existingAsset = await tx.mediaAsset.findFirst({ where: { videoJobId: id } });
      if (!existingAsset) {
        await tx.mediaAsset.create({
          data: {
            kind: "VIDEO",
            fileName: `video-job-${id}.svg`,
            storageKey: `mock/${id}`,
            url: state.resultUrl,
            mimeType: "image/svg+xml",
            sizeBytes: 0,
            durationSec: job.durationSec,
            videoJobId: id,
            campaignId: job.campaignId,
            productId: job.productId,
            tags: ["mock-result", "video-job"],
          },
        });
      }
    }
    return next;
  });

  await writeAuditLog({
    action: "video_job.retry",
    entityType: "VideoJob",
    entityId: id,
    requestId,
    actor: user.email,
    metadata: { event: state.status === "COMPLETED" ? "completed" : "polled" },
  });

  revalidatePath("/app/videos");
  revalidatePath(`/app/videos/${id}`);
  return ok(updated, requestId);
}

export async function retryVideoJobAction(id: string): Promise<Result<VideoJob>> {
  const requestId = newRequestId();
  const user = await getCurrentUser();
  if (!user) return fail("Nicht authentifiziert.", requestId);

  const job = await withWorkspaceDb((tx) => tx.videoJob.findUnique({ where: { id } }));
  if (!job) return fail("Video-Job nicht gefunden.", requestId);

  const provider = resolveVideoProvider(job.provider);
  await provider.submit({
    jobId: id,
    format: job.format,
    aspectRatio: job.aspectRatio,
    durationSec: job.durationSec,
    style: job.style,
    avatar: job.avatar,
  });

  const updated = await withWorkspaceDb((tx) =>
    tx.videoJob.update({
      where: { id },
      data: { status: "QUEUED", progress: 0, errorMessage: null, attempts: { increment: 1 } },
    }),
  );

  await writeAuditLog({
    action: "video_job.retry",
    entityType: "VideoJob",
    entityId: id,
    requestId,
    actor: user.email,
  });
  revalidatePath("/app/videos");
  revalidatePath(`/app/videos/${id}`);
  return ok(updated, requestId);
}

export async function cancelVideoJobAction(id: string): Promise<Result<VideoJob>> {
  const requestId = newRequestId();
  const user = await getCurrentUser();
  if (!user) return fail("Nicht authentifiziert.", requestId);

  const job = await withWorkspaceDb((tx) => tx.videoJob.findUnique({ where: { id } }));
  if (!job) return fail("Video-Job nicht gefunden.", requestId);

  const provider = resolveVideoProvider(job.provider);
  await provider.cancel(id);
  const updated = await withWorkspaceDb((tx) =>
    tx.videoJob.update({ where: { id }, data: { status: "CANCELLED" } }),
  );

  await writeAuditLog({
    action: "video_job.cancel",
    entityType: "VideoJob",
    entityId: id,
    requestId,
    actor: user.email,
  });
  revalidatePath("/app/videos");
  revalidatePath(`/app/videos/${id}`);
  return ok(updated, requestId);
}

export async function deleteVideoJobAction(id: string) {
  const parsed = idSchema.safeParse({ id });
  const requestId = newRequestId();
  const user = await getCurrentUser();
  if (!user) return fail("Nicht authentifiziert.", requestId);
  if (!parsed.success) return fail("Ungültige ID.", requestId);

  await withWorkspaceDb((tx) => tx.videoJob.delete({ where: { id } }));
  await writeAuditLog({
    action: "video_job.cancel",
    entityType: "VideoJob",
    entityId: id,
    requestId,
    actor: user.email,
    metadata: { event: "deleted" },
  });
  revalidatePath("/app/videos");
  return ok({ id }, requestId);
}
