import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { getDataQualityReports, getAnomalies } from "@/features/analytics/queries";

export async function GET(request: Request) {
  const guard = await requireApiPermission(Permission.VIEW_ANALYTICS);
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
  const unresolvedOnly = searchParams.get("unresolved") === "1";
  const [reports, anomalies] = await Promise.all([
    getDataQualityReports(workspaceId),
    getAnomalies(workspaceId, unresolvedOnly),
  ]);
  return NextResponse.json({ reports, anomalies });
}
