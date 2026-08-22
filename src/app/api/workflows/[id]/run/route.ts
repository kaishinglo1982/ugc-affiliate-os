import { z } from "zod";
import {
  created,
  fail,
  parseBody,
  uuidSchema,
  validateValue,
  withApiContext,
} from "@/lib/api";
import { Permission } from "@/lib/auth/rbac";
import { writeAuditLog } from "@/lib/audit/log";
import { startWorkflowRun } from "@/server/services/workflows";

export const dynamic = "force-dynamic";

const bodySchema = z
  .object({ context: z.unknown().optional() })
  .nullable()
  .transform((value) => value ?? {});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await withApiContext(Permission.MANAGE_WORKFLOWS);
  if ("response" in auth) return auth.response;

  const { id } = await context.params;
  const params = validateValue(id, uuidSchema);
  if ("response" in params) return params.response;

  const validated = await parseBody(request, bodySchema);
  if ("response" in validated) return validated.response;

  try {
    const run = await startWorkflowRun(
      params.data,
      auth.context.workspaceId,
      {
        actor: auth.context.actor,
        context: validated.data.context,
        idempotencyKey:
          request.headers.get("idempotency-key")?.trim() || undefined,
      },
    );

    await writeAuditLog({
      action: "workflow.run",
      entityType: "WorkflowRun",
      entityId: run.id,
      actor: auth.context.actor,
      metadata: { workflowId: params.data },
    });

    return created({ run });
  } catch (error) {
    if (error instanceof Error && error.message === "WORKFLOW_NOT_RUNNABLE") {
      return fail("Workflow ist nicht vorhanden oder nicht aktiv.", {
        status: 409,
      });
    }
    throw error;
  }
}
