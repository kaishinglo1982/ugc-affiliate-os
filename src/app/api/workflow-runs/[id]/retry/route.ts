import {
  created,
  fail,
  notFound,
  uuidSchema,
  validateValue,
  withApiContext,
} from "@/lib/api";
import { Permission } from "@/lib/auth/rbac";
import { writeAuditLog } from "@/lib/audit/log";
import { retryWorkflowRun } from "@/server/services/workflows";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await withApiContext(Permission.MANAGE_WORKFLOWS);
  if ("response" in auth) return auth.response;

  const { id } = await context.params;
  const params = validateValue(id, uuidSchema);
  if ("response" in params) return params.response;

  try {
    const run = await retryWorkflowRun(
      params.data,
      auth.context.workspaceId,
      auth.context.actor,
    );

    await writeAuditLog({
      action: "workflow_run.retry",
      entityType: "WorkflowRun",
      entityId: run.id,
      actor: auth.context.actor,
      metadata: { previousRunId: params.data },
    });

    return created({ run });
  } catch (error) {
    if (error instanceof Error && error.message === "WORKFLOW_RUN_NOT_FOUND") {
      return notFound("Run nicht gefunden.");
    }
    if (
      error instanceof Error &&
      error.message === "WORKFLOW_RUN_NOT_RETRYABLE"
    ) {
      return fail("Nur fehlgeschlagene Runs können erneut gestartet werden.", {
        status: 409,
      });
    }
    throw error;
  }
}
