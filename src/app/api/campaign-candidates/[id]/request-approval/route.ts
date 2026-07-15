import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { requestCandidateApproval } from "@/server/services/campaign-candidates";

export const dynamic = "force-dynamic";

const schema = z.object({ note: z.string().max(2000).optional() });

export async function POST(
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
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success)
    return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });
  try {
    const candidate = await requestCandidateApproval(
      id,
      parsed.data,
      workspaceId,
    );
    return NextResponse.json({ candidate });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Anfrage fehlgeschlagen.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
