import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/client";
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
  const previous = await prisma.workflowRun.findFirst({
    where: { id, workspaceId },
  });
  if (!previous) {
    return NextResponse.json({ error: "Run nicht gefunden." }, { status: 404 });
  }

  const actor = (await getCurrentUser())?.id ?? "owner";
  const run = await prisma.workflowRun.create({
    data: {
      workspaceId,
      workflowId: previous.workflowId,
      status: "RUNNING",
      context: previous.context as Prisma.InputJsonValue,
    },
  });

  await writeAuditLog({
    action: "workflow_run.retry",
    entityType: "WorkflowRun",
    entityId: run.id,
    actor,
    metadata: { previousRunId: id },
  });

  return NextResponse.json({ run }, { status: 201 });
}
