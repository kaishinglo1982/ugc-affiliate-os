import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { createVariant, listVariants } from "@/features/content-intelligence/service";

export async function GET(request: Request) {
  const guard = await requireApiPermission(Permission.VIEW_CONTENT_INTELLIGENCE);
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
  const assetId = searchParams.get("assetId");
  if (!assetId) return NextResponse.json({ error: "assetId erforderlich." }, { status: 400 });
  const variants = await listVariants(assetId, workspaceId);
  return NextResponse.json({ variants });
}

export async function POST(request: Request) {
  const guard = await requireApiPermission(Permission.MANAGE_CONTENT_INTELLIGENCE);
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
  try {
    const variant = await createVariant(body, workspaceId);
    return NextResponse.json({ variant }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Anlage fehlgeschlagen." }, { status: 400 });
  }
}
