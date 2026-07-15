import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { analyzeExperimentById } from "@/features/experimentation/service";

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
  try {
    const result = await analyzeExperimentById(id, workspaceId);
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Analyse fehlgeschlagen." }, { status: 400 });
  }
}
