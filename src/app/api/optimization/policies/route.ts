import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { Decimal } from "@/lib/shared/decimal";
import { tenantPrisma as prisma } from "@/lib/db/tenant-client";
import { writeAuditLog } from "@/lib/audit/log";
import { getCurrentUser } from "@/lib/auth/current-user";
import type { RecommendationType } from "@/generated/prisma/client";

export async function GET() {
  const guard = await requireApiPermission(Permission.VIEW_OPTIMIZATION_POLICY);
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
  const policies = await prisma.optimizationPolicy.findMany({
    where: { workspaceId: workspaceId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ policies });
}

const createSchema = z.object({
  scopeType: z.enum(["WORKSPACE", "BRAND", "NICHE", "CAMPAIGN", "PRODUCT", "CONTENT_ASSET", "CONTENT_VARIANT", "SOCIAL_ACCOUNT"]),
  scopeId: z.string().min(1).max(200),
  mode: z.enum(["OBSERVE_ONLY", "RECOMMEND", "DRAFT_VARIANTS"]).default("OBSERVE_ONLY"),
  minimumSampleSize: z.number().int().min(1).max(10_000_000).default(1000),
  minimumConfidenceScore: z.number().min(0).max(1).default(0.8),
  maximumRecommendationsPerDay: z.number().int().min(1).max(1000).default(10),
  allowAiAnalysis: z.boolean().default(false),
  allowAiVariantDrafts: z.boolean().default(false),
  requireApprovalForExperiment: z.boolean().default(true),
  requireApprovalForVariantDraft: z.boolean().default(true),
  requireApprovalForScheduleChange: z.boolean().default(true),
  blockedRecommendationTypes: z.array(z.string()).default([]),
});

export async function POST(request: Request) {
  const guard = await requireApiPermission(Permission.MANAGE_OPTIMIZATION_POLICY);
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
  const actor = (await getCurrentUser())?.id ?? "owner";

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe.", fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
   const policy = await prisma.optimizationPolicy.create({
    data: {
      workspaceId: workspaceId,
      ...parsed.data,
      blockedRecommendationTypes: parsed.data.blockedRecommendationTypes as RecommendationType[],
      minimumConfidenceScore: new Decimal(parsed.data.minimumConfidenceScore),
    },
  });
  await writeAuditLog({ action: "optimization_policy.created", entityType: "OptimizationPolicy", entityId: policy.id, actor });
  return NextResponse.json({ policy }, { status: 201 });
}
