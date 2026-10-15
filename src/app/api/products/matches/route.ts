import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { withWorkspaceTransaction } from "@/lib/db/with-workspace-transaction";

export async function GET(_request: Request) {
  const guard = await requireApiPermission("product_matches.read");
  if (guard) return guard.response;

  let workspaceId: string;
  try {
    workspaceId = await resolveWorkspaceId();
  } catch (error) {
    if (error instanceof InvalidTenantTokenError) {
      return NextResponse.json({ error: "Ungültiges Tenant-Token." }, { status: 401 });
    }
    throw error;
  }

  const candidates = await withWorkspaceTransaction(workspaceId, (tx) =>
    tx.productMatchCandidate.findMany({
      where: { workspaceId, status: "PENDING" },
      include: {
        sourceOffer: true,
        candidateProduct: { select: { id: true, canonicalName: true, brandName: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  );

  return NextResponse.json({ candidates });
}
