"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { withWorkspaceDb } from "@/lib/db/workspace-context";
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
import type { Prisma, SocialPost } from "@/generated/prisma/client";

const isCoreBound = (): boolean => process.env.CARRYOS_INTEGRATION_MODE === "CORE_BOUND";

async function withPublishingDb<T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  if (isCoreBound()) return withWorkspaceDb(callback);
  return prisma.$transaction(callback);
}

type PublishingReferences = {
  accountId: string;
  campaignId: string | null;
  mediaAssetId: string | null;
};

async function referencesVisible(
  tx: Prisma.TransactionClient,
  refs: PublishingReferences,
): Promise<boolean> {
  const [account, campaign, mediaAsset] = await Promise.all([
    tx.socialAccount.findUnique({ where: { id: refs.accountId }, select: { id: true } }),
    refs.campaignId
      ? tx.campaign.findUnique({ where: { id: refs.campaignId }, select: { id: true } })
      : Promise.resolve(null),
    refs.mediaAssetId
      ? tx.mediaAsset.findUnique({ where: { id: refs.mediaAssetId }, select: { id: true } })
      : Promise.resolve(null),
  ]);

  if (!account) return false;
  if (refs.campaignId && !campaign) return false;
  if (refs.mediaAssetId && !mediaAsset) return false;
  return true;
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

  const data = {
    accountId: parsed.data.accountId,
    campaignId: parsed.data.campaignId || null,
    mediaAssetId: parsed.data.mediaAssetId || null,
    caption: parsed.data.caption,
    hashtags: parseHashtags(parsed.data.hashtags),
    affiliateLinkText: parsed.data.affiliateLinkText || null,
    disclosure: parsed.data.disclosure || null,
  };

  const post = await withPublishingDb(async (tx) => {
    if (!(await referencesVisible(tx, data))) {
      throw new Error("PUBLISHING_REFERENCE_NOT_VISIBLE_IN_WORKSPACE");
    }

    if (postId) {
      const existing = await tx.socialPost.findUnique({ where: { id: postId }, select: { id: true } });
      if (!existing) throw new Error("SOCIAL_POST_NOT_VISIBLE_IN_WORKSPACE");
      return tx.socialPost.update({ where: { id: postId }, data });
    }

    return tx.socialPost.create({ data: { ...data, status: "DRAFT" } });
  }).catch((error: unknown) => {
    console.error("[publishing:save]", error);
    return null;
  });

  if (!post) return fail("Post oder verknüpfte Ressource ist in diesem Workspace nicht verfügbar.", requestId);

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
  extraData?: Record<string, unknown>,
): Promise<Result<SocialPost>> {
  const transition = await withPublishingDb(async (tx) => {
    const current = await tx.socialPost.findUnique({ where: { id } });
    if (!current) return { kind: "missing" as const };

    if (!isValidPostTransition(current.status as SocialPostStatus, to)) {
      return { kind: "invalid" as const, current };
    }

    const updated = await tx.socialPost.update({
      where: { id },
      data: { status: to, ...extraData },
    });
    return { kind: "updated" as const, current, updated };
  });

  if (transition.kind === "missing") return fail("Post nicht gefunden.", requestId);
  if (transition.kind === "invalid") {
    return fail(
      `Statuswechsel von "${transition.current.status}" zu "${to}" ist nicht zulässig.`,
      requestId,
    );
  }

  await writeAuditLog({
    action: "social_post.status_change",
    entityType: "SocialPost",
    entityId: id,
    requestId,
    actor,
    metadata: { from: transition.current.status, to },
  });

  revalidatePath("/app/publishing");
  revalidatePath("/app/calendar");
  return ok(transition.updated, requestId);
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

  return transitionPost(id, parsed.data.status, requestId, user.email);
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

  return transitionPost(id, "SCHEDULED", requestId, user.email, {
    scheduledAt: new Date(parsed.data.scheduledAt),
  });
}

/** Publishes only after the post and all linked resources were resolved inside the active workspace. */
export async function publishPostAction(id: string): Promise<Result<SocialPost & { externalPostUrl?: string }>> {
  const requestId = newRequestId();
  const user = await getCurrentUser();
  if (!user) return fail("Nicht authentifiziert.", requestId);

  const prepared = await withPublishingDb(async (tx) => {
    const post = await tx.socialPost.findUnique({
      where: { id },
      include: { account: true, mediaAsset: { select: { url: true } } },
    });
    if (!post) return { kind: "missing" as const };

    const refsOk = await referencesVisible(tx, {
      accountId: post.accountId,
      campaignId: post.campaignId,
      mediaAssetId: post.mediaAssetId,
    });
    if (!refsOk) return { kind: "missing" as const };

    if (!isValidPostTransition(post.status as SocialPostStatus, "PUBLISHING")) {
      return { kind: "invalid" as const, post };
    }

    await tx.socialPost.update({ where: { id }, data: { status: "PUBLISHING" } });
    return { kind: "ready" as const, post };
  });

  if (prepared.kind === "missing") return fail("Post nicht gefunden.", requestId);
  if (prepared.kind === "invalid") {
    return fail(`Post kann aus Status "${prepared.post.status}" nicht veröffentlicht werden.`, requestId);
  }

  const post = prepared.post;
  const provider = resolveSocialProvider(post.account.platform);
  const result = await provider.publish({
    postId: post.id,
    platform: post.account.platform,
    caption: post.caption,
    hashtags: post.hashtags,
    mediaUrl: post.mediaAsset?.url,
  });

  const updated = await withPublishingDb(async (tx) => {
    const visible = await tx.socialPost.findUnique({ where: { id }, select: { id: true } });
    if (!visible) throw new Error("SOCIAL_POST_LOST_WORKSPACE_AUTHORITY");
    return tx.socialPost.update({
      where: { id },
      data: result.success
        ? { status: "PUBLISHED", publishedAt: new Date(), errorMessage: null, attempts: { increment: 1 } }
        : { status: "FAILED", errorMessage: result.errorMessage ?? "Veröffentlichung fehlgeschlagen.", attempts: { increment: 1 } },
    });
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

  const copy = await withPublishingDb(async (tx) => {
    const source = await tx.socialPost.findUnique({ where: { id } });
    if (!source) return null;

    const refsOk = await referencesVisible(tx, {
      accountId: source.accountId,
      campaignId: source.campaignId,
      mediaAssetId: source.mediaAssetId,
    });
    if (!refsOk) return null;

    return tx.socialPost.create({
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
  });

  if (!copy) return fail("Post nicht gefunden.", requestId);

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
    handler: async (input) =>
      withPublishingDb(async (tx) => {
        const visible = await tx.socialPost.findUnique({ where: { id: input.id }, select: { id: true } });
        if (!visible) throw new Error("SOCIAL_POST_NOT_VISIBLE_IN_WORKSPACE");
        await tx.socialPost.delete({ where: { id: input.id } });
        return { id: input.id };
      }),
    entityId: (output) => output.id,
  });
  revalidatePath("/app/publishing");
  revalidatePath("/app/calendar");
  return result;
}
