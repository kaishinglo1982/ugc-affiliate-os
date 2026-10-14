import "server-only";
import { withWorkspaceTransaction } from "@/lib/db/workspace-transaction";
import { resolveWorkspaceId } from "@/lib/auth/tenant";

export async function listSocialPosts() {
  const workspaceId = await resolveWorkspaceId();
  return withWorkspaceTransaction(workspaceId, (tx) => tx.socialPost.findMany({
    include: {
      account: true,
      campaign: { select: { id: true, name: true } },
      mediaAsset: { select: { id: true, fileName: true, url: true, kind: true } },
    },
    orderBy: { updatedAt: "desc" },
  }));
}

export async function getSocialPostById(id: string) {
  const workspaceId = await resolveWorkspaceId();
  return withWorkspaceTransaction(workspaceId, (tx) => tx.socialPost.findUnique({
    where: { id },
    include: {
      account: true,
      campaign: { select: { id: true, name: true } },
      mediaAsset: { select: { id: true, fileName: true, url: true, kind: true } },
    },
  }));
}

export async function listSocialAccounts() {
  const workspaceId = await resolveWorkspaceId();
  return withWorkspaceTransaction(workspaceId, (tx) => tx.socialAccount.findMany({ orderBy: { platform: "asc" } }));
}

/** Posts that occupy a day on the content calendar, keyed by their scheduled or already-published date. */
export async function listPostsForCalendar() {
  const workspaceId = await resolveWorkspaceId();
  const posts = await withWorkspaceTransaction(workspaceId, (tx) => tx.socialPost.findMany({
    where: { OR: [{ scheduledAt: { not: null } }, { publishedAt: { not: null } }] },
    include: {
      account: true,
      campaign: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
  }));
  return posts.map((p) => ({ ...p, calendarDate: p.publishedAt ?? p.scheduledAt! }));
}
