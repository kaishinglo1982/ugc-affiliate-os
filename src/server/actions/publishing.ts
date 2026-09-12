"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
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
import { writeAuditLog } from "@/lib/audit/log";
import type { SocialPost } from "@/generated/prisma/client";

async function validatePostRelations(
  workspaceId: string,
  input: { accountId: string; campaignId?: string | null; mediaAssetId?: string | null },
) {
  const [account, campaign, asset] = await Promise.all([
    prisma.socialAccount.findFirst({ where: { id: input.accountId, workspaceId }, select: { id: true } }),
    input.campaignId
      ? prisma.campaign.findFirst({ where: { id: input.campaignId, workspaceId }, select: { id: true } })
      : null,
    input.mediaAssetId
      ? prisma.mediaAsset.findFirst({ where: { id: input.mediaAssetId, workspaceId }, select: { id: true } })
      : null,
  ]);
  return {
    account,
    validCampaign: !input.campaignId || Boolean(campaign),
    validAsset: !input.mediaAssetId || Boolean(asset),
  };
}

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

  const workspaceId = await resolveWorkspaceId();
  const relations = await validatePostRelations(workspaceId, parsed.data);
  if (!relations.account) return fail("Social-Konto nicht gefunden.", requestId);
  if (!relations.validCampaign) return fail("Kampagne nicht gefunden.", requestId);
  if (!relations.validAsset) return fail("Medien-Datei nicht gefunden.", requestId);

  const data = {
    accountId: relations.account.id,
    campaignId: parsed.data.campaignId || null,
    mediaAssetId: parsed.data.mediaAssetId || null,
    caption: parsed.data.caption,
    hashtags: parseHashtags(parsed.data.hashtags),
    affiliateLinkText: parsed.data.affiliateLinkText || null,
    disclosure: parsed.data.disclosure || null,
  };

  let post;
  if (postId) {
    const existing = await prisma.socialPost.findFirst({ where: { id: postId, workspaceId }, select: { id: true } });
    if (!existing) return fail("Post nicht gefunden.", requestId);
    post = await prisma.socialPost.update({ where: { id: existing.id }, data });
  } else {
    post = await prisma.socialPost.create({ data: { workspaceId, ...data, status: "DRAFT" } });
  }

  await writeAuditLog({
    action: postId ? "social_post.update" : "social_post.create",
    entityType: "SocialPost",
    entityId: post.id,
    requestId,
    actor: user.email,
    workspaceId,
  });

  revalidatePath("/app/publishing");
  revalidatePath("/app/calendar");
  return ok({ id: post.id }, requestId);
}

async function transitionPost(
  id: string,
  workspaceId: string,
  to: SocialPostStatus,
  requestId: string,
  actor: string,
  extraData?: Record<string, unknown>,
): Promise<Result<SocialPost>> {
  const current = await prisma.socialPost.findFirst({ where: { id, workspaceId } });
  if (!current) return fail("Post nicht gefunden.", requestId);

  if (!isValidPostTransition(current.status as SocialPostStatus, to)) {
    return fail(`Statuswechsel von "${current.status}" zu "${to}" ist nicht zulässig.`, requestId);
  }

  const updated = await prisma.socialPost.update({
    where: { id: current.id },
    data: { status: to, ...extraData },
  });

  await writeAuditLog({
    action: "social_post.status_change",
    entityType: "SocialPost",
    entityId: current.id,
    requestId,
    actor,
    workspaceId,
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

  const workspaceId = await resolveWorkspaceId();
  return transitionPost(id, workspaceId, parsed.data.status, requestId, user.email);
}

export async function schedulePostAction(id: string, scheduledAt: string): Promise<Result<SocialPost>> {
  const requestId = newRequestId();
  const user = await getCurrentUser();
  if (!user) return fail("Nicht authentifiziert.", requestId);

  const parsed = scheduleSchema.safeParse({ id, scheduledAt });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Ungültige Eingabe.", requestId);
  }

  const workspaceId = await resolveWorkspaceId();
  return transitionPost(id, workspaceId, "SCHEDULED", requestId, user.email, {
    scheduledAt: new Date(parsed.data.scheduledAt),
  });
}

export async function publishPostAction(id: string): Promise<Result<SocialPost & { externalPostUrl?: string }>> {
  const requestId = newRequestId();
  const user = await getCurrentUser();
  if (!user) return fail("Nicht authentifiziert.", requestId);
  const workspaceId = await resolveWorkspaceId();

  const post = await prisma.socialPost.findFirst({
    where: { id, workspaceId },
    include: { account: true, mediaAsset: { select: { url: true } } },
  });
  if (!post || post.account.workspaceId !== workspaceId) return fail("Post nicht gefunden.", requestId);

  if (!isValidPostTransition(post.status as SocialPostStatus, "PUBLISHING")) {
    return fail(`Post kann aus Status "${post.status}" nicht veröffentlicht werden.`, requestId);
  }

  await prisma.socialPost.update({ where: { id: post.id }, data: { status: "PUBLISHING" } });
  const provider = resolveSocialProvider(post.account.platform);
  const result = await provider.publish({
    postId: post.id,
    platform: post.account.platform,
    caption: post.caption,
    hashtags: post.hashtags,
    mediaUrl: post.mediaAsset?.url,
  });

  const updated = await prisma.socialPost.update({
    where: { id: post.id },
    data: result.success
      ? { status: "PUBLISHED", publishedAt: new Date(), errorMessage: null, attempts: { increment: 1 } }
      : { status: "FAILED", errorMessage: result.errorMessage ?? "Veröffentlichung fehlgeschlagen.", attempts: { increment: 1 } },
  });

  await writeAuditLog({
    action: "social_post.publish",
    entityType: "SocialPost",
    entityId: post.id,
    requestId,
    actor: user.email,
    workspaceId,
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
  const workspaceId = await resolveWorkspaceId();

  const source = await prisma.socialPost.findFirst({ where: { id, workspaceId } });
  if (!source) return fail("Post nicht gefunden.", requestId);

  const copy = await prisma.socialPost.create({
    data: {
      workspaceId,
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
    workspaceId,
    metadata: { sourceId: source.id },
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
    handler: async (input, _user, workspaceId) => {
      const deleted = await prisma.socialPost.deleteMany({ where: { id: input.id, workspaceId } });
      if (deleted.count !== 1) throw new Error("SOCIAL_POST_NOT_FOUND");
      return { id: input.id };
    },
    entityId: (output) => output.id,
  });
  revalidatePath("/app/publishing");
  revalidatePath("/app/calendar");
  return result;
}
