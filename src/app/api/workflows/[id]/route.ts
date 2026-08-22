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
import { updateWorkflowStatus } from "@/server/services/workflows";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"]),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await withApiContext(Permission.MANAGE_WORKFLOWS);
  if ("response" in auth) return auth.response;

  const { id } = await context.params;
  const params = validateValue(id, uuidSchema);
  if ("response" in params) return params.response;

  const validated = await parseBody(request, patchSchema);
  if ("response" in validated) return validated.response;

  try {
    const workflow = await updateWorkflowStatus(
      params.data,
      auth.context.workspaceId,
      validated.data.status,
    );

    await writeAuditLog({
      action: "workflow.update",
      entityType: "WorkflowDefinition",
      entityId: workflow.id,
      actor: auth.context.actor,
      metadata: { status: workflow.status },
    });

    return ok({ workflow });
  } catch (error) {
    if (error instanceof Error && error.message === "WORKFLOW_NOT_FOUND") {
      return notFound("Workflow nicht gefunden.");
    }
    throw error;
  }
}
