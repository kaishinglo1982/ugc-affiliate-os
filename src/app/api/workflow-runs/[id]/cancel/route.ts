import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { getCurrentUser } from "@/lib/auth/current-user";
import { tenantPrisma as prisma } from "@/lib/db/tenant-client";
import { writeAuditLog } from "@/lib/audit/log";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireApiPermission(Permission.MANAGE_WORKFLOWS);
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
  const run = await prisma.workflowRun.findFirst({
    where: { id, workspaceId: workspaceId },
  });
  if (!run) {
    return NextResponse.json({ error: "Run nicht gefunden." }, { status: 404 });
  }
  if (run.status !== "RUNNING") {
    return NextResponse.json({ error: "Nur aktive Runs können abgebrochen werden." }, { status: 409 });
  }

  const actor = (await getCurrentUser())?.id ?? "owner";
  const updated = await prisma.workflowRun.update({
    where: { id },
    data: { status: "CANCELLED", finishedAt: new Date() },
  });

  await writeAuditLog({
    action: "workflow_run.cancel",
    entityType: "WorkflowRun",
    entityId: id,
    actor,
  });

  return NextResponse.json({ run: updated });
}
