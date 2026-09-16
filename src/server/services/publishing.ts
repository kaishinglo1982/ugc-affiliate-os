import "server-only";
import { prisma } from "@/lib/db/client";
import { withWorkspaceDb } from "@/lib/db/workspace-context";
import type { Prisma } from "@/generated/prisma/client";

const isCoreBound = (): boolean => process.env.CARRYOS_INTEGRATION_MODE === "CORE_BOUND";

const postInclude = {
  account: true,
  campaign: { select: { id: true, name: true } },
  mediaAsset: { select: { id: true, fileName: true, url: true, kind: true } },
} as const;

export async function listSocialPosts() {
  if (!isCoreBound()) {
    return prisma.socialPost.findMany({ include: postInclude, orderBy: { updatedAt: "desc" } });
  }

  return withWorkspaceDb((tx) =>
    tx.socialPost.findMany({ include: postInclude, orderBy: { updatedAt: "desc" } }),
  );
}

export async function getSocialPostById(id: string) {
  if (!isCoreBound()) {
    return prisma.socialPost.findUnique({ where: { id }, include: postInclude });
  }

  return withWorkspaceDb((tx) =>
    tx.socialPost.findUnique({ where: { id }, include: postInclude }),
  );
}

export async function listSocialAccounts() {
  if (!isCoreBound()) {
    return prisma.socialAccount.findMany({ orderBy: { platform: "asc" } });
  }

  return withWorkspaceDb((tx) =>
    tx.socialAccount.findMany({ orderBy: { platform: "asc" } }),
  );
}

/** Posts that occupy a day on the content calendar, keyed by their scheduled or already-published date. */
export async function listPostsForCalendar() {
  const query: Prisma.SocialPostFindManyArgs = {
    where: { OR: [{ scheduledAt: { not: null } }, { publishedAt: { not: null } }] },
    include: {
      account: true,
      campaign: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
  };

  const posts = isCoreBound()
    ? await withWorkspaceDb((tx) => tx.socialPost.findMany(query))
    : await prisma.socialPost.findMany(query);

  return posts.map((p) => ({ ...p, calendarDate: p.publishedAt ?? p.scheduledAt! }));
}
