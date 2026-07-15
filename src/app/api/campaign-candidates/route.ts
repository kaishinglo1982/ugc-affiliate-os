import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import {
  listCampaignCandidates,
  createCampaignCandidate,
} from "@/server/services/campaign-candidates";

export const dynamic = "force-dynamic";

export async function GET() {
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

  const candidates = await listCampaignCandidates(workspaceId);
  return NextResponse.json({ candidates });
}

const bodySchema = z.object({
  productOpportunityId: z.string().min(1),
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

export async function POST(request: Request) {
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

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });
  }

  try {
    const { candidate, idempotent } = await createCampaignCandidate(
      parsed.data,
      workspaceId,
    );
    return NextResponse.json(
      { candidate, idempotent },
      { status: idempotent ? 200 : 201 },
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erstellung fehlgeschlagen.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
