import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { prisma } from "@/lib/db/client";
import { processSyncQueue } from "@/features/analytics/sync";

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
  const onlyPending = searchParams.get("pending") === "1";

  const jobs = await prisma.analyticsSyncJob.findMany({
    where: { workspaceId: workspaceId, ...(onlyPending ? { status: "PENDING" } : {}) },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ jobs });
}

export async function POST(request: Request) {
  const guard = await requireApiPermission(Permission.MANAGE_ANALYTICS_SYNC);
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

  const report = await processSyncQueue(10);
  return NextResponse.json({ report });
}
