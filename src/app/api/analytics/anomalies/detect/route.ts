import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { getCurrentUser } from "@/lib/auth/current-user";
import { runAnomalyDetection } from "@/features/analytics/anomaly-job";

export async function POST() {
  const guard = await requireApiPermission(Permission.MANAGE_ANALYTICS);
  if (guard) return guard.response;
  const actor = (await getCurrentUser())?.id ?? "owner";
  const workspaceId = process.env.DEFAULT_WORKSPACE_ID ?? "00000000-0000-0000-0000-000000000001";
  try {
    const result = await runAnomalyDetection(workspaceId, actor);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Anomalie-Erkennung fehlgeschlagen." }, { status: 400 });
  }
}
