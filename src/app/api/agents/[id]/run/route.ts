import { created, notFound, validateValue, withApiContext, uuidSchema } from "@/lib/api";
import { Permission } from "@/lib/auth/rbac";
import { writeAuditLog } from "@/lib/audit/log";
import { startAgentRun } from "@/server/services/agents";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await withApiContext(Permission.MANAGE_AGENTS);
  if ("response" in auth) return auth.response;

  const { id } = await context.params;
  const params = validateValue(id, uuidSchema);
  if ("response" in params) return params.response;

  const executionKey = request.headers.get("idempotency-key")?.trim() || undefined;

  try {
    const run = await startAgentRun(
      { agentId: params.data, executionKey },
      { workspaceId: auth.context.workspaceId },
    );

    await writeAuditLog({
      action: "agent.run",
      entityType: "AgentRun",
      entityId: run.id,
      actor: auth.context.actor,
      workspaceId: auth.context.workspaceId,
      metadata: { agentId: params.data },
    });

    return created({ run });
  } catch (error) {
    if (error instanceof Error && error.message === "AGENT_NOT_FOUND") {
      return notFound("Agent nicht gefunden.");
    }
    throw error;
  }
}
