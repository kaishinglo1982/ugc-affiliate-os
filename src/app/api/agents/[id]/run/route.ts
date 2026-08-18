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

  const params = validateValue(await context.params, uuidSchema.transform((id) => ({ id })));
  if ("response" in params) return params.response;

  const executionKey = request.headers.get("idempotency-key")?.trim() || undefined;

  try {
    const run = await startAgentRun(
      { agentId: params.data.id, executionKey },
      { workspaceId: auth.context.workspaceId },
    );

    await writeAuditLog({
      action: "agent.run",
      entityType: "AgentRun",
      entityId: run.id,
      actor: auth.context.actor,
      metadata: { agentId: params.data.id },
    });

    return created({ run });
  } catch (error) {
    if (error instanceof Error && error.message === "AGENT_NOT_FOUND") {
      return notFound("Agent nicht gefunden.");
    }
    throw error;
  }
}
