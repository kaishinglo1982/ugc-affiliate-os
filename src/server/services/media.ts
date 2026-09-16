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

    const where: Prisma.MediaAssetWhereInput = {
      AND: [
        {
          OR: [
            { productId: { in: products.map((item) => item.id) } },
            { campaignId: { in: campaigns.map((item) => item.id) } },
            { videoJobId: { in: videoJobs.map((item) => item.id) } },
          ],
        },
      ],
    };
    if (!filters.includeArchived) where.AND?.push({ archivedAt: null });
    if (filters.kind && filters.kind !== "ALL") {
      where.AND?.push({ kind: filters.kind as Prisma.EnumMediaKindFilter["equals"] });
    }
    if (filters.search) {
      where.AND?.push({
        OR: [
          { fileName: { contains: filters.search, mode: "insensitive" } },
          { tags: { has: filters.search } },
        ],
      });
    }

    return tx.mediaAsset.findMany({
      where,
      include: {
        product: { select: { id: true, name: true } },
        campaign: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  });
}
