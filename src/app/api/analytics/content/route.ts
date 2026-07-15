import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import {
  getContentPerformance,
  getProductPerformance,
  getPostingTimePerformance,
  getDataQualityReports,
} from "@/features/analytics/queries";

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
  const range = {
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  };
  const [content, products, postingTimes, dataQuality] = await Promise.all([
    getContentPerformance(workspaceId, range),
    getProductPerformance(workspaceId, range),
    getPostingTimePerformance(workspaceId, searchParams.get("account") ?? undefined),
    getDataQualityReports(workspaceId),
  ]);

  return NextResponse.json({ content, products, postingTimes, dataQuality });
}
