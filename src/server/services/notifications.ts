import "server-only";
import { prisma } from "@/lib/db/client";

export async function listRecentNotifications(workspaceId: string, limit = 8) {
  return prisma.notification.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function countUnreadNotifications(workspaceId: string): Promise<number> {
  return prisma.notification.count({ where: { workspaceId, readAt: null } });
}
