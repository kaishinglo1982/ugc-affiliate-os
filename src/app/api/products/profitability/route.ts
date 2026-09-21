import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { tenantPrisma as prisma } from "@/lib/db/tenant-client";

export async function GET(_request: Request) {
  const guard = await requireApiPermission("product_profitability.read");
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

  const estimates = await prisma.productProfitabilityEstimate.findMany({
    where: { workspaceId: workspaceId },
    include: {
      product: { select: { id: true, canonicalName: true } },
      offer: { select: { id: true, provider: true } },
    },
    orderBy: { generatedAt: "desc" },
  });
  return NextResponse.json({ estimates });
}
