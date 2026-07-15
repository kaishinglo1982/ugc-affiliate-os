import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/client";
import { writeAuditLog } from "@/lib/audit/log";
import type { WorkflowStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const patchSchema = z.object({ status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"]) });

export async function PATCH(
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
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });
  }

  const actor = (await getCurrentUser())?.id ?? "owner";
  const existing = await prisma.workflowDefinition.findFirst({ where: { id, workspaceId } });
  if (!existing) return NextResponse.json({ error: "Workflow nicht gefunden." }, { status: 404 });
  const workflow = await prisma.workflowDefinition.update({
    where: { id },
    data: { status: parsed.data.status as WorkflowStatus },
  });

  await writeAuditLog({
    action: "workflow.update",
    entityType: "WorkflowDefinition",
    entityId: id,
    actor,
    metadata: { status: workflow.status },
  });

  return NextResponse.json({ workflow });
}
