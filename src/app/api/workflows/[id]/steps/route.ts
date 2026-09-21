import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma, type WorkflowStepType } from "@/generated/prisma/client";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { getCurrentUser } from "@/lib/auth/current-user";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { prisma } from "@/lib/db/client";
import { writeAuditLog } from "@/lib/audit/log";

export const dynamic = "force-dynamic";

const stepKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const stepSchema = z.object({
  key: stepKeySchema.optional(),
  name: z.string().min(1).max(200),
  type: z.enum(["AGENT", "TOOL", "APPROVAL", "CONDITION"]),
  dependsOn: z.array(stepKeySchema).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

function stepKeyFromName(name: string): string {
  const normalized = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90)
    .replace(/-+$/g, "");
  return normalized || "step";
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
  const parsed = stepSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });
  }

  const workflow = await prisma.workflowDefinition.findFirst({
    where: { id, workspaceId },
    select: { id: true, status: true },
  });
  if (!workflow) {
    return NextResponse.json({ error: "Workflow nicht gefunden." }, { status: 404 });
  }
  if (workflow.status !== "DRAFT") {
    return NextResponse.json({ error: "Nur Draft-Workflows können geändert werden." }, { status: 409 });
  }

  const order = await prisma.workflowStepDefinition.aggregate({
    where: { workflowId: id, workspaceId },
    _max: { stepOrder: true },
  });
  const stepOrder = (order._max.stepOrder ?? -1) + 1;
  const baseKey = parsed.data.key ?? stepKeyFromName(parsed.data.name);
  const key = parsed.data.key ? baseKey : `${baseKey}-${stepOrder + 1}`;
  const actor = (await getCurrentUser())?.id ?? "owner";

  const step = await prisma.workflowStepDefinition.create({
    data: {
      workspaceId,
      workflowId: id,
      key,
      name: parsed.data.name,
      type: parsed.data.type as WorkflowStepType,
      dependsOn: parsed.data.dependsOn ?? [],
      config: (parsed.data.config ?? {}) as Prisma.InputJsonValue,
      stepOrder,
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
