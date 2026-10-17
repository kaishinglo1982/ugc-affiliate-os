import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { withWorkspaceTransaction } from "@/lib/db/workspace-transaction";
import { toCsv } from "@/lib/csv";

export async function GET() {
  const denied = await requireApiPermission(Permission.VIEW_PRODUCTS);
  if (denied) return denied.response;

  let workspaceId: string;
  try {
    workspaceId = await resolveWorkspaceId();
  } catch (error) {
    if (error instanceof InvalidTenantTokenError) {
      return NextResponse.json({ error: "Ungültiges Tenant-Token." }, { status: 401 });
    }
    throw error;
  }

  const products = await withWorkspaceTransaction(workspaceId, (tx) => tx.product.findMany({
    where: { workspaceId },
    include: { scores: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  }));

  const header = [
    "name",
    "category",
    "vendor",
    "status",
    "trend",
    "risk",
    "price",
    "commissionRate",
    "tags",
    "score",
  ];

  const rows = products.map((p) => [
    p.name,
    p.categoryLabel ?? "",
    p.vendor ?? "",
    p.status,
    p.trend,
    p.risk,
    p.price?.toString() ?? "",
    p.commissionRate?.toString() ?? "",
    p.tags.join("|"),
    String(p.scores[0]?.totalScore ?? ""),
  ]);

  const csv = toCsv([header, ...rows]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="produkte-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
