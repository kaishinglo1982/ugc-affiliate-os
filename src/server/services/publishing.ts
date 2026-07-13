import "server-only";
import { prisma } from "@/lib/db/client";

export async function listSocialPosts() {
  return prisma.socialPost.findMany({
    include: {
      account: true,
      campaign: { select: { id: true, name: true } },
      mediaAsset: { select: { id: true, fileName: true, url: true, kind: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getSocialPostById(id: string) {
  return prisma.socialPost.findUnique({
    where: { id },
    include: {
      account: true,
      campaign: { select: { id: true, name: true } },
      mediaAsset: { select: { id: true, fileName: true, url: true, kind: true } },
    },
  });
}

export async function listSocialAccounts() {
  return prisma.socialAccount.findMany({ orderBy: { platform: "asc" } });
}

/** Posts that occupy a day on the content calendar, keyed by their scheduled or already-published date. */
export async function listPostsForCalendar() {
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
