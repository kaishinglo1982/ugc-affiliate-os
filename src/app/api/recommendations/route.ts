import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/client";
import { generateRecommendations, listRecommendations } from "@/features/recommendation/service";

export async function GET(request: Request) {
  const guard = await requireApiPermission(Permission.VIEW_RECOMMENDATIONS);
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
  // ponytail: workspaceId resolved but not yet enforced — listRecommendations()
  // reads DEFAULT_WORKSPACE_ID internally (service-layer gap, tracked outside this sweep).
  void workspaceId;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;
  const recommendations = await listRecommendations(status);
  return NextResponse.json({ recommendations });
}

export async function POST(request: Request) {
  const guard = await requireApiPermission(Permission.MANAGE_RECOMMENDATIONS);
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
  // ponytail: workspaceId resolved but not yet enforced — generateRecommendations()
  // reads DEFAULT_WORKSPACE_ID internally (service-layer gap, tracked outside this sweep).
  void workspaceId;
  const actor = (await getCurrentUser())?.id ?? "owner";
  const { searchParams } = new URL(request.url);
  if (searchParams.get("action") === "generate") {
    const result = await generateRecommendations(actor);
    return NextResponse.json(result);
  }
  return NextResponse.json({ error: "Unbekannte Aktion." }, { status: 400 });
}
