import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { prisma } from "@/lib/db/client";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
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

  const { id } = await context.params;
  const offer = await prisma.affiliateOffer.findFirst({
    where: { id, workspaceId },
    include: {
      product: true,
      affiliateProgram: true,
    },
  });
  if (!offer) return NextResponse.json({ error: "Angebot nicht gefunden." }, { status: 404 });
  return NextResponse.json({ offer });
}
