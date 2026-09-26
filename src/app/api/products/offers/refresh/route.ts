import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { getCurrentUser } from "@/lib/auth/current-user";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
import { writeAuditLog } from "@/lib/audit/log";
import { refreshOffers } from "@/features/products/application/core";

export async function POST(_request: Request) {
  const guard = await requireApiPermission("product_offers.refresh");
  if (guard) return guard.response;

  const user = await getCurrentUser();
  const actor = user?.id ?? "owner";
  const workspaceId = await resolveWorkspaceId();

  try {
    const summary = await refreshOffers(actor, workspaceId);
    await writeAuditLog({
      action: "product_offer.refresh",
      entityType: "AffiliateOffer",
      metadata: summary as never,
      actor,
    });
    return NextResponse.json({ summary });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Aktualisierung fehlgeschlagen." },
      { status: 500 },
    );
  }
}
