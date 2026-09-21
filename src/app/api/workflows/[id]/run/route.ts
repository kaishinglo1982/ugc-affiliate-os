import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/client";
import { writeAuditLog } from "@/lib/audit/log";
import { hashWorkflowDefinition } from "@/lib/workflows/repository";
import {
  createWorkflowRunSnapshot,
  parseAndValidateWorkflowDefinition,
} from "@/lib/workflows/validation";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ context: z.unknown().optional() }).optional();

function jsonObject(value: Prisma.JsonValue | null): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

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
  const payload = parsed.success ? parsed.data?.context : undefined;

  const workflow = await prisma.workflowDefinition.findFirst({
    where: { id, workspaceId },
    include: { steps: { orderBy: { stepOrder: "asc" } } },
  });
  if (!workflow) {
    return NextResponse.json({ error: "Workflow nicht gefunden." }, { status: 404 });
  }
  if (workflow.status !== "ACTIVE") {
    return NextResponse.json({ error: "Nur aktive Workflows können gestartet werden." }, { status: 409 });
  }

  const definition = parseAndValidateWorkflowDefinition({
    key: workflow.key,
    name: workflow.name,
    ...(workflow.description ? { description: workflow.description } : {}),
    version: workflow.version,
    status: workflow.status,
    trigger: workflow.trigger,
    ...(workflow.scheduleCron ? { scheduleCron: workflow.scheduleCron } : {}),
    steps: workflow.steps.map((step) => ({
      key: step.key,
      name: step.name,
      type: step.type,
      order: step.stepOrder,
      dependsOn: step.dependsOn,
      config: jsonObject(step.config),
    })),
    metadata: jsonObject(workflow.config),
  });
  const snapshot = createWorkflowRunSnapshot(definition);
  const definitionHash = workflow.definitionHash ?? hashWorkflowDefinition(definition);

  const actor = (await getCurrentUser())?.id ?? "owner";
  const run = await prisma.workflowRun.create({
    data: {
      workspaceId,
      workflowId: id,
      workflowVersion: workflow.version,
      definitionSnapshot: snapshot as Prisma.InputJsonValue,
      definitionHash,
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
