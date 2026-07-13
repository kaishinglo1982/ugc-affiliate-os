import "server-only";
import { prisma } from "@/lib/db/client";

export async function listAffiliatePrograms() {
  return prisma.affiliateProgram.findMany({
    include: { credential: { select: { id: true, lastRotatedAt: true } }, _count: { select: { links: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function listAffiliateLinks() {
  return prisma.affiliateLink.findMany({
    include: { program: true, product: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function listProductsForSelect() {
  return prisma.product.findMany({
    where: { status: { not: "ARCHIVED" } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
