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
  createAgentMemoryEntry,
  getAgentMemoryEntries,
} from "@/server/services/agents";

export const dynamic = "force-dynamic";

const memoryTypeSchema = z.enum(["FACT", "PREFERENCE", "CONTEXT"]);

const listSchema = z.object({
  agentKey: z.string().trim().min(1).max(100),
  type: memoryTypeSchema.optional(),
});

const createSchema = z.object({
  agentKey: z.string().trim().min(1).max(100),
  type: memoryTypeSchema.optional(),
  key: z.string().trim().min(1).max(200),
  value: z.unknown().optional(),
  importance: z.number().int().min(1).max(10).optional(),
  expiresAt: z.string().datetime().transform((value) => new Date(value)).optional(),
});

export async function GET(request: Request) {
  const auth = await withApiContext(Permission.VIEW_AGENT_MEMORY);
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const validated = validateValue(
    {
      agentKey: searchParams.get("agentKey") ?? undefined,
      type: searchParams.get("type") ?? undefined,
    },
    listSchema,
  );
  if ("response" in validated) return validated.response;

  const entries = await getAgentMemoryEntries(
    auth.context.workspaceId,
    validated.data.agentKey,
    { type: validated.data.type },
  );

  return ok({ entries });
}

export async function POST(request: Request) {
  const auth = await withApiContext(Permission.MANAGE_AGENT_MEMORY);
  if ("response" in auth) return auth.response;

  const validated = await parseBody(request, createSchema);
  if ("response" in validated) return validated.response;

  const entry = await createAgentMemoryEntry({
    workspaceId: auth.context.workspaceId,
    ...validated.data,
  });

  await writeAuditLog({
    action: "agent_memory.create",
    entityType: "AgentMemoryEntry",
    entityId: entry.id,
    actor: auth.context.actor,
  });

  return created({ entry });
}
