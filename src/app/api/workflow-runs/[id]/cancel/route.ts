import {
  fail,
  notFound,
  ok,
  uuidSchema,
  validateValue,
  withApiContext,
} from "@/lib/api";
import { Permission } from "@/lib/auth/rbac";
import { writeAuditLog } from "@/lib/audit/log";
import { cancelWorkflowRun } from "@/server/services/workflows";

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
    const run = await cancelWorkflowRun(
      params.data,
      auth.context.workspaceId,
    );

    await writeAuditLog({
      action: "workflow_run.cancel",
      entityType: "WorkflowRun",
      entityId: run.id,
      actor: auth.context.actor,
    });

    return ok({ run });
  } catch (error) {
    if (error instanceof Error && error.message === "WORKFLOW_RUN_NOT_FOUND") {
      return notFound("Run nicht gefunden.");
    }
    if (
      error instanceof Error &&
      error.message === "WORKFLOW_RUN_NOT_CANCELLABLE"
    ) {
      return fail("Nur aktive Runs können abgebrochen werden.", {
        status: 409,
      });
    }
    throw error;
  }
}
