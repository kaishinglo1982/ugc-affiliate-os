import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import {
  listAudiences,
  createAudience,
} from "@/server/services/campaign-audiences";
import type { CampaignAudienceStatus } from "@/generated/prisma/client";

const VALID_STATUS: CampaignAudienceStatus[] = [
  "draft",
  "approved",
  "rejected",
  "archived",
];

export async function GET(req: Request) {
  const guard = await requireApiPermission(Permission.VIEW_CAMPAIGN_AUDIENCES);
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
  const brandId = url.searchParams.get("brandId") ?? undefined;
  const nicheId = url.searchParams.get("nicheId") ?? undefined;
  const statusParam = url.searchParams.get("status");
  const status =
    statusParam && VALID_STATUS.includes(statusParam as CampaignAudienceStatus)
      ? (statusParam as CampaignAudienceStatus)
      : undefined;
  const audiences = await listAudiences(workspaceId, {
    brandId,
    nicheId,
    status,
  });
  return NextResponse.json({ audiences });
}

export async function POST(req: Request) {
  const guard = await requireApiPermission(
    Permission.MANAGE_CAMPAIGN_AUDIENCES,
  );
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
    const audience = await createAudience(body, workspaceId);
    return NextResponse.json({ audience }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
