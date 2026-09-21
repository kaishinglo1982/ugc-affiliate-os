import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { createApprovalRequest } from "@/server/services/approvals";
import { tenantPrisma as prisma } from "@/lib/db/tenant-client";
import { writeAuditLog } from "@/lib/audit/log";
import type { ApprovalResourceType, ApprovalStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireApiPermission(Permission.VIEW_APPROVALS);
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

  const { searchParams } = new URL(request.url);
  const resourceType = searchParams.get("resourceType");
  const status = searchParams.get("status");

  const approvals = await prisma.approval.findMany({
    where: {
      workspaceId: workspaceId,
      ...(resourceType ? { resourceType: resourceType as ApprovalResourceType } : {}),
      ...(status ? { status: status as ApprovalStatus } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ approvals });
}

const createSchema = z.object({
  resourceType: z.enum(["product", "affiliate_offer", "product_opportunity", "product_campaign_candidate"]),
  resourceId: z.string().min(1),
  requiredApproverCount: z.number().int().min(1).max(4).default(1),
  cost: z.number().optional(),
  currency: z.string().max(3).optional(),
  expiresAt: z.string().datetime().optional(),
  escalationAt: z.string().datetime().optional(),
  payload: z.unknown().optional(),
});

export async function POST(request: Request) {
  const guard = await requireApiPermission(Permission.CREATE_APPROVALS);
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

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });
  }

  const approval = await createApprovalRequest(
    {
      resourceType: parsed.data.resourceType as ApprovalResourceType,
      resourceId: parsed.data.resourceId,
      cost: parsed.data.cost ?? null,
      currency: parsed.data.currency ?? null,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      escalationAt: parsed.data.escalationAt ? new Date(parsed.data.escalationAt) : null,
      requiredApproverCount: parsed.data.requiredApproverCount,
      note: typeof parsed.data.payload === "object" && parsed.data.payload !== null && "note" in parsed.data.payload
        ? String((parsed.data.payload as { note?: unknown }).note ?? "")
        : null,
    },
    workspaceId,
  );
  const actor = approval.requestedBy ?? "owner";

  await writeAuditLog({
    action: "approval.create",
    entityType: "Approval",
    entityId: approval.id,
    actor,
  });

  return NextResponse.json({ approval }, { status: 201 });
}
