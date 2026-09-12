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
import { decideApproval } from "@/server/services/approvals";

export const dynamic = "force-dynamic";

const decideSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  decisionReason: z.string().trim().min(1).max(2000).optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await withApiContext(Permission.DECIDE_APPROVALS);
  if ("response" in auth) return auth.response;

  const { id } = await context.params;
  const params = validateValue(id, uuidSchema);
  if ("response" in params) return params.response;

  const validated = await parseBody(request, decideSchema);
  if ("response" in validated) return validated.response;

  try {
    const approval = await decideApproval(
      params.data,
      auth.context.workspaceId,
      {
        ...validated.data,
        decidedBy: auth.context.actor,
      },
    );

    await writeAuditLog({
      action: "approval.decide",
      entityType: "Approval",
      entityId: approval.id,
      actor: auth.context.actor,
      metadata: { decision: validated.data.decision },
    });

    return ok({ approval });
  } catch (error) {
    if (error instanceof Error && error.message === "APPROVAL_NOT_FOUND") {
      return notFound("Freigabe nicht gefunden.");
    }
    if (error instanceof Error && error.message === "APPROVAL_EXPIRED") {
      return fail("Freigabe ist abgelaufen.", { status: 410 });
    }
    if (
      error instanceof Error &&
      error.message === "APPROVAL_ALREADY_DECIDED"
    ) {
      return fail("Freigabe wurde bereits entschieden.", { status: 409 });
    }
    throw error;
  }
}
