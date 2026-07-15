import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { getCurrentUser } from "@/lib/auth/current-user";
import { approveExperiment } from "@/features/experimentation/service";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireApiPermission(Permission.APPROVE_EXPERIMENTS);
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
  // ponytail: workspaceId resolved but not yet enforced — approveExperiment()
  // doesn't accept it (service-layer gap, tracked outside this sweep).
  void workspaceId;
  const { id } = await context.params;
  const actor = (await getCurrentUser())?.id ?? "owner";
  try {
    const experiment = await approveExperiment(id, actor);
    return NextResponse.json({ experiment });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Freigabe fehlgeschlagen." }, { status: 400 });
  }
}
