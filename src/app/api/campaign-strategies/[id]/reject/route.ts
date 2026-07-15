import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { decideStrategy } from "@/server/services/campaign-strategies";
import { z } from "zod";

const rejectSchema = z.object({ reason: z.string().max(2000).optional() });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireApiPermission(
    Permission.APPROVE_CAMPAIGN_STRATEGIES,
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

  const { id } = await params;
  const body = rejectSchema.parse(await req.json().catch(() => ({})));
  try {
    const strategy = await decideStrategy(
      id,
      { decision: "rejected", reason: body.reason },
      workspaceId,
    );
    return NextResponse.json({ strategy });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
