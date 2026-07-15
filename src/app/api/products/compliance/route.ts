import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { prisma } from "@/lib/db/client";

export async function GET(_request: Request) {
  const guard = await requireApiPermission("product_compliance.read");
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

  const profiles = await prisma.productComplianceProfile.findMany({
    where: { workspaceId: workspaceId },
    include: {
      product: { select: { id: true, canonicalName: true, brandName: true } },
    },
    orderBy: { evaluatedAt: "desc" },
  });
  return NextResponse.json({ profiles });
}
