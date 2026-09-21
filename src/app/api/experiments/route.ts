import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { getCurrentUser } from "@/lib/auth/current-user";
import { tenantPrisma as prisma } from "@/lib/db/tenant-client";
import { createExperiment, type CreateExperimentInput } from "@/features/experimentation/service";
import type { ExperimentStatus } from "@/generated/prisma/client";

const variantSchema = z.object({
  name: z.string().min(1).max(120),
  isControl: z.boolean(),
  trafficWeight: z.number().int().min(0).max(100),
  contentVariantId: z.string().uuid().optional().nullable(),
});

const createSchema = z.object({
  brandId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  experimentType: z.enum(["HOOK", "SCRIPT", "CAPTION", "THUMBNAIL", "CTA", "POSTING_TIME", "CONTENT_FORMAT", "PRODUCT", "PLATFORM"]),
  primaryMetric: z.enum([
    "VIEW_RATE",
    "COMPLETION_RATE",
    "ENGAGEMENT_RATE",
    "CLICK_THROUGH_RATE",
    "CONVERSION_RATE",
    "COMMISSION_REVENUE",
    "ESTIMATED_NET_REVENUE",
    "REVENUE_PER_VIEW",
    "REVENUE_PER_CLICK",
    "RETURN_ON_CONTENT_SPEND",
  ]),
  secondaryMetrics: z
    .array(z.enum([
      "VIEW_RATE",
      "COMPLETION_RATE",
      "ENGAGEMENT_RATE",
      "CLICK_THROUGH_RATE",
      "CONVERSION_RATE",
      "COMMISSION_REVENUE",
      "ESTIMATED_NET_REVENUE",
      "REVENUE_PER_VIEW",
      "REVENUE_PER_CLICK",
      "RETURN_ON_CONTENT_SPEND",
    ]))
    .optional(),
  minimumSampleSize: z.number().int().min(1).max(10_000_000),
  minimumRuntimeHours: z.number().int().min(1).max(10_000),
  maximumRuntimeHours: z.number().int().min(1).max(100_000),
  confidenceThreshold: z.number().min(0.5).max(0.999),
  practicalSignificanceThreshold: z.number().min(0).max(100),
  trafficAllocationMode: z.enum(["EQUAL", "WEIGHTED", "MANUAL"]),
  variants: z.array(variantSchema).min(2).max(12),
});

export async function GET(request: Request) {
  const guard = await requireApiPermission(Permission.VIEW_EXPERIMENTS);
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
  const status = searchParams.get("status");
  const experiments = await prisma.contentExperiment.findMany({
    where: { workspaceId: workspaceId, ...(status ? { status: status as ExperimentStatus } : {}) },
    include: { variants: true, results: { orderBy: { analyzedAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ experiments });
}

export async function POST(request: Request) {
  const guard = await requireApiPermission(Permission.MANAGE_EXPERIMENTS);
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
    return NextResponse.json({ error: "Ungültige Eingabe.", fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const user = await getCurrentUser();
  const actor = user?.id ?? "owner";

  const input: CreateExperimentInput = {
    ...parsed.data,
    secondaryMetrics: parsed.data.secondaryMetrics ?? [],
  };

  try {
    const experiment = await createExperiment(input, actor, workspaceId);
    return NextResponse.json({ experiment }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Anlage fehlgeschlagen." }, { status: 400 });
  }
}
