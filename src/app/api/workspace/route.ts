import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { env } from "@/lib/config/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireApiPermission(Permission.VIEW_WORKSPACE);
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

  return NextResponse.json({
    workspace: {
      id: workspaceId,
      mode: "multi-tenant",
      environment: env.nodeEnv,
      appUrl: env.appUrl() ?? null,
    },
  });
}
