import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { getCurrentUser } from "@/lib/auth/current-user";
import { writeAuditLog } from "@/lib/audit/log";
import { consumeApprovalWithToken } from "@/lib/governance/consume-approval";

export const dynamic = "force-dynamic";

const consumeSchema = z.object({
  token: z.string().min(1).max(256),
  cost: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.string().min(3).max(3),
});

const ERROR_STATUS: Record<string, number> = {
  APPROVAL_NOT_FOUND: 404,
  ENVELOPE_MISSING: 409,
  TOKEN_MISMATCH: 403,
  ALREADY_CONSUMED: 409,
  NOT_APPROVED: 409,
  COST_OUTSIDE_ENVELOPE: 422,
  CONCURRENT_CONSUME: 409,
};

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
      return NextResponse.json(
        { error: "Ungültiges Tenant-Token." },
        { status: 401 },
      );
    }
    throw e;
  }

  const { id } = await context.params;
  const parsed = consumeSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });
  }

  const actor = (await getCurrentUser())?.id ?? "owner";
  const result = await consumeApprovalWithToken({
    workspaceId,
    approvalId: id,
    token: parsed.data.token,
    cost: parsed.data.cost,
    currency: parsed.data.currency,
    actor,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.code },
      { status: ERROR_STATUS[result.code] ?? 400 },
    );
  }

  await writeAuditLog({
    action: "approval.consume",
    entityType: "Approval",
    entityId: result.approvalId,
    actor,
    metadata: { envelopeId: result.envelopeId },
  });

  return NextResponse.json({ consumed: true, approvalId: result.approvalId });
}
