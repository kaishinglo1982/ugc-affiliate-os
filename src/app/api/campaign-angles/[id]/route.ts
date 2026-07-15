import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { getAngle, updateAngle } from "@/server/services/campaign-angles";
import { updateAngleSchema } from "@/features/campaign-factory/domain/campaign-angle";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;
  const angle = await getAngle(id, workspaceId);
  if (!angle) {
    return NextResponse.json(
      { error: "Creative Angle nicht gefunden." },
      { status: 404 },
    );
  }
  return NextResponse.json({ angle });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = updateAngleSchema.parse(body);
  try {
    const angle = await updateAngle(id, parsed, workspaceId);
    return NextResponse.json({ angle });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
