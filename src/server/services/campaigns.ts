import "server-only";
import { withWorkspaceDb } from "@/lib/db/workspace-context";

export async function listCampaigns() {
  return withWorkspaceDb((tx) =>
    tx.campaign.findMany({
      include: {
        product: { select: { id: true, name: true } },
        _count: { select: { scripts: true, videoJobs: true, socialPosts: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
  );
}

export async function getCampaignById(id: string) {
  return withWorkspaceDb((tx) =>
    tx.campaign.findUnique({
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
    }),
  );
}
