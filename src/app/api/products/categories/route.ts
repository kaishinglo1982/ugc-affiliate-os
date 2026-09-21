import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api/guard";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { getCurrentUser } from "@/lib/auth/current-user";
import { writeAuditLog } from "@/lib/audit/log";
import { tenantPrisma as prisma } from "@/lib/db/tenant-client";
import type { RiskLevel } from "@/generated/prisma/client";

export async function GET(_request: Request) {
  const guard = await requireApiPermission("product_categories.read");
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

  const categories = await prisma.productCategory.findMany({
    where: { workspaceId: workspaceId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ categories });
}

const createSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  parentCategoryId: z.string().uuid().nullable().optional(),
  riskLevel: z.enum(["low", "medium", "high", "critical"]).optional(),
  requiresManualApproval: z.boolean().optional(),
  contentGenerationAllowed: z.boolean().optional(),
  affiliatePromotionAllowed: z.boolean().optional(),
});

export async function POST(request: Request) {
  const guard = await requireApiPermission("product_categories.manage");
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

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültige Eingabe.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const user = await getCurrentUser();
  const actor = user?.id ?? "owner";

  try {
    const category = await prisma.productCategory.create({
      data: {
        workspaceId: workspaceId,
        name: parsed.data.name,
        slug: parsed.data.slug,
        parentCategoryId: parsed.data.parentCategoryId ?? null,
        riskLevel: (parsed.data.riskLevel ?? "low") as RiskLevel,
        requiresManualApproval: parsed.data.requiresManualApproval ?? false,
        contentGenerationAllowed: parsed.data.contentGenerationAllowed ?? true,
        affiliatePromotionAllowed: parsed.data.affiliatePromotionAllowed ?? true,
      },
    });
    await writeAuditLog({
      action: "product_category.create",
      entityType: "ProductCategory",
      entityId: category.id,
      metadata: { name: category.name } as never,
      actor,
    });
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Anlage fehlgeschlagen." },
      { status: 400 },
    );
  }
}
