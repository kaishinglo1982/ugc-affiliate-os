import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/client";
import { writeAuditLog } from "@/lib/audit/log";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
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

  const { id } = await context.params;
  const experiment = await prisma.contentExperiment.findFirst({
    where: { id, workspaceId: workspaceId },
    include: {
      variants: true,
      assignments: { take: 200 },
      results: { orderBy: { analyzedAt: "desc" }, take: 5 },
    },
  });
  if (!experiment) return NextResponse.json({ error: "Experiment nicht gefunden." }, { status: 404 });
  return NextResponse.json({ experiment });
}

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  minimumSampleSize: z.number().int().min(1).max(10_000_000).optional(),
  confidenceThreshold: z.number().min(0.5).max(0.999).optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
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

  const { id } = await context.params;
  const user = await getCurrentUser();
  const actor = user?.id ?? "owner";

  const existing = await prisma.contentExperiment.findFirst({ where: { id, workspaceId: workspaceId } });
  if (!existing) return NextResponse.json({ error: "Experiment nicht gefunden." }, { status: 404 });
  if (existing.status !== "DRAFT") {
    return NextResponse.json({ error: "Nur Entwürfe können bearbeitet werden." }, { status: 409 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });
  }

  const updated = await prisma.contentExperiment.update({
    where: { id: existing.id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
      ...(parsed.data.minimumSampleSize !== undefined ? { minimumSampleSize: parsed.data.minimumSampleSize } : {}),
      ...(parsed.data.confidenceThreshold !== undefined
        ? { confidenceThreshold: parsed.data.confidenceThreshold }
        : {}),
    },
  });
  await writeAuditLog({ action: "experiment.updated", entityType: "ContentExperiment", entityId: id, actor });
  return NextResponse.json({ experiment: updated });
}
