import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { getCurrentUser } from "@/lib/auth/current-user";
import { reviewRecommendation, createVariantDraftFromRecommendation, createExperimentDraftFromRecommendation } from "@/features/recommendation/service";

const bodySchema = z.object({
  status: z.enum(["REVIEWED", "ACCEPTED", "REJECTED"]),
  note: z.string().max(2000).optional(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireApiPermission(Permission.MANAGE_RECOMMENDATIONS);
  if (guard) return guard.response;
  const { id } = await context.params;
  const actor = (await getCurrentUser())?.id ?? "owner";

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") ?? "review";
  const body = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  try {
    if (action === "review") {
      const rec = await reviewRecommendation(id, actor, parsed.data.status, parsed.data.note);
      return NextResponse.json({ recommendation: rec });
    }
    if (action === "variant-draft") {
      const variant = await createVariantDraftFromRecommendation(id, actor);
      return NextResponse.json({ variant });
    }
    if (action === "experiment-draft") {
      const experiment = await createExperimentDraftFromRecommendation(id, actor);
      return NextResponse.json({ experiment });
    }
    return NextResponse.json({ error: "Unbekannte Aktion." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Aktion fehlgeschlagen." }, { status: 400 });
  }
}
