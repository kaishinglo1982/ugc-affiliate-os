import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { decideCandidate } from "@/server/services/campaign-candidates";

export const dynamic = "force-dynamic";

const schema = z.object({ reason: z.string().max(2000).optional() });

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireApiPermission(
    Permission.APPROVE_CAMPAIGN_CANDIDATES,
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
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success)
    return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });
  try {
    const candidate = await decideCandidate(
      id,
      { decision: "rejected", reason: parsed.data.reason },
      workspaceId,
    );
    return NextResponse.json({ candidate });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Ablehnung fehlgeschlagen.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
