import "server-only";
import { withWorkspaceDb } from "@/lib/db/workspace-context";
import { resolveLegacyWorkspaceOwnership } from "@/lib/db/workspace-ownership";
import type { Prisma } from "@/generated/prisma/client";

export interface MediaListFilters {
  search?: string;
  kind?: string;
  includeArchived?: boolean;
}

export async function listMediaAssets(filters: MediaListFilters) {
  return withWorkspaceDb(async (tx, workspaceId) => {
    const ownership = await resolveLegacyWorkspaceOwnership(tx, workspaceId);
    const conditions: Prisma.MediaAssetWhereInput[] = [
      { id: { in: ownership.mediaAssetIds } },
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
