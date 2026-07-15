import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { convertCandidate } from "@/server/services/campaign-candidates";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(1).max(200),
  idempotencyKey: z.string().min(1).optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireApiPermission(
    Permission.CONVERT_CAMPAIGN_CANDIDATES,
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
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: "Name ist erforderlich." },
      { status: 400 },
    );
  try {
    const result = await convertCandidate(id, parsed.data, workspaceId);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Konvertierung fehlgeschlagen.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
