import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { getCurrentUser } from "@/lib/auth/current-user";
import { runAnomalyDetection } from "@/features/analytics/anomaly-job";
import { resolveWorkspaceId } from "@/lib/auth/tenant";

export async function POST() {
  const guard = await requireApiPermission(Permission.MANAGE_ANALYTICS);
  if (guard) return guard.response;
  const actor = (await getCurrentUser())?.id ?? "owner";
  const workspaceId = await resolveWorkspaceId();
  try {
    const result = await runAnomalyDetection(workspaceId, actor);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Anomalie-Erkennung fehlgeschlagen." }, { status: 400 });
  }
}
