import "server-only";
import { prisma } from "@/lib/db/client";
import { resolveWorkspaceId } from "@/lib/auth/tenant";

export async function listSocialPosts() {
  const workspaceId = await resolveWorkspaceId();
  return prisma.socialPost.findMany({
    where: { workspaceId },
    include: {
      account: true,
      campaign: { select: { id: true, name: true } },
      mediaAsset: { select: { id: true, fileName: true, url: true, kind: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getSocialPostById(id: string) {
  const workspaceId = await resolveWorkspaceId();
  return prisma.socialPost.findFirst({
    where: { id, workspaceId },
    include: {
      account: true,
      campaign: { select: { id: true, name: true } },
      mediaAsset: { select: { id: true, fileName: true, url: true, kind: true } },
    },
  });
}

export async function listSocialAccounts() {
  const workspaceId = await resolveWorkspaceId();
  return prisma.socialAccount.findMany({ where: { workspaceId }, orderBy: { platform: "asc" } });
}

/** Posts that occupy a day on the content calendar, keyed by their scheduled or already-published date. */
export async function listPostsForCalendar() {
  const workspaceId = await resolveWorkspaceId();
  const posts = await prisma.socialPost.findMany({
    where: { workspaceId, OR: [{ scheduledAt: { not: null } }, { publishedAt: { not: null } }] },
    include: {
      account: true,
      campaign: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return posts.map((p) => ({ ...p, calendarDate: p.publishedAt ?? p.scheduledAt! }));
}
