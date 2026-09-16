import "server-only";
import { withWorkspaceDb } from "@/lib/db/workspace-context";

export async function listRecentNotifications(limit = 8) {
  return withWorkspaceDb((tx) =>
    tx.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  );
}

export async function countUnreadNotifications(): Promise<number> {
  return withWorkspaceDb((tx) => tx.notification.count({ where: { readAt: null } }));
}
