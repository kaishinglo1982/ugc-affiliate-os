import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import {
  listStrategies,
  createStrategy,
} from "@/server/services/campaign-strategies";
import type { CampaignStrategyStatus } from "@/generated/prisma/client";

const VALID_STATUS: CampaignStrategyStatus[] = [
  "draft",
  "under_review",
  "approved",
  "rejected",
  "superseded",
  "archived",
];

export async function GET(req: Request) {
  const guard = await requireApiPermission(Permission.VIEW_CAMPAIGN_STRATEGIES);
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
  const campaignCandidateId =
    url.searchParams.get("campaignCandidateId") ?? undefined;
  const statusParam = url.searchParams.get("status");
  const status =
    statusParam && VALID_STATUS.includes(statusParam as CampaignStrategyStatus)
      ? (statusParam as CampaignStrategyStatus)
      : undefined;
  const strategies = await listStrategies(workspaceId, {
    campaignCandidateId,
    status,
  });
  return NextResponse.json({ strategies });
}

export async function POST(req: Request) {
  const guard = await requireApiPermission(
    Permission.MANAGE_CAMPAIGN_STRATEGIES,
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
    const strategy = await createStrategy(body, workspaceId);
    return NextResponse.json({ strategy }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
