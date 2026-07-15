import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { prisma } from "@/lib/db/client";
import { analyzeContent } from "@/features/content-intelligence/service";

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
    const profile = await analyzeContent(body, workspaceId);
    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Analyse fehlgeschlagen." }, { status: 400 });
  }
}

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
  const profiles = await prisma.contentIntelligenceProfile.findMany({
    where: { workspaceId: workspaceId, contentAssetId: assetId },
    orderBy: { analyzedAt: "desc" },
  });
  return NextResponse.json({ profiles });
}
