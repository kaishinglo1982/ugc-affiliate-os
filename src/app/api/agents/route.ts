import { z } from "zod";
import { created, ok, parseBody, validateValue } from "@/lib/api";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { getCurrentUser } from "@/lib/auth/current-user";
import { writeAuditLog } from "@/lib/audit/log";
import { createAgent, listAgents } from "@/server/services/agents";

export const dynamic = "force-dynamic";

const agentStatusSchema = z.enum(["IDLE", "RUNNING", "PAUSED", "ERROR"]);

const listSchema = z.object({
  status: agentStatusSchema.optional(),
});

const createSchema = z.object({
  key: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(200),
  role: z.string().trim().min(1).max(100),
  description: z.string().max(2000).optional(),
  capabilities: z.array(z.string().trim().min(1).max(200)).max(100).optional(),
  allowedActions: z.array(z.string().trim().min(1).max(200)).max(100).optional(),
  status: agentStatusSchema.optional(),
});

export async function GET(request: Request) {
  const guard = await requireApiPermission(Permission.VIEW_AGENTS);
  if (guard) return guard.response;

  const { searchParams } = new URL(request.url);
  const validated = validateValue(
    { status: searchParams.get("status") ?? undefined },
    listSchema,
  );
  if ("response" in validated) return validated.response;

  const agents = await listAgents(validated.data);
  return ok({ agents });
}

export async function POST(request: Request) {
  const guard = await requireApiPermission(Permission.MANAGE_AGENTS);
  if (guard) return guard.response;

  const validated = await parseBody(request, createSchema);
  if ("response" in validated) return validated.response;

  const actor = (await getCurrentUser())?.id ?? "owner";
  const agent = await createAgent(validated.data);

  await writeAuditLog({
    action: "agent.create",
    entityType: "Agent",
    entityId: agent.id,
    actor,
  });

  return created({ agent });
}
