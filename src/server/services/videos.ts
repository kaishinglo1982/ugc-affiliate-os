import "server-only";
import { prisma } from "@/lib/db/client";
import { resolveWorkspaceId } from "@/lib/auth/tenant";

export async function listVideoJobs() {
  const workspaceId = await resolveWorkspaceId();
  return prisma.videoJob.findMany({
    where: { workspaceId },
    include: {
      script: { select: { id: true, title: true } },
      product: { select: { id: true, name: true } },
      campaign: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getVideoJobById(id: string) {
  const workspaceId = await resolveWorkspaceId();
  return prisma.videoJob.findFirst({
    where: { id, workspaceId },
    include: {
      script: true,
      product: { select: { id: true, name: true } },
      campaign: { select: { id: true, name: true } },
      mediaAssets: true,
    },
  });
}
