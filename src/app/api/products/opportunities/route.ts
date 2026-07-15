import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { prisma } from "@/lib/db/client";
import type { OpportunityStatus } from "@/generated/prisma/client";

export async function GET(request: Request) {
  const guard = await requireApiPermission("product_opportunities.read");
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
  const status = searchParams.get("status");
  const productId = searchParams.get("productId");
  const minScoreParam = searchParams.get("minScore");

  const opportunities = await prisma.productOpportunity.findMany({
    where: {
      workspaceId: workspaceId,
      ...(status ? { status: status as OpportunityStatus } : {}),
      ...(productId ? { productId } : {}),
      ...(minScoreParam ? { totalScore: { gte: Number(minScoreParam) || 0 } } : {}),
    },
    include: {
      product: { select: { id: true, canonicalName: true, brandName: true } },
      offer: { select: { id: true, provider: true } },
    },
    orderBy: { totalScore: "desc" },
  });
  return NextResponse.json({ opportunities });
}
