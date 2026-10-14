import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { withWorkspaceTransaction } from "@/lib/db/workspace-transaction";

export const dynamic = "force-dynamic";

function parseIntOr(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(request: Request) {
  const guard = await requireApiPermission(Permission.VIEW_AUDIT_LOG);
  if (guard) return guard.response;

  let workspaceId: string;
  try { workspaceId = await resolveWorkspaceId(); }
  catch (e) {
    if (e instanceof InvalidTenantTokenError) return NextResponse.json({ error: "Ungültiges Tenant-Token." }, { status: 401 });
    throw e;
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(parseIntOr(searchParams.get("limit"), 50), 1), 200);
  const offset = Math.max(parseIntOr(searchParams.get("offset"), 0), 0);
  const action = searchParams.get("action") ?? undefined;
  const entityType = searchParams.get("entityType") ?? undefined;
  const entityId = searchParams.get("entityId") ?? undefined;
  const actor = searchParams.get("actor") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  const where = {
    ...(action ? { action } : {}),
    ...(entityType ? { entityType } : {}),
    ...(entityId ? { entityId } : {}),
    ...(actor ? { actor } : {}),
    ...(from || to ? { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
  };

  const result = await withWorkspaceTransaction(workspaceId, async (tx) => {
    const [items, total] = await Promise.all([
      tx.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take: limit, skip: offset }),
      tx.auditLog.count({ where }),
    ]);
    return { items, total };
  });

  return NextResponse.json({ ...result, limit, offset });
}
