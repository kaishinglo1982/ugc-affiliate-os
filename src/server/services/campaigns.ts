import "server-only";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
import { withWorkspaceTransaction } from "@/lib/db/with-workspace-transaction";

export async function listCampaigns() {
  const workspaceId = await resolveWorkspaceId();
  return withWorkspaceTransaction(workspaceId, (tx) =>
    tx.campaign.findMany({
      where: { workspaceId },
      include: {
        product: { select: { id: true, name: true } },
        _count: { select: { scripts: true, videoJobs: true, socialPosts: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
  );
}

export async function getCampaignById(id: string) {
  const workspaceId = await resolveWorkspaceId();
  return withWorkspaceTransaction(workspaceId, (tx) => tx.campaign.findFirst({
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
  }));
}
