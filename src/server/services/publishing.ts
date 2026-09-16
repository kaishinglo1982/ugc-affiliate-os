import "server-only";
import { prisma } from "@/lib/db/client";
import { withWorkspaceDb, type WorkspaceTransaction } from "@/lib/db/workspace-context";
import { resolveLegacyWorkspaceOwnership } from "@/lib/db/workspace-ownership";
import type { Prisma } from "@/generated/prisma/client";

const isCoreBound = (): boolean => process.env.CARRYOS_INTEGRATION_MODE === "CORE_BOUND";

async function publishingWhere(
  tx: WorkspaceTransaction,
  workspaceId: string,
): Promise<Prisma.SocialPostWhereInput> {
  const ownership = await resolveLegacyWorkspaceOwnership(tx, workspaceId);
  return {
    OR: [
      { campaignId: { in: ownership.campaignIds } },
      { mediaAssetId: { in: ownership.mediaAssetIds } },
    ],
  };
}

const postInclude = {
  account: true,
  campaign: { select: { id: true, name: true } },
  mediaAsset: { select: { id: true, fileName: true, url: true, kind: true } },
} as const;

export async function listSocialPosts() {
  if (!isCoreBound()) {
    return prisma.socialPost.findMany({ include: postInclude, orderBy: { updatedAt: "desc" } });
  }

  return withWorkspaceDb(async (tx, workspaceId) =>
    tx.socialPost.findMany({
      where: await publishingWhere(tx, workspaceId),
      include: postInclude,
      orderBy: { updatedAt: "desc" },
    }),
  );
}

export async function getSocialPostById(id: string) {
  if (!isCoreBound()) {
    return prisma.socialPost.findUnique({ where: { id }, include: postInclude });
  }

  return withWorkspaceDb(async (tx, workspaceId) =>
    tx.socialPost.findFirst({
      where: { AND: [{ id }, await publishingWhere(tx, workspaceId)] },
      include: postInclude,
    }),
  );
}

export async function listSocialAccounts() {
  if (!isCoreBound()) {
    return prisma.socialAccount.findMany({ orderBy: { platform: "asc" } });
  }

  return withWorkspaceDb(async (tx, workspaceId) => {
    const visiblePosts = await tx.socialPost.findMany({
      where: await publishingWhere(tx, workspaceId),
      select: { accountId: true },
    });
    const accountIds = [...new Set(visiblePosts.map((post) => post.accountId))];
    if (accountIds.length === 0) return [];
    return tx.socialAccount.findMany({
      where: { id: { in: accountIds } },
      orderBy: { platform: "asc" },
    });
  });
}

/** Posts that occupy a day on the content calendar, keyed by their scheduled or already-published date. */
export async function listPostsForCalendar() {
  if (!isCoreBound()) {
    const posts = await prisma.socialPost.findMany({
      where: { OR: [{ scheduledAt: { not: null } }, { publishedAt: { not: null } }] },
      include: {
        account: true,
        campaign: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    return posts.map((p) => ({ ...p, calendarDate: p.publishedAt ?? p.scheduledAt! }));
  }

  return withWorkspaceDb(async (tx, workspaceId) => {
    const scope = await publishingWhere(tx, workspaceId);
    const posts = await tx.socialPost.findMany({
      where: {
        AND: [
          scope,
          { OR: [{ scheduledAt: { not: null } }, { publishedAt: { not: null } }] },
        ],
      },
      include: {
        account: true,
        campaign: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    return posts.map((p) => ({ ...p, calendarDate: p.publishedAt ?? p.scheduledAt! }));
  });
}
