import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/client";
import { writeAuditLog } from "@/lib/audit/log";
import type { AgentToolRiskLevel } from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireApiPermission(Permission.VIEW_AGENT_TOOLS);
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
  const riskLevel = searchParams.get("riskLevel");
  const enabled = searchParams.get("enabled");

  const tools = await prisma.agentToolDefinition.findMany({
    where: {
      workspaceId: workspaceId,
      ...(riskLevel ? { riskLevel: riskLevel as never } : {}),
      ...(enabled === "true" ? { enabled: true } : {}),
      ...(enabled === "false" ? { enabled: false } : {}),
    },
    orderBy: { name: "asc" },
    include: { policies: true },
  });

  return NextResponse.json({ tools });
}

const policySchema = z.object({
  requiresApproval: z.boolean().optional(),
  maxCostPerCall: z.number().optional(),
  rateLimitPerMin: z.number().int().optional(),
  allowedAgentKeys: z.array(z.string()).optional(),
});

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  provider: z.string().max(100).optional(),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  enabled: z.boolean().optional(),
  schema: z.unknown().optional(),
  policy: policySchema.optional(),
});

export async function POST(request: Request) {
  const guard = await requireApiPermission(Permission.MANAGE_AGENT_TOOLS);
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
  const { policy, ...rest } = parsed.data;

  const tool = await prisma.agentToolDefinition.create({
    data: {
      workspaceId: workspaceId,
      ...rest,
      schema: rest.schema as Prisma.InputJsonValue | undefined,
      riskLevel: (rest.riskLevel ?? "LOW") as AgentToolRiskLevel,
      policies: policy
        ? {
            create: {
              workspaceId,
              requiresApproval: policy.requiresApproval ?? false,
              maxCostPerCall: policy.maxCostPerCall,
              rateLimitPerMin: policy.rateLimitPerMin,
              allowedAgentKeys: policy.allowedAgentKeys ?? [],
            },
          }
        : undefined,
    },
    include: { policies: true },
  });

  await writeAuditLog({
    action: "agent_tool.create",
    entityType: "AgentToolDefinition",
    entityId: tool.id,
    actor,
  });

  return NextResponse.json({ tool }, { status: 201 });
}
