import "server-only";
import { prisma } from "@/lib/db/client";

export async function listRecentNotifications(limit = 8) {
  return prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function countUnreadNotifications(): Promise<number> {
  return prisma.notification.count({ where: { readAt: null } });
}
