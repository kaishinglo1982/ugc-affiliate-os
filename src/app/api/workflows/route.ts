import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/client";
import { writeAuditLog } from "@/lib/audit/log";
import type { WorkflowStatus, WorkflowStepType } from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireApiPermission(Permission.VIEW_WORKFLOWS);
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
  const status = searchParams.get("status");

  const workflows = await prisma.workflowDefinition.findMany({
    where: {
      workspaceId: workspaceId,
      ...(status ? { status: status as WorkflowStatus } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { steps: { orderBy: { stepOrder: "asc" } } },
  });

  return NextResponse.json({ workflows });
}

const stepSchema = z.object({
  key: z.string().min(1).max(100).optional(),
  type: z.enum(["AGENT", "TOOL", "APPROVAL", "CONDITION"]),
  name: z.string().min(1).max(200),
  config: z.unknown().optional(),
});

const createSchema = z.object({
  name: z.string().min(1).max(200),
  key: z.string().min(1).max(100).optional(),
  description: z.string().max(2000).optional(),
  trigger: z.string().max(50).optional(),
  scheduleCron: z.string().max(100).optional(),
  enabled: z.boolean().optional(),
  ownerId: z.string().optional(),
  config: z.unknown().optional(),
  steps: z.array(stepSchema).optional(),
});

export async function POST(request: Request) {
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

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });
  }

  const actor = (await getCurrentUser())?.id ?? "owner";
  const { steps, ...rest } = parsed.data;

  const workflow = await prisma.workflowDefinition.create({
    data: {
      workspaceId: workspaceId,
      ...rest,
      key: rest.key ?? rest.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      config: rest.config as Prisma.InputJsonValue | undefined,
      steps: steps
        ? {
            create: steps.map((s, index) => ({
              stepOrder: index,
              key: s.key ?? `step-${index}`,
              type: s.type as WorkflowStepType,
              name: s.name,
              config: s.config as Prisma.InputJsonValue | undefined,
            })),
          }
        : undefined,
    },
    include: { steps: { orderBy: { stepOrder: "asc" } } },
  });

  await writeAuditLog({
    action: "workflow.create",
    entityType: "WorkflowDefinition",
    entityId: workflow.id,
    actor,
  });

  return NextResponse.json({ workflow }, { status: 201 });
}
