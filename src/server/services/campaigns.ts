import "server-only";
import { withWorkspaceTransaction } from "@/lib/db/workspace-transaction";
import { resolveWorkspaceId } from "@/lib/auth/tenant";

export async function listCampaigns() {
  const workspaceId = await resolveWorkspaceId();
  const campaigns = await withWorkspaceTransaction(workspaceId, (tx) => tx.campaign.findMany({
    include: {
      product: { select: { id: true, name: true } },
      _count: { select: { scripts: true, videoJobs: true, socialPosts: true } },
    },
    orderBy: { updatedAt: "desc" },
  }));
  return campaigns;
}

export async function getCampaignById(id: string) {
  const workspaceId = await resolveWorkspaceId();
  return withWorkspaceTransaction(workspaceId, (tx) => tx.campaign.findUnique({
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
  }));
}
