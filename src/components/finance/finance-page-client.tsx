"use client";

import { Download } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FinanceOverview } from "@/components/finance/finance-overview";
import { RevenuesTable, type RevenueRow } from "@/components/finance/revenues-table";
import { ExpensesTable, type ExpenseRow } from "@/components/finance/expenses-table";
import { RevenueDialog } from "@/components/finance/revenue-dialog";
import { ExpenseDialog } from "@/components/finance/expense-dialog";
import { TaxReservePanel, type TaxReserveData, type TaxSettingInitial } from "@/components/finance/tax-reserve-panel";
import type { FinanceOverview as FinanceOverviewData } from "@/server/services/finance";

interface Option {
  id: string;
  label: string;
}

export function FinancePageClient({
  overview,
  revenues,
  expenses,
  reserve,
  taxSetting,
  programs,
  products,
  campaigns,
}: {
  overview: FinanceOverviewData;
  revenues: RevenueRow[];
  expenses: ExpenseRow[];
  reserve: TaxReserveData;
  taxSetting: TaxSettingInitial;
  programs: Option[];
  products: Option[];
  campaigns: Option[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Finance</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {revenues.length} Einnahme{revenues.length === 1 ? "" : "n"} · {expenses.length} Ausgabe{expenses.length === 1 ? "" : "n"}
        </p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="revenues">Einnahmen</TabsTrigger>
          <TabsTrigger value="expenses">Ausgaben</TabsTrigger>
          <TabsTrigger value="tax">Steuerrücklage</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <FinanceOverview data={overview} />
        </TabsContent>

        <TabsContent value="revenues" className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline" asChild>
              <a href="/api/finance/export?type=revenue"><Download className="h-4 w-4" /> CSV exportieren</a>
            </Button>
            <RevenueDialog programs={programs} products={products} campaigns={campaigns} />
          </div>
          <RevenuesTable revenues={revenues} programs={programs} products={products} campaigns={campaigns} />
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline" asChild>
              <a href="/api/finance/export?type=expense"><Download className="h-4 w-4" /> CSV exportieren</a>
            </Button>
            <ExpenseDialog products={products} campaigns={campaigns} />
          </div>
          <ExpensesTable expenses={expenses} products={products} campaigns={campaigns} />
        </TabsContent>

        <TabsContent value="tax">
          <TaxReservePanel reserve={reserve} setting={taxSetting} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
