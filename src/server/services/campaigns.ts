import "server-only";
import { prisma } from "@/lib/db/client";
import type { CampaignStatus } from "@/generated/prisma/client";

export async function listCampaigns(
  workspaceId: string,
  filters: { status?: CampaignStatus; productId?: string } = {},
) {
  return prisma.campaign.findMany({
    where: {
      workspaceId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.productId ? { productId: filters.productId } : {}),
    },
    include: {
      product: { select: { id: true, name: true } },
      _count: { select: { scripts: true, videoJobs: true, socialPosts: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getCampaignById(id: string, workspaceId: string) {
  return prisma.campaign.findFirst({
    where: { id, workspaceId },
    include: {
      product: true,
      affiliateLink: { include: { program: true } },
      scripts: { where: { workspaceId }, orderBy: { createdAt: "desc" } },
      videoJobs: { where: { workspaceId }, orderBy: { createdAt: "desc" } },
      socialPosts: {
        where: { workspaceId },
        include: { account: true },
        orderBy: { createdAt: "desc" },
      },
      revenues: { where: { workspaceId }, orderBy: { date: "desc" } },
      expenses: { where: { workspaceId }, orderBy: { date: "desc" } },
    },
  });
}
