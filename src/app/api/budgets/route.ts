import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { getCurrentUser } from "@/lib/auth/current-user";
import { tenantPrisma as prisma } from "@/lib/db/tenant-client";
import { writeAuditLog } from "@/lib/audit/log";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireApiPermission(Permission.VIEW_BUDGETS);
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

  const policies = await prisma.budgetPolicy.findMany({
    where: { workspaceId: workspaceId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { reservations: true } } },
  });

  return NextResponse.json({ policies });
}

const createSchema = z.object({
  name: z.string().min(1).max(200),
  scope: z.string().max(50).optional(),
  limitAmount: z.number().positive(),
  currency: z.string().max(3).optional(),
  period: z.string().max(20).optional(),
  alertThresholdPct: z.number().int().min(1).max(100).optional(),
  action: z.enum(["alert", "block"]).optional(),
  enabled: z.boolean().optional(),
});

export async function POST(request: Request) {
  const guard = await requireApiPermission(Permission.MANAGE_BUDGETS);
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
  const policy = await prisma.budgetPolicy.create({
    data: { workspaceId: workspaceId, ...parsed.data },
  });

  await writeAuditLog({
    action: "budget_policy.create",
    entityType: "BudgetPolicy",
    entityId: policy.id,
    actor,
  });

  return NextResponse.json({ policy }, { status: 201 });
}
