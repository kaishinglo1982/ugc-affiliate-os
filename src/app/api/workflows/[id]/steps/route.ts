import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma, type WorkflowStepType } from "@/generated/prisma/client";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/client";
import { writeAuditLog } from "@/lib/audit/log";

export const dynamic = "force-dynamic";

const stepSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  config: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireApiPermission(Permission.MANAGE_WORKFLOWS);
  if (guard) return guard.response;

  let workspaceId: string;
  try {
    workspaceId = await resolveWorkspaceId();
  } catch (error) {
    if (error instanceof InvalidTenantTokenError) {
      return NextResponse.json({ error: "Ungültiges Tenant-Token." }, { status: 401 });
    }
    throw error;
  }

  const { id } = await context.params;
  const parsed = stepSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });
  }

  const workflow = await prisma.workflowDefinition.findFirst({
    where: { id, workspaceId },
    select: { id: true },
  });
  if (!workflow) {
    return NextResponse.json({ error: "Workflow nicht gefunden." }, { status: 404 });
  }

  const existing = await prisma.workflowStepDefinition.count({
    where: { workflowId: id, workspaceId },
  });
  const actor = (await getCurrentUser())?.id ?? "owner";

  const step = await prisma.workflowStepDefinition.create({
    data: {
      workspaceId,
      workflowId: id,
      name: parsed.data.name,
      type: parsed.data.type as WorkflowStepType,
      config: (parsed.data.config ?? {}) as Prisma.InputJsonValue,
      stepOrder: existing + 1,
    },
  });

  await writeAuditLog({
    action: "workflow_step.create",
    entityType: "WorkflowStepDefinition",
    entityId: step.id,
    actor,
    metadata: { workflowId: id },
  });

  return NextResponse.json({ step });
}
