import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { getCurrentUser } from "@/lib/auth/current-user";
import { completeExperiment } from "@/features/experimentation/service";

const bodySchema = z.object({ inconclusive: z.boolean().optional() });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireApiPermission(Permission.MANAGE_EXPERIMENTS);
  if (guard) return guard.response;
  const { id } = await context.params;
  const actor = (await getCurrentUser())?.id ?? "owner";
  const body = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  try {
    const experiment = await completeExperiment(id, actor, parsed.data.inconclusive ?? false);
    return NextResponse.json({ experiment });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Abschluss fehlgeschlagen." }, { status: 400 });
  }
}
