import { resolveWorkspaceId } from "@/lib/auth/tenant";
import "server-only";
import { prisma } from "@/lib/db/client";

export async function listRecentNotifications(limit = 8) {
  const workspaceId = await resolveWorkspaceId();
  return prisma.notification.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function countUnreadNotifications(): Promise<number> {
  const workspaceId = await resolveWorkspaceId();
  return prisma.notification.count({ where: { workspaceId, readAt: null } });
}
