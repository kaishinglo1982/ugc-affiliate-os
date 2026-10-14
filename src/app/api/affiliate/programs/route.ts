import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { resolveWorkspaceId, InvalidTenantTokenError } from "@/lib/auth/tenant";
import { withWorkspaceTransaction } from "@/lib/db/workspace-transaction";
import type { AffiliateProviderKey } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireApiPermission(Permission.VIEW_AFFILIATE_PROGRAMS);
  if (guard) return guard.response;

  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider");
  const status = searchParams.get("status");
  let workspaceId: string;
  try { workspaceId = await resolveWorkspaceId(); }
  catch (e) {
    if (e instanceof InvalidTenantTokenError) return NextResponse.json({ error: "Ungültiges Tenant-Token." }, { status: 401 });
    throw e;
  }

  const programs = await withWorkspaceTransaction(workspaceId, (tx) =>
    tx.affiliateProgram.findMany({
      where: { workspaceId, ...(provider ? { provider: provider as AffiliateProviderKey } : {}), ...(status ? { status } : {}) },
      orderBy: { createdAt: "desc" },
    }),
  );
  return NextResponse.json({ programs });
}
