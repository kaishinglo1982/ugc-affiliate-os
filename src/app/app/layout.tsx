import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/db/client";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
import { AppShell } from "@/components/app-shell/app-shell";
import { listRecentNotifications, countUnreadNotifications } from "@/server/services/notifications";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const workspaceId = await resolveWorkspaceId();

  const [notifications, unreadCount, integrationIssueCount] = await Promise.all([
    listRecentNotifications(workspaceId),
    countUnreadNotifications(workspaceId),
    prisma.integration.count({ where: { workspaceId, lastError: { not: null } } }),
  ]);

  return (
    <AppShell
      user={{ name: user.name, email: user.email }}
      notifications={notifications}
      unreadCount={unreadCount}
      integrationIssueCount={integrationIssueCount}
    >
      {children}
    </AppShell>
  );
}
