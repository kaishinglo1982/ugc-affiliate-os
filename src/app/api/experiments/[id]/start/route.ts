import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { getCurrentUser } from "@/lib/auth/current-user";
import { startExperiment } from "@/features/experimentation/service";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireApiPermission(Permission.MANAGE_EXPERIMENTS);
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
  const actor = (await getCurrentUser())?.id ?? "owner";
  try {
    const experiment = await startExperiment(id, actor, workspaceId);
    return NextResponse.json({ experiment });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Start fehlgeschlagen." }, { status: 400 });
  }
}
