import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { getCurrentUser } from "@/lib/auth/current-user";
import { writeAuditLog } from "@/lib/audit/log";
import { rejectMatch } from "@/features/products/application/core";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireApiPermission("product_matches.review");
  if (guard) return guard.response;

  const { id } = await context.params;
  const user = await getCurrentUser();
  const actor = user?.id ?? "owner";

  try {
    await rejectMatch(id, actor);
    await writeAuditLog({
      action: "product_match.reject",
      entityType: "ProductMatchCandidate",
      entityId: id,
      actor,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ablehnung fehlgeschlagen." },
      { status: 400 },
    );
  }
}
