import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api/guard";
import { getCurrentUser } from "@/lib/auth/current-user";
import { writeAuditLog } from "@/lib/audit/log";
import { evaluateComplianceForProduct } from "@/features/products/application/core";

const schema = z.object({
  productId: z.string().min(1),
});

export async function POST(request: Request) {
  const guard = await requireApiPermission("product_compliance.evaluate");
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
    const result = await evaluateComplianceForProduct(parsed.data.productId, actor);
    await writeAuditLog({
      action: "product_compliance.evaluate",
      entityType: "ProductComplianceProfile",
      entityId: parsed.data.productId,
      actor,
    });
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Bewertung fehlgeschlagen." },
      { status: 400 },
    );
  }
}
