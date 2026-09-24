import "server-only";
import { prisma } from "@/lib/db/client";
import { resolveWorkspaceId } from "@/lib/auth/tenant";

export async function listAffiliatePrograms() {
  const workspaceId = await resolveWorkspaceId();
  return prisma.affiliateProgram.findMany({
    where: { workspaceId },
    include: { credential: { select: { id: true, lastRotatedAt: true } }, _count: { select: { links: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function listAffiliateLinks() {
  const workspaceId = await resolveWorkspaceId();
  return prisma.affiliateLink.findMany({
    where: { workspaceId },
    include: { program: true, product: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function listProductsForSelect() {
  const workspaceId = await resolveWorkspaceId();
  return prisma.product.findMany({
    where: { workspaceId, status: { not: "ARCHIVED" } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
