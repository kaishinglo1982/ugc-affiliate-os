import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { getCurrentUser } from "@/lib/auth/current-user";
import { tenantPrisma as prisma } from "@/lib/db/tenant-client";
import { writeAuditLog } from "@/lib/audit/log";

export const dynamic = "force-dynamic";
const bodySchema = z.object({ context: z.unknown().optional() }).optional();

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
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
  const payload = parsed.success ? parsed.data?.context : undefined;
  const workflow = await prisma.workflowDefinition.findFirst({
    where: { id, workspaceId },
    include: { steps: { orderBy: { stepOrder: "asc" } } },
  });
  if (!workflow) {
    return NextResponse.json({ error: "Workflow nicht gefunden." }, { status: 404 });
  }

  const snapshot = {
    key: workflow.key,
    name: workflow.name,
    description: workflow.description,
    version: workflow.version,
    status: workflow.status,
    trigger: workflow.trigger,
    scheduleCron: workflow.scheduleCron,
    steps: workflow.steps.map((step) => ({
      key: step.key,
      name: step.name,
      type: step.type,
      order: step.stepOrder,
      dependsOn: step.dependsOn,
      config: step.config ?? {},
    })),
    metadata: {},
  };
  const actor = (await getCurrentUser())?.id ?? "owner";
  const run = await prisma.workflowRun.create({
    data: {
      workspaceId,
      workflowId: id,
      workflowVersion: workflow.version,
      definitionSnapshot: snapshot as Prisma.InputJsonValue,
      definitionHash: workflow.definitionHash,
      correlationId: randomUUID(),
      status: "RUNNING",
      context: payload as Prisma.InputJsonValue | undefined,
    },
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
