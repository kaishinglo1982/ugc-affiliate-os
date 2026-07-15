import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { assignExperimentJobs } from "@/features/experimentation/service";

const bodySchema = z.object({ jobIds: z.array(z.string().min(1)).min(1).max(500) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireApiPermission(Permission.MANAGE_EXPERIMENTS);
  if (guard) return guard.response;
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  try {
    const count = await assignExperimentJobs(id, parsed.data.jobIds);
    return NextResponse.json({ assigned: count });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Zuweisung fehlgeschlagen." }, { status: 400 });
  }
}
