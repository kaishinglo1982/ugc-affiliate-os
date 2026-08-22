import { z } from "zod";
import {
  notFound,
  ok,
  parseBody,
  uuidSchema,
  validateValue,
  withApiContext,
} from "@/lib/api";
import { Permission } from "@/lib/auth/rbac";
import { writeAuditLog } from "@/lib/audit/log";
import { updateAgentToolEnabled } from "@/server/services/agents";

export const dynamic = "force-dynamic";

const patchSchema = z.object({ enabled: z.boolean() });

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await withApiContext(Permission.MANAGE_AGENT_TOOLS);
  if ("response" in auth) return auth.response;

  const { id } = await context.params;
  const params = validateValue(id, uuidSchema);
  if ("response" in params) return params.response;

  const validated = await parseBody(request, patchSchema);
  if ("response" in validated) return validated.response;

  try {
    const tool = await updateAgentToolEnabled(
      params.data,
      auth.context.workspaceId,
      validated.data.enabled,
    );

    await writeAuditLog({
      action: "agent_tool.update",
      entityType: "AgentToolDefinition",
      entityId: tool.id,
      actor: auth.context.actor,
      metadata: { enabled: tool.enabled },
    });

    return ok({ tool });
  } catch (error) {
    if (error instanceof Error && error.message === "AGENT_TOOL_NOT_FOUND") {
      return notFound("Agent-Tool nicht gefunden.");
    }
    throw error;
  }
}
