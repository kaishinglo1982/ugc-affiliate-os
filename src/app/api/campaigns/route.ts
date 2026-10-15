import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { resolveWorkspaceId, InvalidTenantTokenError } from "@/lib/auth/tenant";
import { withWorkspaceTransaction } from "@/lib/db/with-workspace-transaction";
import type { CampaignStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireApiPermission(Permission.VIEW_CAMPAIGNS);
  if (guard) return guard.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const productId = searchParams.get("productId");

  let workspaceId: string;
  try {
    workspaceId = await resolveWorkspaceId();
  } catch (error) {
    if (error instanceof InvalidTenantTokenError) {
      return NextResponse.json({ error: "Invalid tenant context" }, { status: 403 });
    }
    return NextResponse.json({ error: "Workspace context unavailable" }, { status: 403 });
  }

  const campaigns = await withWorkspaceTransaction(workspaceId, (tx) =>
    tx.campaign.findMany({
      where: {
        workspaceId,
        ...(status ? { status: status as CampaignStatus } : {}),
        ...(productId ? { productId } : {}),
      },
      orderBy: { createdAt: "desc" },
    }),
  );

  return NextResponse.json({ campaigns });
}
