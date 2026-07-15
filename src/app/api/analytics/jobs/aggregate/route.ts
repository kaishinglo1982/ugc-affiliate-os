import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { getCurrentUser } from "@/lib/auth/current-user";
import { runAggregation } from "@/features/analytics/aggregation-job";

export async function POST() {
  const guard = await requireApiPermission(Permission.VIEW_ANALYTICS);
  if (guard) return guard.response;
  const actor = (await getCurrentUser())?.id ?? "owner";
  try {
    const result = await runAggregation(actor);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Aggregation fehlgeschlagen." }, { status: 400 });
  }
}
