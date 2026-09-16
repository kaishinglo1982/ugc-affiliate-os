import "server-only";

import type { WorkspaceTransaction } from "@/lib/db/workspace-context";

/**
 * Resolve legacy entity ids that belong to the active workspace while the
 * caller is already inside `withWorkspaceDb`. Campaign and VideoJob rows are
 * protected by PostgreSQL RLS; Product has an explicit workspace key. Media
 * assets are still legacy rows, so their ownership is derived from those
 * protected/explicit parents until MediaAsset receives its own workspace key.
 */
export async function resolveLegacyWorkspaceOwnership(
  tx: WorkspaceTransaction,
  workspaceId: string,
): Promise<{
  productIds: string[];
  campaignIds: string[];
  videoJobIds: string[];
  mediaAssetIds: string[];
}> {
  const [products, campaigns, videoJobs] = await Promise.all([
    tx.product.findMany({ where: { workspaceId }, select: { id: true } }),
    tx.campaign.findMany({ select: { id: true } }),
    tx.videoJob.findMany({ select: { id: true } }),
  ]);

  const productIds = products.map((item) => item.id);
  const campaignIds = campaigns.map((item) => item.id);
  const videoJobIds = videoJobs.map((item) => item.id);

  const mediaAssets = await tx.mediaAsset.findMany({
    where: {
      OR: [
        { productId: { in: productIds } },
        { campaignId: { in: campaignIds } },
        { videoJobId: { in: videoJobIds } },
      ],
    },
    select: { id: true },
  });

  return {
    productIds,
    campaignIds,
    videoJobIds,
    mediaAssetIds: mediaAssets.map((item) => item.id),
  };
}
