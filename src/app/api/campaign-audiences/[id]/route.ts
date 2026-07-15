import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import {
  getAudience,
  updateAudience,
  deleteAudience,
} from "@/server/services/campaign-audiences";
import { updateAudienceSchema } from "@/features/campaign-factory/domain/campaign-audience";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;
  const audience = await getAudience(id, workspaceId);
  if (!audience) {
    return NextResponse.json(
      { error: "Zielgruppe nicht gefunden." },
      { status: 404 },
    );
  }
  return NextResponse.json({ audience });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = updateAudienceSchema.parse(body);
  try {
    const audience = await updateAudience(id, parsed, workspaceId);
    return NextResponse.json({ audience });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;
  try {
    await deleteAudience(id, workspaceId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
