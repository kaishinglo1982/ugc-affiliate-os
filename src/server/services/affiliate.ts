import "server-only";
import { withWorkspaceDb } from "@/lib/db/workspace-context";

export async function listAffiliatePrograms() {
  return withWorkspaceDb((tx) =>
    tx.affiliateProgram.findMany({
      include: {
        credential: { select: { id: true, lastRotatedAt: true } },
        _count: { select: { links: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  );
}

export async function listAffiliateLinks() {
  return withWorkspaceDb((tx) =>
    tx.affiliateLink.findMany({
      include: { program: true, product: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  );
}

export async function listProductsForSelect() {
  return withWorkspaceDb((tx, workspaceId) =>
    tx.product.findMany({
      where: { workspaceId, status: { not: "ARCHIVED" } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  );
}
