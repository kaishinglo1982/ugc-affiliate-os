import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { withWorkspaceTransaction } from "@/lib/db/with-workspace-transaction";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireApiPermission("products.read");
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

  const { id } = await context.params;
  const product = await withWorkspaceTransaction(workspaceId, (tx) =>
    tx.product.findFirst({
      where: { id, workspaceId },
      include: {
        category: true,
        offers: true,
        complianceProfiles: { orderBy: { evaluatedAt: "desc" }, take: 1 },
        contentFitProfiles: { orderBy: { generatedAt: "desc" }, take: 1 },
        profitabilityEstimates: { orderBy: { generatedAt: "desc" }, take: 1 },
        opportunities: { orderBy: { calculatedAt: "desc" }, take: 1 },
        matchCandidates: true,
      },
    }),
  );

  if (!product) return NextResponse.json({ error: "Produkt nicht gefunden." }, { status: 404 });
  return NextResponse.json({ product });
}
