import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api/guard";
import { getCurrentUser } from "@/lib/auth/current-user";
import { writeAuditLog } from "@/lib/audit/log";
import { approveOpportunity } from "@/features/products/application/core";

const schema = z.object({
  opportunityIds: z.array(z.string().min(1)),
});

export async function POST(request: Request) {
  const guard = await requireApiPermission("product_opportunities.approve");
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
    const results = [];
    for (const opportunityId of parsed.data.opportunityIds) {
      results.push(await approveOpportunity(opportunityId, actor));
    }
    await writeAuditLog({
      action: "product_opportunity.approve",
      entityType: "ProductOpportunity",
      entityId: parsed.data.opportunityIds[0],
      metadata: { count: parsed.data.opportunityIds.length } as never,
      actor,
    });
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Freigabe fehlgeschlagen." },
      { status: 400 },
    );
  }
}
