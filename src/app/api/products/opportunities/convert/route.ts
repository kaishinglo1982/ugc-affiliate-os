import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api/guard";
import { getCurrentUser } from "@/lib/auth/current-user";
import { writeAuditLog } from "@/lib/audit/log";
import { convertOpportunityToCampaign } from "@/features/products/application/core";

const schema = z.object({
  opportunityId: z.string().min(1),
});

export async function POST(request: Request) {
  const guard = await requireApiPermission("product_opportunities.convert");
  if (guard) return guard.response;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültige Eingabe.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const user = await getCurrentUser();
  const actor = user?.id ?? "owner";

  try {
    const campaignId = await convertOpportunityToCampaign(parsed.data.opportunityId, actor);
    await writeAuditLog({
      action: "product_opportunity.convert",
      entityType: "Campaign",
      entityId: campaignId,
      metadata: { opportunityId: parsed.data.opportunityId } as never,
      actor,
    });
    return NextResponse.json({ campaignId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Konvertierung fehlgeschlagen." },
      { status: 400 },
    );
  }
}
