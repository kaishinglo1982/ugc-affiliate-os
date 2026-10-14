import "server-only";
import { withWorkspaceTransaction } from "@/lib/db/workspace-transaction";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
import { prisma } from "@/lib/db/client";
import { summarizeFinance } from "@/lib/finance/calculations";

export async function listRevenues() {
  const workspaceId = await resolveWorkspaceId();
  return withWorkspaceTransaction(workspaceId, (tx) => tx.revenue.findMany({
    include: {
      product: { select: { id: true, name: true } },
      campaign: { select: { id: true, name: true } },
      program: { select: { id: true, provider: true, customName: true } },
    },
    orderBy: { date: "desc" },
  }));
}

export async function listExpenses() {
  const workspaceId = await resolveWorkspaceId();
  return withWorkspaceTransaction(workspaceId, (tx) => tx.expense.findMany({
    include: {
      product: { select: { id: true, name: true } },
      campaign: { select: { id: true, name: true } },
    },
    orderBy: { date: "desc" },
  }));
}

/** Singleton settings row — created with sensible defaults on first read. */
export async function getOrCreateTaxSetting() {
  const workspaceId = await resolveWorkspaceId();
  const existing = await withWorkspaceTransaction(workspaceId, (tx) => tx.taxSetting.findFirst());
  if (existing) return existing;
  return withWorkspaceTransaction(workspaceId, (tx) => tx.taxSetting.create({
    data: {
      reserveRatePercent: 30,
      vatRatePercent: 19,
      vatEnabled: false,
      tradeTaxReservePercent: 15,
      incomeTaxReservePercent: 25,
    },
  }));
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function quarterKey(date: Date): string {
  return `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`;
}

export interface FinanceOverview {
  summary: { totalRevenue: number; totalExpense: number; contributionMargin: number };
  monthly: Array<{ period: string; revenue: number; expense: number; margin: number }>;
  quarterly: Array<{ period: string; revenue: number; expense: number; margin: number }>;
  byPlatform: Array<{ label: string; revenue: number; expense: number; margin: number }>;
  byProduct: Array<{ label: string; revenue: number; expense: number; margin: number }>;
  byCampaign: Array<{ label: string; revenue: number; expense: number; margin: number }>;
}

export async function getFinanceOverview(): Promise<FinanceOverview> {
  const workspaceId = await resolveWorkspaceId();
  const [revenues, expenses] = await withWorkspaceTransaction(workspaceId, (tx) => Promise.all([
    tx.revenue.findMany({
      include: { product: { select: { name: true } }, campaign: { select: { name: true } } },
    }),
    tx.expense.findMany({
      include: { product: { select: { name: true } }, campaign: { select: { name: true } } },
    }),
  ]));

  const summary = summarizeFinance(
    revenues.map((r) => r.grossAmount),
    expenses.map((e) => e.amount),
  );

  function bucket<T extends { revenue: number; expense: number }>(): Map<string, T> {
    return new Map<string, T>();
  }

  function accumulate(
    map: Map<string, { revenue: number; expense: number }>,
    key: string,
    field: "revenue" | "expense",
    amount: number,
  ) {
    const entry = map.get(key) ?? { revenue: 0, expense: 0 };
    entry[field] += amount;
    map.set(key, entry);
  }

  const monthlyMap = bucket<{ revenue: number; expense: number }>();
  const quarterlyMap = bucket<{ revenue: number; expense: number }>();
  const platformMap = bucket<{ revenue: number; expense: number }>();
  const productMap = bucket<{ revenue: number; expense: number }>();
  const campaignMap = bucket<{ revenue: number; expense: number }>();

  for (const r of revenues) {
    const amount = Number(r.grossAmount);
    accumulate(monthlyMap, monthKey(r.date), "revenue", amount);
    accumulate(quarterlyMap, quarterKey(r.date), "revenue", amount);
    accumulate(platformMap, r.platform ?? "Unbekannt", "revenue", amount);
    accumulate(productMap, r.product?.name ?? "Ohne Produkt", "revenue", amount);
    accumulate(campaignMap, r.campaign?.name ?? "Ohne Kampagne", "revenue", amount);
  }
  for (const e of expenses) {
    const amount = Number(e.amount);
    accumulate(monthlyMap, monthKey(e.date), "expense", amount);
    accumulate(quarterlyMap, quarterKey(e.date), "expense", amount);
    accumulate(productMap, e.product?.name ?? "Ohne Produkt", "expense", amount);
    accumulate(campaignMap, e.campaign?.name ?? "Ohne Kampagne", "expense", amount);
  }

  const toSortedSeries = (map: Map<string, { revenue: number; expense: number }>) =>
    Array.from(map.entries())
      .map(([period, v]) => ({ period, ...v, margin: v.revenue - v.expense }))
      .sort((a, b) => a.period.localeCompare(b.period));

  const toRankedList = (map: Map<string, { revenue: number; expense: number }>) =>
    Array.from(map.entries())
      .map(([label, v]) => ({ label, ...v, margin: v.revenue - v.expense }))
      .sort((a, b) => b.revenue - a.revenue);

  return {
    summary: {
      totalRevenue: summary.totalRevenue.toNumber(),
      totalExpense: summary.totalExpense.toNumber(),
      contributionMargin: summary.contributionMargin.toNumber(),
    },
    monthly: toSortedSeries(monthlyMap).slice(-12),
    quarterly: toSortedSeries(quarterlyMap).slice(-8),
    byPlatform: toRankedList(platformMap),
    byProduct: toRankedList(productMap),
    byCampaign: toRankedList(campaignMap),
  };
}
