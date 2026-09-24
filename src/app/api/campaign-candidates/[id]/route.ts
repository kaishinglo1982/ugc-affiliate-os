import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { prisma } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/current-user";
import { writeAuditLog } from "@/lib/audit/log";
import { getCampaignCandidate } from "@/server/services/campaign-candidates";
import type { SocialPlatform } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireApiPermission(Permission.VIEW_CAMPAIGN_CANDIDATES);
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

  const { id } = await context.params;
  const candidate = await getCampaignCandidate(id, workspaceId);
  if (!candidate)
    return NextResponse.json(
      { error: "Kandidat nicht gefunden." },
      { status: 404 },
    );
  return NextResponse.json({ candidate });
}

const patchSchema = z.object({
  proposedObjective: z
    .enum([
      "traffic",
      "affiliate_clicks",
      "conversions",
      "revenue",
      "content_testing",
    ])
    .optional(),
  languageCode: z.string().min(2).max(8).optional(),
  targetPlatformCandidates: z.array(z.string()).optional(),
  targetCountryCodes: z.array(z.string()).optional(),
  currency: z.string().max(3).optional(),
  evidenceReferences: z.array(z.string()).optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireApiPermission(
    Permission.MANAGE_CAMPAIGN_CANDIDATES,
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

  const { id } = await context.params;
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });
  }
  const existing = await getCampaignCandidate(id, workspaceId);
  if (!existing)
    return NextResponse.json(
      { error: "Kandidat nicht gefunden." },
      { status: 404 },
    );
  if (!["new", "under_review"].includes(existing.status)) {
    return NextResponse.json(
      { error: "Kandidat ist nicht mehr editierbar." },
      { status: 409 },
    );
  }
  const { targetPlatformCandidates, ...rest } = parsed.data;
  const data = {
    ...rest,
    ...(targetPlatformCandidates
      ? {
          targetPlatformCandidates:
            targetPlatformCandidates as SocialPlatform[],
        }
      : {}),
  };
  const candidate = await prisma.campaignCandidate.update({
    where: { id: existing.id, workspaceId },
    data,
  });
  const actor = (await getCurrentUser())?.id ?? "owner";
  await writeAuditLog({
    action: "campaign_candidate.updated",
    entityType: "CampaignCandidate",
    entityId: id,
    actor,
  });
  return NextResponse.json({ candidate });
}
