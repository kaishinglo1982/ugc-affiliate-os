import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { featureFlags } from "@/lib/config/feature-flags";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireApiPermission(Permission.VIEW_FEATURE_FLAGS);
  if (guard) return guard.response;
  return NextResponse.json({ flags: featureFlags });
}
