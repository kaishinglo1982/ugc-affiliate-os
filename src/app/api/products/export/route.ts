import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/client";
import { toCsv } from "@/lib/csv";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 });
  }

  const products = await prisma.product.findMany({
    include: { scores: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });

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
    p.category ?? "",
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
