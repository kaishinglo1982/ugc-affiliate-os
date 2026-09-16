import "server-only";
import { withWorkspaceDb } from "@/lib/db/workspace-context";
import type { Prisma } from "@/generated/prisma/client";

export interface MediaListFilters {
  search?: string;
  kind?: string;
  includeArchived?: boolean;
}

export async function listMediaAssets(filters: MediaListFilters) {
  return withWorkspaceDb(async (tx, workspaceId) => {
    const [products, campaigns, videoJobs] = await Promise.all([
      tx.product.findMany({ where: { workspaceId }, select: { id: true } }),
      tx.campaign.findMany({ select: { id: true } }),
      tx.videoJob.findMany({ select: { id: true } }),
    ]);

    const conditions: Prisma.MediaAssetWhereInput[] = [
      {
        OR: [
          { productId: { in: products.map((item) => item.id) } },
          { campaignId: { in: campaigns.map((item) => item.id) } },
          { videoJobId: { in: videoJobs.map((item) => item.id) } },
        ],
      },
    ];
    if (!filters.includeArchived) conditions.push({ archivedAt: null });
    if (filters.kind && filters.kind !== "ALL") {
      conditions.push({ kind: filters.kind as Prisma.EnumMediaKindFilter["equals"] });
    }
    if (filters.search) {
      conditions.push({
        OR: [
          { fileName: { contains: filters.search, mode: "insensitive" } },
          { tags: { has: filters.search } },
        ],
      });
    }

    return tx.mediaAsset.findMany({
      where: { AND: conditions },
      include: {
        product: { select: { id: true, name: true } },
        campaign: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  });
}
