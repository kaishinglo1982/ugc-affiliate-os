import "server-only";
import { prisma } from "@/lib/db/client";
import { resolveWorkspaceId } from "@/lib/auth/tenant";

export async function listScripts() {
  const workspaceId = await resolveWorkspaceId();
  return prisma.script.findMany({
    where: { workspaceId },
    include: {
      product: { select: { id: true, name: true } },
      campaign: { select: { id: true, name: true } },
      _count: { select: { versions: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getScriptById(id: string) {
  const workspaceId = await resolveWorkspaceId();
  return prisma.script.findFirst({
    where: { id, workspaceId },
    include: {
      product: true,
      campaign: true,
      versions: { orderBy: { versionNumber: "desc" } },
    },
  });
}
