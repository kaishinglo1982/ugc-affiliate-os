import { z } from "zod";
import {
  created,
  ok,
  parseBody,
  validateValue,
  withApiContext,
} from "@/lib/api";
import { Permission } from "@/lib/auth/rbac";
import { writeAuditLog } from "@/lib/audit/log";
import {
  createAgentTool,
  listAgentTools,
} from "@/server/services/agents";

export const dynamic = "force-dynamic";

const riskLevelSchema = z.enum(["LOW", "MEDIUM", "HIGH"]);

const listSchema = z.object({
  riskLevel: riskLevelSchema.optional(),
  enabled: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});

const policySchema = z.object({
  requiresApproval: z.boolean().optional(),
  maxCostPerCall: z.number().nonnegative().optional(),
  rateLimitPerMin: z.number().int().positive().optional(),
  allowedAgentKeys: z.array(z.string().trim().min(1).max(100)).max(100).optional(),
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().max(2000).optional(),
  provider: z.string().trim().min(1).max(100).optional(),
  riskLevel: riskLevelSchema.optional(),
  enabled: z.boolean().optional(),
  schema: z.unknown().optional(),
  policy: policySchema.optional(),
});

export async function GET(request: Request) {
  const auth = await withApiContext(Permission.VIEW_AGENT_TOOLS);
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const validated = validateValue(
    {
      riskLevel: searchParams.get("riskLevel") ?? undefined,
      enabled: searchParams.get("enabled") ?? undefined,
    },
    listSchema,
  );
  if ("response" in validated) return validated.response;

  const tools = await listAgentTools(auth.context.workspaceId);
  const filtered = tools.filter(
    (tool) =>
      (validated.data.riskLevel === undefined ||
        tool.riskLevel === validated.data.riskLevel) &&
      (validated.data.enabled === undefined ||
        tool.enabled === validated.data.enabled),
  );

  return ok({ tools: filtered });
}

export async function POST(request: Request) {
  const auth = await withApiContext(Permission.MANAGE_AGENT_TOOLS);
  if ("response" in auth) return auth.response;

  const validated = await parseBody(request, createSchema);
  if ("response" in validated) return validated.response;

  const tool = await createAgentTool(
    auth.context.workspaceId,
    validated.data,
  );

  await writeAuditLog({
    action: "agent_tool.create",
    entityType: "AgentToolDefinition",
    entityId: tool.id,
    actor: auth.context.actor,
  });

  return created({ tool });
}
