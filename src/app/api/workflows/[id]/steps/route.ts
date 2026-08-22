import { z } from "zod";
import {
  created,
  notFound,
  parseBody,
  uuidSchema,
  validateValue,
  withApiContext,
} from "@/lib/api";
import { Permission } from "@/lib/auth/rbac";
import { writeAuditLog } from "@/lib/audit/log";
import { addWorkflowStep } from "@/server/services/workflows";

export const dynamic = "force-dynamic";

const stepSchema = z.object({
  name: z.string().trim().min(1).max(200),
  type: z.enum(["AGENT", "TOOL", "APPROVAL", "CONDITION"]),
  config: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await withApiContext(Permission.MANAGE_WORKFLOWS);
  if ("response" in auth) return auth.response;

  const { id } = await context.params;
  const params = validateValue(id, uuidSchema);
  if ("response" in params) return params.response;

  const validated = await parseBody(request, stepSchema);
  if ("response" in validated) return validated.response;

  try {
    const step = await addWorkflowStep(
      params.data,
      auth.context.workspaceId,
      validated.data,
    );

    await writeAuditLog({
      action: "workflow_step.create",
      entityType: "WorkflowStepDefinition",
      entityId: step.id,
      actor: auth.context.actor,
      metadata: { workflowId: params.data },
    });

    return created({ step });
  } catch (error) {
    if (error instanceof Error && error.message === "WORKFLOW_NOT_FOUND") {
      return notFound("Workflow nicht gefunden.");
    }
    throw error;
  }
}
