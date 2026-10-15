import type { Metadata } from "next";
import { Eye, Users, MousePointerClick, Percent, TrendingUp, Coins, Target, Heart } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { listCampaigns } from "@/server/services/campaigns";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
import { getAnalyticsData } from "@/server/services/analytics";
import type { DashboardPeriod } from "@/lib/dashboard-period";
import { AnalyticsFilters } from "@/components/analytics/analytics-filters";
import { FunnelTrendChart } from "@/components/analytics/funnel-trend-chart";
import { PlatformBreakdownTable } from "@/components/analytics/platform-breakdown-table";
import { ConversionFunnel } from "@/components/charts/conversion-funnel";
import { BarList } from "@/components/charts/bar-list";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SOCIAL_POST_STATUS_LABELS } from "@/lib/status-labels";

export const metadata: Metadata = { title: "Analytics" };

const VALID_PERIODS: DashboardPeriod[] = ["7d", "30d", "90d", "month", "quarter", "all"];

interface AnalyticsPageProps {
  searchParams: Promise<{
    period?: string;
    platform?: string;
    productId?: string;
    campaignId?: string;
    programId?: string;
    contentStatus?: string;
  }>;
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const params = await searchParams;
  const workspaceId = await resolveWorkspaceId();
  const period: DashboardPeriod = VALID_PERIODS.includes(params.period as DashboardPeriod)
    ? (params.period as DashboardPeriod)
    : "30d";

  const [data, products, campaigns, programs] = await Promise.all([
    getAnalyticsData({
      period,
      platform: params.platform,
      productId: params.productId,
      campaignId: params.campaignId,
      programId: params.programId,
      contentStatus: params.contentStatus,
    }),
    prisma.product.findMany({
      where: { workspaceId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    listCampaigns(),
    prisma.affiliateProgram.findMany({ select: { id: true, provider: true, customName: true }, orderBy: { provider: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            Vollständiges Funnel- und Content-KPI-Set, reagiert auf alle Filter.
          </p>
        </div>
        <AnalyticsFilters
          period={period}
          products={products.map((p) => ({ id: p.id, label: p.name }))}
          campaigns={campaigns.map((c) => ({ id: c.id, label: c.name }))}
          programs={programs.map((p) => ({ id: p.id, label: p.customName ?? p.provider }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Impressions" value={data.kpis.impressions} icon={Eye} />
        <KpiCard label="Reichweite" value={data.kpis.reach} icon={Users} />
        <KpiCard label="Klicks" value={data.kpis.clicks} icon={MousePointerClick} />
        <KpiCard label="CTR" value={data.kpis.ctr} icon={Percent} variant="percent" />
        <KpiCard label="Conversions" value={data.kpis.conversions} icon={Target} />
        <KpiCard label="Conversion Rate" value={data.kpis.conversionRate} icon={Percent} variant="percent" />
        <KpiCard label="Umsatz" value={data.kpis.revenue} icon={TrendingUp} variant="currency" tone="positive" />
        <KpiCard label="Ad-Spend" value={data.kpis.adSpend} icon={Coins} variant="currency" tone="negative" />
        <KpiCard label="ROAS" value={data.kpis.roas} icon={Target} tone={data.kpis.roas >= 1 ? "positive" : "negative"} />
        <KpiCard label="Engagement Rate" value={data.kpis.engagementRate} icon={Heart} variant="percent" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Klicks &amp; Conversions im Zeitverlauf</CardTitle></CardHeader>
          <CardContent><FunnelTrendChart data={data.trend} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Conversion Funnel</CardTitle></CardHeader>
          <CardContent>
            <ConversionFunnel clicks={data.kpis.clicks} conversions={data.kpis.conversions} revenue={data.kpis.revenue} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Nach Plattform</CardTitle></CardHeader>
          <CardContent>
            <PlatformBreakdownTable rows={data.platformBreakdown} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Content-Status</CardTitle></CardHeader>
          <CardContent>
            <BarList
              items={data.contentStatusBreakdown.map((s) => ({
                label: SOCIAL_POST_STATUS_LABELS[s.status] ?? s.status,
                value: s.count,
              }))}
              emptyLabel="Keine Posts im gewählten Filter."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
