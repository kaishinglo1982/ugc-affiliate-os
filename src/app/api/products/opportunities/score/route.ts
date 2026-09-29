import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api/guard";
import { getCurrentUser } from "@/lib/auth/current-user";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
import { writeAuditLog } from "@/lib/audit/log";
import { scoreProductOpportunities } from "@/features/products/application/core";

const schema = z.object({
  productId: z.string().optional(),
});

export async function POST(request: Request) {
  const guard = await requireApiPermission("product_opportunities.score");
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
    const count = await scoreProductOpportunities(parsed.data.productId ?? null, actor, workspaceId);
    await writeAuditLog({
      action: "product_opportunities.score",
      entityType: "ProductOpportunity",
      metadata: { count, productId: parsed.data.productId ?? null } as never,
      actor,
    });
    return NextResponse.json({ count });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Scoring fehlgeschlagen." },
      { status: 400 },
    );
  }
}
