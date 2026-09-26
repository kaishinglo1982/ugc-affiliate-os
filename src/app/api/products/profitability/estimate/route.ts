import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api/guard";
import { getCurrentUser } from "@/lib/auth/current-user";
import { writeAuditLog } from "@/lib/audit/log";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
import { estimateProfitabilityForOffer } from "@/features/products/application/core";

const schema = z.object({
  offerId: z.string().min(1),
});

export async function POST(request: Request) {
  const guard = await requireApiPermission("product_profitability.estimate");
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
  const workspaceId = await resolveWorkspaceId();

  try {
    const estimate = await estimateProfitabilityForOffer(parsed.data.offerId, actor, workspaceId);
    await writeAuditLog({
      action: "product_profitability.estimate",
      entityType: "ProductProfitabilityEstimate",
      metadata: { offerId: parsed.data.offerId } as never,
      actor,
    });
    return NextResponse.json({ estimate });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Schätzung fehlgeschlagen." },
      { status: 400 },
    );
  }
}
