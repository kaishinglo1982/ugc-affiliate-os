import type { Metadata } from "next";
import { withWorkspaceDb } from "@/lib/db/workspace-context";
import { listRevenues, listExpenses, getFinanceOverview, getOrCreateTaxSetting } from "@/server/services/finance";
import { estimateTaxReserve } from "@/lib/finance/calculations";
import { FinancePageClient } from "@/components/finance/finance-page-client";
import type { RevenueRow } from "@/components/finance/revenues-table";
import type { ExpenseRow } from "@/components/finance/expenses-table";

export const metadata: Metadata = { title: "Finance" };

export default async function FinancePage() {
  const [revenues, expenses, overview, taxSetting, [programs, products, campaigns]] = await Promise.all([
    listRevenues(),
    listExpenses(),
    getFinanceOverview(),
    getOrCreateTaxSetting(),
    withWorkspaceDb((tx, workspaceId) =>
      Promise.all([
        tx.affiliateProgram.findMany({
          select: { id: true, provider: true, customName: true },
          orderBy: { provider: "asc" },
        }),
        tx.product.findMany({
          where: { workspaceId },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
        tx.campaign.findMany({
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
      ]),
    ),
  ]);

  const revenueRows: RevenueRow[] = revenues.map((revenue) => ({
    id: revenue.id,
    date: revenue.date.toISOString().slice(0, 10),
    programId: revenue.programId,
    productId: revenue.productId,
    campaignId: revenue.campaignId,
    platform: revenue.platform,
    grossAmount: revenue.grossAmount.toString(),
    status: revenue.status,
    reference: revenue.reference,
    notes: revenue.notes,
    productName: revenue.product?.name ?? null,
    campaignName: revenue.campaign?.name ?? null,
    programLabel: revenue.program ? (revenue.program.customName ?? revenue.program.provider) : null,
  }));

  const expenseRows: ExpenseRow[] = expenses.map((expense) => ({
    id: expense.id,
    date: expense.date.toISOString().slice(0, 10),
    category: expense.category,
    vendor: expense.vendor,
    campaignId: expense.campaignId,
    productId: expense.productId,
    amount: expense.amount.toString(),
    isRecurring: expense.isRecurring,
    isTaxRelevant: expense.isTaxRelevant,
    notes: expense.notes,
    productName: expense.product?.name ?? null,
    campaignName: expense.campaign?.name ?? null,
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
      programs={programs.map((program) => ({ id: program.id, label: program.customName ?? program.provider }))}
      products={products.map((product) => ({ id: product.id, label: product.name }))}
      campaigns={campaigns.map((campaign) => ({ id: campaign.id, label: campaign.name }))}
    />
  );
}
