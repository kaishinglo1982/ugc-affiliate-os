import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api/guard";
import { Permission } from "@/lib/auth/rbac";
import { InvalidTenantTokenError, resolveWorkspaceId } from "@/lib/auth/tenant";
import { withWorkspaceTransaction } from "@/lib/db/workspace-transaction";
import { toCsv } from "@/lib/csv";

export async function GET(request: Request) {
  const denied = await requireApiPermission(Permission.EXPORT_FINANCE);
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

  const type = new URL(request.url).searchParams.get("type") === "expense" ? "expense" : "revenue";

  if (type === "expense") {
    const expenses = await withWorkspaceTransaction(workspaceId, (tx) => tx.expense.findMany({
      where: { workspaceId },
      include: { product: { select: { name: true } }, campaign: { select: { name: true } } },
      orderBy: { date: "desc" },
    }));
    const header = ["date", "category", "vendor", "product", "campaign", "amount", "isRecurring", "isTaxRelevant", "notes"];
    const rows = expenses.map((e) => [
      e.date.toISOString().slice(0, 10),
      e.category,
      e.vendor ?? "",
      e.product?.name ?? "",
      e.campaign?.name ?? "",
      e.amount.toString(),
      String(e.isRecurring),
      String(e.isTaxRelevant),
      e.notes ?? "",
    ]);
    return new NextResponse(toCsv([header, ...rows]), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ausgaben-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  const revenues = await withWorkspaceTransaction(workspaceId, (tx) => tx.revenue.findMany({
    where: { workspaceId },
    include: {
      product: { select: { name: true } },
      campaign: { select: { name: true } },
      program: { select: { provider: true, customName: true } },
    },
    orderBy: { date: "desc" },
  }));
  const header = ["date", "status", "platform", "product", "campaign", "program", "grossAmount", "reference", "notes"];
  const rows = revenues.map((r) => [
    r.date.toISOString().slice(0, 10),
    r.status,
    r.platform ?? "",
    r.product?.name ?? "",
    r.campaign?.name ?? "",
    r.program ? (r.program.customName ?? r.program.provider) : "",
    r.grossAmount.toString(),
    r.reference ?? "",
    r.notes ?? "",
  ]);
  return new NextResponse(toCsv([header, ...rows]), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="einnahmen-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
