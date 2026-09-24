import "server-only";
import { prisma } from "@/lib/db/client";
import type { Prisma } from "@/generated/prisma/client";
import { resolveWorkspaceId } from "@/lib/auth/tenant";

export interface MediaListFilters {
  search?: string;
  kind?: string;
  includeArchived?: boolean;
}

export async function listMediaAssets(filters: MediaListFilters) {
  const workspaceId = await resolveWorkspaceId();
  const where: Prisma.MediaAssetWhereInput = { workspaceId };
  if (!filters.includeArchived) where.archivedAt = null;
  if (filters.kind && filters.kind !== "ALL") where.kind = filters.kind as Prisma.EnumMediaKindFilter["equals"];
  if (filters.search) {
    where.OR = [
      { fileName: { contains: filters.search, mode: "insensitive" } },
      { tags: { has: filters.search } },
    ];
  }

  return prisma.mediaAsset.findMany({
    where,
    include: {
      product: { select: { id: true, name: true } },
      campaign: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
