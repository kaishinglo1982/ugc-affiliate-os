import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { getCurrentUser } from "@/lib/auth/current-user";
import { tenantPrisma as prisma } from "@/lib/db/tenant-client";
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
  const existing = await prisma.approval.findFirst({
    where: { id, workspaceId: workspaceId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Freigabe nicht gefunden." }, { status: 404 });
  }

  const approval = await prisma.approval.update({
    where: { id },
    data: {
      status: parsed.data.decision,
      decidedBy: actor,
      decisionReason: parsed.data.decisionReason,
      decidedAt: new Date(),
    },
  });

  await writeAuditLog({
    action: "approval.decide",
    entityType: "Approval",
    entityId: approval.id,
    actor,
    metadata: { decision: parsed.data.decision },
  });

  return NextResponse.json({ approval });
}
