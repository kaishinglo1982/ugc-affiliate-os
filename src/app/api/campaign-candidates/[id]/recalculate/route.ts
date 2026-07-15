import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { recalculateCandidate } from "@/server/services/campaign-candidates";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireApiPermission(
    Permission.MANAGE_CAMPAIGN_CANDIDATES,
  );
  if (guard) return guard.response;

  let workspaceId: string;
  try {
    workspaceId = await resolveWorkspaceId();
  } catch (e) {
    if (e instanceof InvalidTenantTokenError) {
      return NextResponse.json(
        { error: "Ungültiges Tenant-Token." },
        { status: 401 },
      );
    }
    throw e;
  }

  const { id } = await context.params;
  try {
    const candidate = await recalculateCandidate(id, workspaceId);
    return NextResponse.json({ candidate });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Neuberechnung fehlgeschlagen.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
