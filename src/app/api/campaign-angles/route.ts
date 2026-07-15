import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { listAngles, createAngle } from "@/server/services/campaign-angles";
import type { CreativeAngleStatus } from "@/generated/prisma/client";

const VALID_STATUS: CreativeAngleStatus[] = [
  "draft",
  "approved",
  "rejected",
  "archived",
];

export async function GET(req: Request) {
  const guard = await requireApiPermission(Permission.VIEW_CREATIVE_ANGLES);
  if (guard) return guard.response;

  let workspaceId: string;
  try {
    workspaceId = await resolveWorkspaceId();
  } catch (e) {
    if (e instanceof InvalidTenantTokenError) {
      return NextResponse.json(
        { error: "Ungültiges Tenant-Token." },
        { status: 401 },
      );
    }
    throw e;
  }

  const url = new URL(req.url);
  const campaignStrategyId =
    url.searchParams.get("campaignStrategyId") ?? undefined;
  const statusParam = url.searchParams.get("status");
  const status =
    statusParam && VALID_STATUS.includes(statusParam as CreativeAngleStatus)
      ? (statusParam as CreativeAngleStatus)
      : undefined;
  const angles = await listAngles(workspaceId, { campaignStrategyId, status });
  return NextResponse.json({ angles });
}

export async function POST(req: Request) {
  const guard = await requireApiPermission(Permission.MANAGE_CREATIVE_ANGLES);
  if (guard) return guard.response;

  let workspaceId: string;
  try {
    workspaceId = await resolveWorkspaceId();
  } catch (e) {
    if (e instanceof InvalidTenantTokenError) {
      return NextResponse.json(
        { error: "Ungültiges Tenant-Token." },
        { status: 401 },
      );
    }
    throw e;
  }

  const body = await req.json().catch(() => ({}));
  try {
    const angle = await createAngle(body, workspaceId);
    return NextResponse.json({ angle }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
