"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { runMutation } from "@/server/actions/action-helpers";
import {
  postFormSchema,
  scheduleSchema,
  idSchema,
  statusChangeSchema,
  parseHashtags,
} from "@/lib/validation/publishing";
import { isValidPostTransition, type SocialPostStatus } from "@/features/publishing/status";
import { resolveSocialProvider } from "@/lib/providers/social/mock-provider";
import { ok, fail, newRequestId, type Result } from "@/types/result";
import { getCurrentUser } from "@/lib/auth/current-user";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
import { writeAuditLog } from "@/lib/audit/log";
import type { SocialPost } from "@/generated/prisma/client";

export async function savePostAction(
  postId: string | null,
  _prevState: Result<{ id: string }> | null,
  formData: FormData,
): Promise<Result<{ id: string }>> {
  const requestId = newRequestId();
  const user = await getCurrentUser();
  if (!user) return fail("Nicht authentifiziert.", requestId);

  const parsed = postFormSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return fail("Eingabe ungültig.", requestId, parsed.error.flatten().fieldErrors);
  }

  let workspaceId: string;
  try { workspaceId = await resolveWorkspaceId(); } catch { return fail("Workspace-Kontext fehlt oder ist ungültig.", requestId); }

  const account = await prisma.socialAccount.findFirst({ where: { id: parsed.data.accountId, workspaceId }, select: { id: true } });
  if (!account) return fail("Social Account nicht gefunden.", requestId);
  if (parsed.data.campaignId) {
    const campaign = await prisma.campaign.findFirst({ where: { id: parsed.data.campaignId, workspaceId }, select: { id: true } });
    if (!campaign) return fail("Kampagne nicht gefunden.", requestId);
  }
  if (parsed.data.mediaAssetId) {
    const media = await prisma.mediaAsset.findFirst({ where: { id: parsed.data.mediaAssetId, workspaceId }, select: { id: true } });
    if (!media) return fail("Medienasset nicht gefunden.", requestId);
  }

  const data = {
    accountId: parsed.data.accountId,
    campaignId: parsed.data.campaignId || null,
    mediaAssetId: parsed.data.mediaAssetId || null,
    caption: parsed.data.caption,
    hashtags: parseHashtags(parsed.data.hashtags),
    affiliateLinkText: parsed.data.affiliateLinkText || null,
    disclosure: parsed.data.disclosure || null,
  };

  if (postId) {
    const existing = await prisma.socialPost.findFirst({ where: { id: postId, account: { workspaceId } }, select: { id: true } });
    if (!existing) return fail("Post nicht gefunden.", requestId);
  }
  const post = postId
    ? await prisma.socialPost.update({ where: { id: postId }, data })
    : await prisma.socialPost.create({ data: { ...data, status: "DRAFT" } });

  await writeAuditLog({
    action: postId ? "social_post.update" : "social_post.create",
    entityType: "SocialPost",
    entityId: post.id,
    requestId,
    actor: user.email,
  });

  revalidatePath("/app/publishing");
  revalidatePath("/app/calendar");
  return ok({ id: post.id }, requestId);
}

async function transitionPost(
  id: string,
  to: SocialPostStatus,
  requestId: string,
  actor: string,
  workspaceId: string,
  extraData?: Record<string, unknown>,
): Promise<Result<SocialPost>> {
  const current = await prisma.socialPost.findFirst({ where: { id, account: { workspaceId } } });
  if (!current) return fail("Post nicht gefunden.", requestId);

  if (!isValidPostTransition(current.status as SocialPostStatus, to)) {
    return fail(`Statuswechsel von "${current.status}" zu "${to}" ist nicht zulässig.`, requestId);
  }

  const updated = await prisma.socialPost.update({
    where: { id },
    data: { status: to, ...extraData },
  });

  await writeAuditLog({
    action: "social_post.status_change",
    entityType: "SocialPost",
    entityId: id,
    requestId,
    actor,
    metadata: { from: current.status, to },
  });

  revalidatePath("/app/publishing");
  revalidatePath("/app/calendar");
  return ok(updated, requestId);
}

export async function changePostStatusAction(id: string, status: string): Promise<Result<SocialPost>> {
  const requestId = newRequestId();
  const user = await getCurrentUser();
  if (!user) return fail("Nicht authentifiziert.", requestId);

  const parsed = statusChangeSchema.safeParse({ id, status });
  if (!parsed.success) return fail("Ungültiger Status.", requestId);
  if (parsed.data.status === "SCHEDULED" || parsed.data.status === "PUBLISHING") {
    return fail("Dieser Status benötigt einen eigenen Ablauf.", requestId);
  }

  let workspaceId: string;
  try { workspaceId = await resolveWorkspaceId(); } catch { return fail("Workspace-Kontext fehlt oder ist ungültig.", requestId); }
  return transitionPost(id, parsed.data.status, requestId, user.email, workspaceId);
}

export async function schedulePostAction(
  id: string,
  scheduledAt: string,
): Promise<Result<SocialPost>> {
  const requestId = newRequestId();
  const user = await getCurrentUser();
  if (!user) return fail("Nicht authentifiziert.", requestId);

  const parsed = scheduleSchema.safeParse({ id, scheduledAt });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Ungültige Eingabe.", requestId);
  }

  let workspaceId: string;
  try { workspaceId = await resolveWorkspaceId(); } catch { return fail("Workspace-Kontext fehlt oder ist ungültig.", requestId); }
  return transitionPost(id, "SCHEDULED", requestId, user.email, workspaceId, {
    scheduledAt: new Date(parsed.data.scheduledAt),
  });
}

/** Publishes (or re-publishes after a FAILED attempt) via the platform's mock provider. */
export async function publishPostAction(id: string): Promise<Result<SocialPost & { externalPostUrl?: string }>> {
  const requestId = newRequestId();
  const user = await getCurrentUser();
  if (!user) return fail("Nicht authentifiziert.", requestId);

  let workspaceId: string;
  try { workspaceId = await resolveWorkspaceId(); } catch { return fail("Workspace-Kontext fehlt oder ist ungültig.", requestId); }
  const post = await prisma.socialPost.findFirst({
    where: { id, account: { workspaceId } },
    include: { account: true, mediaAsset: { select: { url: true } } },
  });
  if (!post) return fail("Post nicht gefunden.", requestId);

  if (!isValidPostTransition(post.status as SocialPostStatus, "PUBLISHING")) {
    return fail(`Post kann aus Status "${post.status}" nicht veröffentlicht werden.`, requestId);
  }

  await prisma.socialPost.update({ where: { id }, data: { status: "PUBLISHING" } });

  const provider = resolveSocialProvider(post.account.platform);
  const result = await provider.publish({
    postId: post.id,
    platform: post.account.platform,
    caption: post.caption,
    hashtags: post.hashtags,
    mediaUrl: post.mediaAsset?.url,
  });

  const updated = await prisma.socialPost.update({
    where: { id },
    data: result.success
      ? { status: "PUBLISHED", publishedAt: new Date(), errorMessage: null, attempts: { increment: 1 } }
      : { status: "FAILED", errorMessage: result.errorMessage ?? "Veröffentlichung fehlgeschlagen.", attempts: { increment: 1 } },
  });

  await writeAuditLog({
    action: "social_post.publish",
    entityType: "SocialPost",
    entityId: id,
    requestId,
    actor: user.email,
    metadata: { success: result.success, platform: post.account.platform },
  });

  revalidatePath("/app/publishing");
  revalidatePath("/app/calendar");
  return ok({ ...updated, externalPostUrl: result.externalPostUrl }, requestId);
}

export async function duplicatePostAction(id: string): Promise<Result<{ id: string }>> {
  const requestId = newRequestId();
  const user = await getCurrentUser();
  if (!user) return fail("Nicht authentifiziert.", requestId);

  let workspaceId: string;
  try { workspaceId = await resolveWorkspaceId(); } catch { return fail("Workspace-Kontext fehlt oder ist ungültig.", requestId); }
  const source = await prisma.socialPost.findFirst({ where: { id, account: { workspaceId } } });
  if (!source) return fail("Post nicht gefunden.", requestId);

  const copy = await prisma.socialPost.create({
    data: {
      campaignId: source.campaignId,
      mediaAssetId: source.mediaAssetId,
      accountId: source.accountId,
      caption: source.caption,
      hashtags: source.hashtags,
      affiliateLinkText: source.affiliateLinkText,
      disclosure: source.disclosure,
      status: "DRAFT",
    },
  });

  await writeAuditLog({
    action: "social_post.duplicate",
    entityType: "SocialPost",
    entityId: copy.id,
    requestId,
    actor: user.email,
    metadata: { sourceId: id },
  });

  revalidatePath("/app/publishing");
  return ok({ id: copy.id }, requestId);
}

export async function deletePostAction(id: string) {
  const result = await runMutation({
    schema: idSchema,
    input: { id },
    auditAction: "social_post.delete",
    entityType: "SocialPost",
    handler: async (input) => {
      const workspaceId = await resolveWorkspaceId();
      const existing = await prisma.socialPost.findFirst({ where: { id: input.id, account: { workspaceId } }, select: { id: true } });
      if (!existing) throw new Error("POST_NOT_FOUND_IN_WORKSPACE");
      await prisma.socialPost.delete({ where: { id: existing.id } });
      return { id: input.id };
    },
    entityId: (output) => output.id,
  });
  revalidatePath("/app/publishing");
  revalidatePath("/app/calendar");
  return result;
}
