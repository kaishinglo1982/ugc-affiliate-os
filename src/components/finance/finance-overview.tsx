"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, PiggyBank } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { RevenueCostChart } from "@/components/charts/revenue-cost-chart";
import { BarList } from "@/components/charts/bar-list";
import { formatEuro } from "@/lib/finance/format";
import type { FinanceOverview as FinanceOverviewData } from "@/server/services/finance";

export function FinanceOverview({ data }: { data: FinanceOverviewData }) {
  const [period, setPeriod] = useState<"monthly" | "quarterly">("monthly");
  const series = period === "monthly" ? data.monthly : data.quarterly;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiCard label="Umsatz gesamt" value={data.summary.totalRevenue} icon={TrendingUp} variant="currency" tone="positive" />
        <KpiCard label="Kosten gesamt" value={data.summary.totalExpense} icon={TrendingDown} variant="currency" tone="negative" />
        <KpiCard
          label="Deckungsbeitrag"
          value={data.summary.contributionMargin}
          icon={PiggyBank}
          variant="currency"
          tone={data.summary.contributionMargin >= 0 ? "positive" : "negative"}
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Umsatz vs. Kosten</CardTitle>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as "monthly" | "quarterly")}>
            <TabsList>
              <TabsTrigger value="monthly">Monatlich</TabsTrigger>
              <TabsTrigger value="quarterly">Quartalsweise</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <RevenueCostChart data={series.map((s) => ({ date: s.period, revenue: s.revenue, expense: s.expense }))} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Nach Plattform</CardTitle></CardHeader>
          <CardContent>
            <BarList
              items={data.byPlatform.map((p) => ({ label: p.label, value: p.revenue, formattedValue: formatEuro(p.revenue) }))}
              emptyLabel="Noch keine Einnahmen mit Plattform."
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Nach Produkt (Marge)</CardTitle></CardHeader>
          <CardContent>
            <BarList
              items={data.byProduct.map((p) => ({ label: p.label, value: p.margin, formattedValue: formatEuro(p.margin) }))}
              color="#22c55e"
              emptyLabel="Noch keine Produktzuordnung."
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Nach Kampagne (Marge)</CardTitle></CardHeader>
          <CardContent>
            <BarList
              items={data.byCampaign.map((c) => ({ label: c.label, value: c.margin, formattedValue: formatEuro(c.margin) }))}
              color="#8b5cf6"
              emptyLabel="Noch keine Kampagnenzuordnung."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
