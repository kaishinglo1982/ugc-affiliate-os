"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { videoJobFormSchema, idSchema } from "@/lib/validation/videos";
import { resolveVideoProvider } from "@/lib/providers/video/registry";
import { ok, fail, newRequestId, type Result } from "@/types/result";
import { getCurrentUser } from "@/lib/auth/current-user";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
import { writeAuditLog } from "@/lib/audit/log";
import type { VideoJob, VideoJobStatus } from "@/generated/prisma/client";

export async function createVideoJobAction(
  _prevState: Result<{ id: string }> | null,
  formData: FormData,
): Promise<Result<{ id: string }>> {
  const requestId = newRequestId();
  const user = await getCurrentUser();
  const workspaceId = await resolveWorkspaceId();
  if (!user) return fail("Nicht authentifiziert.", requestId);

  const parsed = videoJobFormSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return fail("Eingabe ungültig.", requestId, parsed.error.flatten().fieldErrors);
  }

  const input = parsed.data;

  const job = await prisma.videoJob.create({
    data: {
      workspaceId,
      scriptId: input.scriptId || null,
      productId: input.productId || null,
      campaignId: input.campaignId || null,
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

  const workspaceId = await resolveWorkspaceId();
  const job = await prisma.videoJob.findFirst({ where: { id, workspaceId } });
  if (!job) return fail("Video-Job nicht gefunden.", requestId);

  if (job.status === "COMPLETED" || job.status === "FAILED" || job.status === "CANCELLED") {
    return ok(job, requestId);
  }

  const provider = resolveVideoProvider(job.provider);
  const state = await provider.poll(id);

  const updated = await prisma.videoJob.update({
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
    const existingAsset = await prisma.mediaAsset.findFirst({ where: { videoJobId: id, workspaceId } });
    if (!existingAsset) {
      await prisma.mediaAsset.create({
        data: {
          workspaceId,
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
      await writeAuditLog({
        action: "video_job.retry",
        entityType: "VideoJob",
        entityId: id,
        requestId,
        actor: user.email,
        metadata: { event: "completed", createdMediaAsset: true },
      });
    }
  }

  revalidatePath("/app/videos");
  revalidatePath(`/app/videos/${id}`);
  return ok(updated, requestId);
}

export async function retryVideoJobAction(id: string): Promise<Result<VideoJob>> {
  const requestId = newRequestId();
  const user = await getCurrentUser();
  const workspaceId = await resolveWorkspaceId();
  if (!user) return fail("Nicht authentifiziert.", requestId);

  const job = await prisma.videoJob.findUnique({ where: { id } });
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

  const updated = await prisma.videoJob.update({
    where: { id },
    data: {
      status: "QUEUED",
      progress: 0,
      errorMessage: null,
      attempts: { increment: 1 },
    },
  });

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
  const workspaceId = await resolveWorkspaceId();
  if (!user) return fail("Nicht authentifiziert.", requestId);

  const job = await prisma.videoJob.findUnique({ where: { id } });
  if (!job) return fail("Video-Job nicht gefunden.", requestId);

  const provider = resolveVideoProvider(job.provider);
  await provider.cancel(id);

  const updated = await prisma.videoJob.update({ where: { id }, data: { status: "CANCELLED" } });

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
  const workspaceId = await resolveWorkspaceId();
  if (!user) return fail("Nicht authentifiziert.", requestId);
  if (!parsed.success) return fail("Ungültige ID.", requestId);

  await prisma.videoJob.delete({ where: { id } });

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
