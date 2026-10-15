import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  Bot,
  Clapperboard,
  Coins,
  MousePointerClick,
  Percent,
  Send,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { getDashboardData, type DashboardPeriod } from "@/server/services/dashboard";
import { PeriodFilter } from "@/components/dashboard/period-filter";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { RevenueCostChart } from "@/components/charts/revenue-cost-chart";
import { ConversionFunnel } from "@/components/charts/conversion-funnel";
import { BarList } from "@/components/charts/bar-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatEuro } from "@/lib/finance/format";
import { chartSeries } from "@/lib/design-tokens";
import { formatAuditAction } from "@/lib/audit/format";
import {
  CAMPAIGN_STATUS_LABELS,
  SCRIPT_STATUS_LABELS,
  VIDEO_JOB_STATUS_LABELS,
  SOCIAL_POST_STATUS_LABELS,
  AGENT_STATUS_LABELS,
} from "@/lib/status-labels";
import { formatDistanceToNow } from "date-fns";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
import { de } from "date-fns/locale";

export const metadata: Metadata = { title: "Dashboard" };

interface DashboardPageProps {
  searchParams: Promise<{ period?: string }>;
}

const VALID_PERIODS: DashboardPeriod[] = ["7d", "30d", "90d", "month", "quarter", "all"];

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const period: DashboardPeriod = VALID_PERIODS.includes(params.period as DashboardPeriod)
    ? (params.period as DashboardPeriod)
    : "30d";

  const workspaceId = await resolveWorkspaceId();
  const data = await getDashboardData(period, workspaceId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">CEO-Dashboard</h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            Aggregierte Kennzahlen aus deiner Datenbank für den gewählten Zeitraum.
          </p>
        </div>
        <PeriodFilter value={period} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard label="Umsatz" value={data.kpis.monthlyRevenue} icon={TrendingUp} variant="currency" tone="positive" />
        <KpiCard label="Kosten" value={data.kpis.monthlyExpense} icon={TrendingDown} variant="currency" tone="negative" />
        <KpiCard label="Geschätzter Gewinn" value={data.kpis.estimatedProfit} icon={Wallet} variant="currency" />
        <KpiCard label="Provisionen" value={data.kpis.commission} icon={Coins} variant="currency" />
        <KpiCard label="Klicks" value={data.kpis.clicks} icon={MousePointerClick} />
        <KpiCard label="Conversions" value={data.kpis.conversions} icon={Percent} />
        <KpiCard label="Conversion Rate" value={data.kpis.conversionRate} icon={Percent} variant="percent" />
        <KpiCard label="Veröffentlichte Posts" value={data.kpis.publishedVideos} icon={Send} />
        <KpiCard label="Aktive Kampagnen" value={data.kpis.activeCampaigns} icon={Clapperboard} />
        <KpiCard label="Offene Video-Jobs" value={data.kpis.openVideoJobs} icon={Clapperboard} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Umsatz- und Kostenverlauf</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueCostChart data={data.history} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <ConversionFunnel {...data.funnel} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top-Produkte nach Umsatz</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList
              color={chartSeries[0]}
              items={data.topProducts.map((p) => ({
                label: p.name,
                value: p.revenue,
                formattedValue: formatEuro(p.revenue),
              }))}
              emptyLabel="Noch keine Umsätze im Zeitraum."
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plattformvergleich</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList
              color={chartSeries[1]}
              items={data.topPlatforms.map((p) => ({
                label: p.platform,
                value: p.revenue,
                formattedValue: formatEuro(p.revenue),
              }))}
              emptyLabel="Noch keine Plattformdaten im Zeitraum."
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kampagnenstatus</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList
              color={chartSeries[2]}
              items={data.campaignStatusCounts.map((c) => ({
                label: CAMPAIGN_STATUS_LABELS[c.status] ?? c.status,
                value: c.count,
              }))}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Content-Pipeline</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-3">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-foreground-subtle)]">
              Skripte
            </p>
            <BarList
              color={chartSeries[0]}
              items={data.contentPipeline.scripts.map((s) => ({
                label: SCRIPT_STATUS_LABELS[s.status] ?? s.status,
                value: s.count,
              }))}
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-foreground-subtle)]">
              Video-Jobs
            </p>
            <BarList
              color={chartSeries[1]}
              items={data.contentPipeline.videoJobs.map((v) => ({
                label: VIDEO_JOB_STATUS_LABELS[v.status] ?? v.status,
                value: v.count,
              }))}
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-foreground-subtle)]">
              Veröffentlichungen
            </p>
            <BarList
              color={chartSeries[3]}
              items={data.contentPipeline.socialPosts.map((s) => ({
                label: SOCIAL_POST_STATUS_LABELS[s.status] ?? s.status,
                value: s.count,
              }))}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Letzte Aktivitäten</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentActivity.length === 0 ? (
              <EmptyState title="Noch keine Aktivität" description="Aktionen im System erscheinen hier." />
            ) : (
              <ul className="space-y-3">
                {data.recentActivity.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-2 text-sm">
                    <span>{formatAuditAction(entry.action)}</span>
                    <span className="shrink-0 text-xs text-[var(--color-foreground-subtle)]">
                      {formatDistanceToNow(entry.createdAt, { addSuffix: true, locale: de })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Anstehende Veröffentlichungen</CardTitle>
          </CardHeader>
          <CardContent>
            {data.upcomingPosts.length === 0 ? (
              <EmptyState
                title="Keine geplanten Posts"
                description="Plane eine Veröffentlichung im Social-Publishing-Modul."
                action={
                  <Link href="/app/publishing" className="text-sm text-[var(--color-primary)] hover:underline">
                    Zu Publishing
                  </Link>
                }
              />
            ) : (
              <ul className="space-y-3">
                {data.upcomingPosts.map((post) => (
                  <li key={post.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{post.caption.slice(0, 48)}</span>
                    <span className="shrink-0 text-xs text-[var(--color-foreground-subtle)]">
                      {post.scheduledAt
                        ? formatDistanceToNow(post.scheduledAt, { addSuffix: true, locale: de })
                        : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-[var(--color-warning)]" /> Integrationsprobleme
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.integrationIssues.length === 0 ? (
              <p className="text-sm text-[var(--color-foreground-muted)]">
                Keine bekannten Integrationsprobleme.
              </p>
            ) : (
              <ul className="space-y-2">
                {data.integrationIssues.map((integration) => (
                  <li key={integration.id} className="flex items-center justify-between text-sm">
                    <span>{integration.displayName}</span>
                    <Badge variant="destructive">{integration.lastError}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="h-4 w-4 text-[var(--color-violet-soft)]" /> Agentenstatus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.agentStatusCounts).map(([status, count]) => (
                <Badge key={status} variant={status === "ERROR" ? "destructive" : "outline"}>
                  {AGENT_STATUS_LABELS[status] ?? status}: {count}
                </Badge>
              ))}
            </div>
            <Link
              href="/app/agents"
              className="mt-3 inline-block text-sm text-[var(--color-primary)] hover:underline"
            >
              Zur Agenten-Zentrale
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
