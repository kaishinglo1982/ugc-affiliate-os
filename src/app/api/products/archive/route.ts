import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api/guard";
import { getCurrentUser } from "@/lib/auth/current-user";
import { writeAuditLog } from "@/lib/audit/log";
import { archiveProduct } from "@/features/products/application/core";

const schema = z.object({
  productIds: z.array(z.string().min(1)),
});

export async function POST(request: Request) {
  const guard = await requireApiPermission("products.archive");
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
    for (const productId of parsed.data.productIds) {
      results.push(await archiveProduct(productId, actor));
    }
    await writeAuditLog({
      action: "product.archive",
      entityType: "Product",
      entityId: parsed.data.productIds[0],
      metadata: { count: parsed.data.productIds.length } as never,
      actor,
    });
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Archivierung fehlgeschlagen." },
      { status: 400 },
    );
  }
}
