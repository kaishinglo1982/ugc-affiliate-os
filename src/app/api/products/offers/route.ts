import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { prisma } from "@/lib/db/client";
import type { AffiliateProviderKey, AffiliateOfferStatus } from "@/generated/prisma/client";

export async function GET(request: Request) {
  const guard = await requireApiPermission("product_offers.read");
  if (guard) return guard.response;

  let workspaceId: string;
  try {
    workspaceId = await resolveWorkspaceId();
  } catch (e) {
    if (e instanceof InvalidTenantTokenError) {
      return NextResponse.json({ error: "Ungültiges Tenant-Token." }, { status: 401 });
    }
    throw e;
  }

  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider");
  const status = searchParams.get("status");
  const productId = searchParams.get("productId");

  const offers = await prisma.affiliateOffer.findMany({
    where: {
      workspaceId: workspaceId,
      ...(provider ? { provider: provider as AffiliateProviderKey } : {}),
      ...(status ? { status: status as AffiliateOfferStatus } : {}),
      ...(productId ? { productId } : {}),
    },
    include: {
      product: { select: { id: true, canonicalName: true } },
      affiliateProgram: { select: { id: true, provider: true, mode: true } },
    },
    orderBy: { importedAt: "desc" },
  });
  return NextResponse.json({ offers });
}
