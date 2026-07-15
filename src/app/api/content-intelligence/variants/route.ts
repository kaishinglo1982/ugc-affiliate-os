import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { createVariant, listVariants } from "@/features/content-intelligence/service";

export async function GET(request: Request) {
  const guard = await requireApiPermission(Permission.VIEW_CONTENT_INTELLIGENCE);
  if (guard) return guard.response;
  const { searchParams } = new URL(request.url);
  const assetId = searchParams.get("assetId");
  if (!assetId) return NextResponse.json({ error: "assetId erforderlich." }, { status: 400 });
  const variants = await listVariants(assetId);
  return NextResponse.json({ variants });
}

export async function POST(request: Request) {
  const guard = await requireApiPermission(Permission.MANAGE_CONTENT_INTELLIGENCE);
  if (guard) return guard.response;
  const body = await request.json().catch(() => null);
  try {
    const variant = await createVariant(body);
    return NextResponse.json({ variant }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Anlage fehlgeschlagen." }, { status: 400 });
  }
}
