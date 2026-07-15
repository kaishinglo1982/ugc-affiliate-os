import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/client";
import { writeAuditLog } from "@/lib/audit/log";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ context: z.unknown().optional() }).optional();

export async function POST(
  request: Request,
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
  const parsed = bodySchema.safeParse(await request.json().catch(() => undefined));
  const payload = parsed.success ? (parsed.data?.context as object | undefined) : undefined;

  const workflow = await prisma.workflowDefinition.findFirst({
    where: { id, workspaceId: workspaceId },
  });
  if (!workflow) {
    return NextResponse.json({ error: "Workflow nicht gefunden." }, { status: 404 });
  }

  const actor = (await getCurrentUser())?.id ?? "owner";
  const run = await prisma.workflowRun.create({
    data: { workflowId: id, status: "RUNNING", context: payload },
  });

  await writeAuditLog({
    action: "workflow.run",
    entityType: "WorkflowRun",
    entityId: run.id,
    actor,
    metadata: { workflowId: id },
  });

  return NextResponse.json({ run }, { status: 201 });
}
