import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { tenantPrisma as prisma } from "@/lib/db/tenant-client";
import { writeAuditLog } from "@/lib/audit/log";
import { getCurrentUser } from "@/lib/auth/current-user";

const patchSchema = z.object({
  status: z.enum(["ACKNOWLEDGED", "RESOLVED", "DISMISSED"]),
  note: z.string().max(2000).optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireApiPermission(Permission.MANAGE_ANALYTICS);
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
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const existing = await prisma.analyticsAnomaly.findFirst({ where: { id, workspaceId: workspaceId } });
  if (!existing) {
    return NextResponse.json({ error: "Anomalie nicht gefunden." }, { status: 404 });
  }

  const user = await getCurrentUser();
  const anomaly = await prisma.analyticsAnomaly.update({
    where: { id },
    data: {
      status: parsed.data.status,
      resolvedAt: parsed.data.status === "RESOLVED" ? new Date() : null,
    },
  });
  await writeAuditLog({
    action: "analytics.anomaly.updated",
    entityType: "AnalyticsAnomaly",
    entityId: id,
    actor: user?.id ?? "owner",
    metadata: { status: parsed.data.status, note: parsed.data.note },
  });
  return NextResponse.json({ anomaly });
}
