import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { getCurrentUser } from "@/lib/auth/current-user";
import { generateRecommendations, listRecommendations } from "@/features/recommendation/service";
import type { RecommendationStatus } from "@/generated/prisma/client";

const recommendationStatuses = new Set<RecommendationStatus>([
  "GENERATED",
  "REVIEWED",
  "ACCEPTED",
  "REJECTED",
  "IMPLEMENTED",
  "EXPIRED",
]);

function parseRecommendationStatus(value: string | null): RecommendationStatus | undefined {
  if (!value) return undefined;
  return recommendationStatuses.has(value as RecommendationStatus) ? (value as RecommendationStatus) : undefined;
}

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

  const { searchParams } = new URL(request.url);
  const rawStatus = searchParams.get("status");
  const status = parseRecommendationStatus(rawStatus);
  if (rawStatus && !status) {
    return NextResponse.json({ error: "Ungültiger Recommendation-Status." }, { status: 400 });
  }

  const recommendations = await listRecommendations(workspaceId, status);
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

  const actor = (await getCurrentUser())?.id ?? "owner";
  const { searchParams } = new URL(request.url);
  if (searchParams.get("action") === "generate") {
    const result = await generateRecommendations(actor, workspaceId);
    return NextResponse.json(result);
  }
  return NextResponse.json({ error: "Unbekannte Aktion." }, { status: 400 });
}
