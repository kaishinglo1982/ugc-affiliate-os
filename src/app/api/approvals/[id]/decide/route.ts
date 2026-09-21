import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { getCurrentUser } from "@/lib/auth/current-user";
import { decideApproval } from "@/server/services/approvals";
import { writeAuditLog } from "@/lib/audit/log";

export const dynamic = "force-dynamic";

const decideSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  decisionReason: z.string().max(2000).optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireApiPermission(Permission.DECIDE_APPROVALS);
  if (guard) return guard.response;

  let workspaceId: string;
  try {
    workspaceId = await resolveWorkspaceId();
  } catch (e) {
    if (e instanceof InvalidTenantTokenError) {
      return NextResponse.json({ error: "Ungültiges Tenant-Token." }, { status: 401 });
    }
    throw e;
  }

  const { id } = await context.params;
  const parsed = decideSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });
  }

  const actor = (await getCurrentUser())?.id ?? "owner";
  try {
    const approval = await decideApproval(
      id,
      workspaceId,
      parsed.data.decision,
      parsed.data.decisionReason,
    );

    await writeAuditLog({
      action: "approval.decide",
      entityType: "Approval",
      entityId: approval.id,
      actor,
      metadata: {
        decision: parsed.data.decision,
        requiredApproverCount: approval.requiredApproverCount,
        decisionCount: approval.decisions.length,
        status: approval.status,
        signed: true,
      },
    });

    return NextResponse.json({ approval });
  } catch (error) {
    const code = error instanceof Error ? error.message : "APPROVAL_DECISION_FAILED";
    const status =
      code === "APPROVAL_NOT_FOUND" ? 404 :
      code === "APPROVAL_EXPIRED" ? 410 :
      code === "APPROVAL_NOT_PENDING" || code === "APPROVAL_ALREADY_CONSUMED" ? 409 :
      code === "FOUR_EYES_REQUESTER_CANNOT_APPROVE" || code === "APPROVAL_ALREADY_DECIDED_BY_ACTOR" ? 403 :
      409;
    return NextResponse.json({ error: code }, { status });
  }

}
