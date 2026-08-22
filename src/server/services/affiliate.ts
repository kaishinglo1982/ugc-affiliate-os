import "server-only";
import { prisma } from "@/lib/db/client";
import type { AffiliateProviderKey } from "@/generated/prisma/client";

export async function listAffiliatePrograms(
  workspaceId: string,
  filters: { provider?: AffiliateProviderKey; status?: string } = {},
) {
  return prisma.affiliateProgram.findMany({
    where: {
      workspaceId,
      ...(filters.provider ? { provider: filters.provider } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    },
    include: {
      credential: {
        select: { id: true, lastRotatedAt: true },
      },
      _count: { select: { links: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function listAffiliateLinks(
  workspaceId: string,
  filters: { programId?: string; productId?: string } = {},
) {
  return prisma.affiliateLink.findMany({
    where: {
      workspaceId,
      ...(filters.programId ? { programId: filters.programId } : {}),
      ...(filters.productId ? { productId: filters.productId } : {}),
    },
    include: {
      program: true,
      product: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function listProductsForSelect(workspaceId: string) {
  return prisma.product.findMany({
    where: { workspaceId, status: { not: "ARCHIVED" } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
