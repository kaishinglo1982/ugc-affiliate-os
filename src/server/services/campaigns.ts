import "server-only";
import { prisma } from "@/lib/db/client";

export async function listCampaigns() {
  const campaigns = await prisma.campaign.findMany({
    include: {
      product: { select: { id: true, name: true } },
      _count: { select: { scripts: true, videoJobs: true, socialPosts: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return campaigns;
}

export async function getCampaignById(id: string) {
  return prisma.campaign.findUnique({
    where: { id },
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
