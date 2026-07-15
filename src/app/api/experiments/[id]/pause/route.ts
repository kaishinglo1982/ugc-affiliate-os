import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { getCurrentUser } from "@/lib/auth/current-user";
import { pauseExperiment } from "@/features/experimentation/service";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireApiPermission(Permission.MANAGE_EXPERIMENTS);
  if (guard) return guard.response;
  const { id } = await context.params;
  const actor = (await getCurrentUser())?.id ?? "owner";
  try {
    const experiment = await pauseExperiment(id, actor);
    return NextResponse.json({ experiment });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Pause fehlgeschlagen." }, { status: 400 });
  }
}
