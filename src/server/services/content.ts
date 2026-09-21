import "server-only";
import { tenantPrismaForWorkspace } from "@/lib/db/tenant-client";
import type { ContentBriefStatus, ContentHookStatus } from "@/generated/prisma/client";

export async function listContentBriefs(workspaceId: string, filters?: { status?: string; campaignId?: string }) {
  return tenantPrismaForWorkspace(workspaceId).contentBrief.findMany({
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
  return tenantPrismaForWorkspace(workspaceId).contentBrief.findFirst({
    where: { id, workspaceId },
    include: { campaign: { select: { id: true, name: true } }, hooks: { orderBy: { createdAt: "desc" } } },
  });
}

export async function listContentHooks(workspaceId: string, filters?: { status?: string; briefId?: string }) {
  return tenantPrismaForWorkspace(workspaceId).contentHook.findMany({
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
    tenantPrismaForWorkspace(workspaceId).contentBrief.count({ where: { workspaceId } }),
    tenantPrismaForWorkspace(workspaceId).contentHook.count({ where: { workspaceId } }),
    tenantPrismaForWorkspace(workspaceId).script.count(),
    tenantPrismaForWorkspace(workspaceId).mediaAsset.count(),
  ]);
  const recent = await tenantPrismaForWorkspace(workspaceId).contentBrief.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: "desc" },
    take: 5,
    include: { campaign: { select: { id: true, name: true } } },
  });
  const byStatus = await tenantPrismaForWorkspace(workspaceId).contentBrief.groupBy({
    by: ["status"],
    where: { workspaceId },
    _count: { _all: true },
  });
  return { briefs, hooks, scripts, assets, recent, byStatus };
}
