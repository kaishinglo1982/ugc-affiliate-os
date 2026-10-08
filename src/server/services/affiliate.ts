import "server-only";
import { withWorkspaceTransaction } from "@/lib/db/workspace-transaction";
import { resolveWorkspaceId } from "@/lib/auth/tenant";

export async function listAffiliatePrograms() {
  const workspaceId = await resolveWorkspaceId();
  return withWorkspaceTransaction(workspaceId, (tx) => tx.affiliateProgram.findMany({
    include: { credential: { select: { id: true, lastRotatedAt: true } }, _count: { select: { links: true } } },
    orderBy: { createdAt: "desc" },
  }));
}

export async function listAffiliateLinks() {
  const workspaceId = await resolveWorkspaceId();
  return withWorkspaceTransaction(workspaceId, (tx) => tx.affiliateLink.findMany({
    include: { program: true, product: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  }));
}

export async function listProductsForSelect() {
  const workspaceId = await resolveWorkspaceId();
  return withWorkspaceTransaction(workspaceId, (tx) => tx.product.findMany({
    where: { workspaceId, status: { not: "ARCHIVED" } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  }));
}
