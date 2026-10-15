import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { withWorkspaceTransaction } from "@/lib/db/with-workspace-transaction";
import type { AffiliateProviderKey, AffiliateOfferStatus } from "@/generated/prisma/client";

export async function GET(request: Request) {
  const guard = await requireApiPermission("product_offers.read");
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

  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider");
  const status = searchParams.get("status");
  const productId = searchParams.get("productId");

  const offers = await withWorkspaceTransaction(workspaceId, (tx) =>
    tx.affiliateOffer.findMany({
      where: {
        workspaceId,
        ...(provider ? { provider: provider as AffiliateProviderKey } : {}),
        ...(status ? { status: status as AffiliateOfferStatus } : {}),
        ...(productId ? { productId } : {}),
      },
      include: {
        product: { select: { id: true, canonicalName: true } },
        affiliateProgram: { select: { id: true, provider: true, mode: true } },
      },
      orderBy: { importedAt: "desc" },
    }),
  );
  return NextResponse.json({ offers });
}
