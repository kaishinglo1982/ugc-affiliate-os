import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { getCurrentUser } from "@/lib/auth/current-user";
import { writeAuditLog } from "@/lib/audit/log";
import { runDiscoveryForQuery } from "@/features/products/application/core";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireApiPermission("product_discovery.run");
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

  try {
    const summary = await runDiscoveryForQuery(id, actor, workspaceId);
    await writeAuditLog({
      action: "product_discovery.run",
      entityType: "ProductDiscoveryQuery",
      entityId: id,
      metadata: summary as never,
      actor,
    });
    return NextResponse.json({ summary });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Discovery fehlgeschlagen." },
      { status: 400 },
    );
  }
}
