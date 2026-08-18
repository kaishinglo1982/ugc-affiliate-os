import { z } from "zod";
import { created, parseBody, withApiContext } from "@/lib/api";
import { Permission } from "@/lib/auth/rbac";
import { writeAuditLog } from "@/lib/audit/log";
import { startAgentRun } from "@/server/services/agents";

const commandSchema = z.object({
  agentId: z.string().uuid(),
  prompt: z.string().trim().min(3).max(8000),
  executionKey: z.string().trim().min(8).max(200).optional(),
});

export async function POST(request: Request) {
  const auth = await withApiContext(Permission.MANAGE_AGENTS);
  if ("response" in auth) return auth.response;

  const parsed = await parseBody(request, commandSchema);
  if ("response" in parsed) return parsed.response;

  try {
    const run = await startAgentRun(
      {
        agentId: parsed.data.agentId,
        executionKey: parsed.data.executionKey,
        summary: "Creator-Cockpit-Auftrag",
        logs: {
          source: "creator-cockpit",
          prompt: parsed.data.prompt,
          dispatchedBy: auth.context.actor,
        },
      },
      { workspaceId: auth.context.workspaceId },
    );

    await writeAuditLog({
      action: "creator_cockpit.command_dispatch",
      entityType: "AgentRun",
      entityId: run.id,
      actor: auth.context.actor,
      workspaceId: auth.context.workspaceId,
      metadata: { agentId: parsed.data.agentId },
    });
    return created({ run });
  } catch (error) {
    if (error instanceof Error && error.message === "AGENT_NOT_FOUND") {
      return Response.json({ error: "Agent nicht gefunden." }, { status: 404 });
    }
    throw error;
  }
}
