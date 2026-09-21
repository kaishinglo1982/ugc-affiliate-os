import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { getCurrentUser } from "@/lib/auth/current-user";
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
  requestedBy: z.string().max(200).optional(),
  cost: z.number().optional(),
  currency: z.string().max(3).optional(),
  expiresAt: z.string().datetime().optional(),
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

  const actor = (await getCurrentUser())?.id ?? "owner";
  const approval = await prisma.approval.create({
    data: {
      workspaceId: workspaceId,
      resourceType: parsed.data.resourceType,
      resourceId: parsed.data.resourceId,
      requestedBy: parsed.data.requestedBy,
      cost: parsed.data.cost,
      currency: parsed.data.currency,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      payload: parsed.data.payload as object | undefined,
    },
  });

  await writeAuditLog({
    action: "approval.create",
    entityType: "Approval",
    entityId: approval.id,
    actor,
  });

  return NextResponse.json({ approval }, { status: 201 });
}
