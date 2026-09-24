import "server-only";
import { prisma } from "@/lib/db/client";
import { resolveWorkspaceId } from "@/lib/auth/tenant";

export async function listCampaigns() {
  const workspaceId = await resolveWorkspaceId();
  const campaigns = await prisma.campaign.findMany({
    where: { workspaceId },
    include: {
      product: { select: { id: true, name: true } },
      _count: { select: { scripts: true, videoJobs: true, socialPosts: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return campaigns;
}

export async function getCampaignById(id: string) {
  const workspaceId = await resolveWorkspaceId();
  return prisma.campaign.findFirst({
    where: { id, workspaceId },
    include: {
      product: true,
      affiliateLink: { include: { program: true } },
      scripts: { orderBy: { createdAt: "desc" } },
      videoJobs: { orderBy: { createdAt: "desc" } },
      socialPosts: { include: { account: true }, orderBy: { createdAt: "desc" } },
      revenues: { orderBy: { date: "desc" } },
      expenses: { orderBy: { date: "desc" } },
    },
  });
}
