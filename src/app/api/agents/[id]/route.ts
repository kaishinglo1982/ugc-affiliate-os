import { z } from "zod";
import {
  fail,
  notFound,
  ok,
  parseBody,
  uuidSchema,
  validateValue,
  withApiContext,
} from "@/lib/api";
import { Permission } from "@/lib/auth/rbac";
import { writeAuditLog } from "@/lib/audit/log";
import { updateAgent } from "@/server/services/agents";

export const dynamic = "force-dynamic";

const patchSchema = z
  .object({
    status: z.enum(["IDLE", "RUNNING", "PAUSED", "ERROR"]).optional(),
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
  })
  .refine(
    (value) =>
      value.status !== undefined ||
      value.name !== undefined ||
      value.description !== undefined,
    { message: "Mindestens ein Feld muss geändert werden." },
  );

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await withApiContext(Permission.MANAGE_AGENTS);
  if ("response" in auth) return auth.response;

  const { id } = await context.params;
  const params = validateValue(id, uuidSchema);
  if ("response" in params) return params.response;

  const validated = await parseBody(request, patchSchema);
  if ("response" in validated) return validated.response;

  try {
    const agent = await updateAgent(
      params.data,
      auth.context.workspaceId,
      validated.data,
    );

    await writeAuditLog({
      action: "agent.update",
      entityType: "Agent",
      entityId: agent.id,
      actor: auth.context.actor,
      workspaceId: auth.context.workspaceId,
      metadata: { status: agent.status },
    });

    return ok({ agent });
  } catch (error) {
    if (error instanceof Error && error.message === "AGENT_NOT_FOUND") {
      return notFound("Agent nicht gefunden.");
    }
    if (
      error instanceof Error &&
      error.message.startsWith("ILLEGAL_AGENT_TRANSITION:")
    ) {
      return fail("Ungültiger Agenten-Statuswechsel.", { status: 409 });
    }
    throw error;
  }
}
