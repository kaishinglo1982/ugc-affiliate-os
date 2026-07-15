import "server-only";
import { prisma } from "@/lib/db/client";
import type { ContentBriefStatus, ContentHookStatus } from "@/generated/prisma/client";

export async function listContentBriefs(workspaceId: string, filters?: { status?: string; campaignId?: string }) {
  return prisma.contentBrief.findMany({
    where: {
      workspaceId,
      ...(filters?.status ? { status: filters.status as ContentBriefStatus } : {}),
      ...(filters?.campaignId ? { campaignId: filters.campaignId } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { campaign: { select: { id: true, name: true } } },
  });
}

export async function getContentBrief(id: string, workspaceId: string) {
  return prisma.contentBrief.findFirst({
    where: { id, workspaceId },
    include: { campaign: { select: { id: true, name: true } }, hooks: { orderBy: { createdAt: "desc" } } },
  });
}

export async function listContentHooks(workspaceId: string, filters?: { status?: string; briefId?: string }) {
  return prisma.contentHook.findMany({
    where: {
      workspaceId,
      ...(filters?.status ? { status: filters.status as ContentHookStatus } : {}),
      ...(filters?.briefId ? { briefId: filters.briefId } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { brief: { select: { id: true, objective: true } } },
  });
}

export async function contentOverview(workspaceId: string) {
  const [briefs, hooks, scripts, assets] = await Promise.all([
    prisma.contentBrief.count({ where: { workspaceId } }),
    prisma.contentHook.count({ where: { workspaceId } }),
    prisma.script.count(),
    prisma.mediaAsset.count(),
  ]);
  const recent = await prisma.contentBrief.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: "desc" },
    take: 5,
    include: { campaign: { select: { id: true, name: true } } },
  });
  const byStatus = await prisma.contentBrief.groupBy({
    by: ["status"],
    where: { workspaceId },
    _count: { _all: true },
  });
  return { briefs, hooks, scripts, assets, recent, byStatus };
}
