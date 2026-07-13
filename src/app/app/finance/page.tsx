import type { Metadata } from "next";
import { prisma } from "@/lib/db/client";
import { listRevenues, listExpenses, getFinanceOverview, getOrCreateTaxSetting } from "@/server/services/finance";
import { estimateTaxReserve } from "@/lib/finance/calculations";
import { FinancePageClient } from "@/components/finance/finance-page-client";
import type { RevenueRow } from "@/components/finance/revenues-table";
import type { ExpenseRow } from "@/components/finance/expenses-table";

export const metadata: Metadata = { title: "Finance" };

export default async function FinancePage() {
  const [revenues, expenses, overview, taxSetting, programs, products, campaigns] = await Promise.all([
    listRevenues(),
    listExpenses(),
    getFinanceOverview(),
    getOrCreateTaxSetting(),
    prisma.affiliateProgram.findMany({ select: { id: true, provider: true, customName: true }, orderBy: { provider: "asc" } }),
    prisma.product.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.campaign.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const revenueRows: RevenueRow[] = revenues.map((r) => ({
    id: r.id,
    date: r.date.toISOString().slice(0, 10),
    programId: r.programId,
    productId: r.productId,
    campaignId: r.campaignId,
    platform: r.platform,
    grossAmount: r.grossAmount.toString(),
    status: r.status,
    reference: r.reference,
    notes: r.notes,
    productName: r.product?.name ?? null,
    campaignName: r.campaign?.name ?? null,
    programLabel: r.program ? (r.program.customName ?? r.program.provider) : null,
  }));

  const expenseRows: ExpenseRow[] = expenses.map((e) => ({
    id: e.id,
    date: e.date.toISOString().slice(0, 10),
    category: e.category,
    vendor: e.vendor,
    campaignId: e.campaignId,
    productId: e.productId,
    amount: e.amount.toString(),
    isRecurring: e.isRecurring,
    isTaxRelevant: e.isTaxRelevant,
    notes: e.notes,
    productName: e.product?.name ?? null,
    campaignName: e.campaign?.name ?? null,
  }));

  const reserve = estimateTaxReserve({
    provisionalProfit: overview.summary.contributionMargin,
    reserveRatePercent: taxSetting.reserveRatePercent,
    tradeTaxReservePercent: taxSetting.tradeTaxReservePercent,
    incomeTaxReservePercent: taxSetting.incomeTaxReservePercent,
  });

  return (
    <FinancePageClient
      overview={overview}
      revenues={revenueRows}
      expenses={expenseRows}
      reserve={{
        provisionalProfit: overview.summary.contributionMargin,
        generalReserve: reserve.generalReserve.toNumber(),
        tradeTaxReserve: reserve.tradeTaxReserve.toNumber(),
        incomeTaxReserve: reserve.incomeTaxReserve.toNumber(),
        totalReserve: reserve.totalReserve.toNumber(),
        netAfterReserve: reserve.netAfterReserve.toNumber(),
      }}
      taxSetting={{
        reserveRatePercent: taxSetting.reserveRatePercent.toString(),
        vatRatePercent: taxSetting.vatRatePercent.toString(),
        vatEnabled: taxSetting.vatEnabled,
        tradeTaxReservePercent: taxSetting.tradeTaxReservePercent.toString(),
        incomeTaxReservePercent: taxSetting.incomeTaxReservePercent.toString(),
      }}
      programs={programs.map((p) => ({ id: p.id, label: p.customName ?? p.provider }))}
      products={products.map((p) => ({ id: p.id, label: p.name }))}
      campaigns={campaigns.map((c) => ({ id: c.id, label: c.name }))}
    />
  );
}
