import "server-only";
import { prisma } from "@/lib/db/client";
import type { DashboardPeriod } from "@/lib/dashboard-period";
import { getPeriodRange } from "@/lib/period-range";
import { platformLabel } from "@/lib/platforms";
import type { Prisma } from "@/generated/prisma/client";

export interface AnalyticsFilters {
  workspaceId: string;
  period: DashboardPeriod;
  platform?: string;
  productId?: string;
  campaignId?: string;
  programId?: string;
  contentStatus?: string;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function getAnalyticsData(filters: AnalyticsFilters) {
  const workspaceId = filters.workspaceId;
  const { from, to } = getPeriodRange(filters.period);
  const platformText = filters.platform ? platformLabel(filters.platform) : undefined;

  const campaign = filters.campaignId
    ? await prisma.campaign.findFirst({ where: { id: filters.campaignId, workspaceId }, select: { affiliateLinkId: true } })
    : null;
  // A campaign filter with no linked affiliate link should yield zero clicks, not "all clicks".
  const campaignHasNoLink = Boolean(filters.campaignId) && !campaign?.affiliateLinkId;

  const clickWhere: Prisma.LinkClickWhereInput = {
    occurredAt: { gte: from, lte: to },
    ...(campaignHasNoLink ? { linkId: "__none__" } : {}),
    link: {
      program: { workspaceId },
      ...(filters.productId ? { productId: filters.productId } : {}),
      ...(filters.programId ? { programId: filters.programId } : {}),
      ...(platformText ? { platform: platformText } : {}),
      ...(campaign?.affiliateLinkId ? { id: campaign.affiliateLinkId } : {}),
    },
  };

  const revenueWhere: Prisma.RevenueWhereInput = {
    workspaceId,
    date: { gte: from, lte: to },
    ...(filters.productId ? { productId: filters.productId } : {}),
    ...(filters.campaignId ? { campaignId: filters.campaignId } : {}),
    ...(filters.programId ? { programId: filters.programId } : {}),
    ...(platformText ? { platform: platformText } : {}),
  };

  const adSpendWhere: Prisma.ExpenseWhereInput = {
    workspaceId,
    date: { gte: from, lte: to },
    category: "ADVERTISING",
    ...(filters.productId ? { productId: filters.productId } : {}),
    ...(filters.campaignId ? { campaignId: filters.campaignId } : {}),
  };

  const postWhere: Prisma.SocialPostWhereInput = {
    publishedAt: { gte: from, lte: to },
    campaign: {
      workspaceId,
      ...(filters.productId ? { productId: filters.productId } : {}),
    },
    ...(filters.campaignId ? { campaignId: filters.campaignId } : {}),
    ...(filters.contentStatus ? { status: filters.contentStatus as never } : {}),
    ...(filters.platform ? { account: { platform: filters.platform as never } } : {}),
  };

  // Content-status breakdown should reflect the same scope minus the period lock on
  // unpublished posts (a DRAFT post has no publishedAt and would otherwise vanish).
  const statusBreakdownWhere: Prisma.SocialPostWhereInput = {
    campaign: {
      workspaceId,
      ...(filters.productId ? { productId: filters.productId } : {}),
    },
    ...(filters.campaignId ? { campaignId: filters.campaignId } : {}),
    ...(filters.platform ? { account: { platform: filters.platform as never } } : {}),
    ...(filters.productId ? { campaign: { productId: filters.productId } } : {}),
  };

  const [clicks, revenues, adSpendAgg, posts, statusCounts] = await Promise.all([
    prisma.linkClick.findMany({ where: clickWhere, select: { occurredAt: true, link: { select: { platform: true } } } }),
    prisma.revenue.findMany({ where: revenueWhere, select: { date: true, grossAmount: true, platform: true } }),
    prisma.expense.aggregate({ where: adSpendWhere, _sum: { amount: true } }),
    prisma.socialPost.findMany({
      where: postWhere,
      select: { publishedAt: true, impressions: true, reach: true, likes: true, comments: true, shares: true, account: { select: { platform: true } } },
    }),
    prisma.socialPost.groupBy({ by: ["status"], where: statusBreakdownWhere, _count: { _all: true } }),
  ]);

  const impressions = posts.reduce((sum, p) => sum + (p.impressions ?? 0), 0);
  const reach = posts.reduce((sum, p) => sum + (p.reach ?? 0), 0);
  const engagement = posts.reduce((sum, p) => sum + (p.likes ?? 0) + (p.comments ?? 0) + (p.shares ?? 0), 0);
  const clickCount = clicks.length;
  const conversionCount = revenues.length;
  const revenueTotal = revenues.reduce((sum, r) => sum + Number(r.grossAmount), 0);
  const adSpend = Number(adSpendAgg._sum.amount ?? 0);

  const kpis = {
    impressions,
    reach,
    clicks: clickCount,
    ctr: impressions > 0 ? (clickCount / impressions) * 100 : 0,
    conversions: conversionCount,
    conversionRate: clickCount > 0 ? (conversionCount / clickCount) * 100 : 0,
    revenue: revenueTotal,
    adSpend,
    roas: adSpend > 0 ? revenueTotal / adSpend : 0,
    engagementRate: impressions > 0 ? (engagement / impressions) * 100 : 0,
  };

  // Daily trend: clicks + conversions, so the chart reacts to every active filter.
  const trendMap = new Map<string, { clicks: number; conversions: number; revenue: number }>();
  for (const c of clicks) {
    const key = dayKey(c.occurredAt);
    const entry = trendMap.get(key) ?? { clicks: 0, conversions: 0, revenue: 0 };
    entry.clicks += 1;
    trendMap.set(key, entry);
  }
  for (const r of revenues) {
    const key = dayKey(r.date);
    const entry = trendMap.get(key) ?? { clicks: 0, conversions: 0, revenue: 0 };
    entry.conversions += 1;
    entry.revenue += Number(r.grossAmount);
    trendMap.set(key, entry);
  }
  const trend = Array.from(trendMap.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Per-platform funnel breakdown (impressions/clicks/conversions/CTR/ROAS side by side).
  const platformImpressions = new Map<string, number>();
  for (const p of posts) {
    const label = platformLabel(p.account.platform);
    platformImpressions.set(label, (platformImpressions.get(label) ?? 0) + (p.impressions ?? 0));
  }
  const platformClicks = new Map<string, number>();
  for (const c of clicks) {
    const label = c.link.platform ?? "Unbekannt";
    platformClicks.set(label, (platformClicks.get(label) ?? 0) + 1);
  }
  const platformRevenue = new Map<string, number>();
  for (const r of revenues) {
    const label = r.platform ?? "Unbekannt";
    platformRevenue.set(label, (platformRevenue.get(label) ?? 0) + Number(r.grossAmount));
  }
  const platforms = new Set([...platformImpressions.keys(), ...platformClicks.keys(), ...platformRevenue.keys()]);
  const platformBreakdown = Array.from(platforms)
    .map((label) => {
      const imp = platformImpressions.get(label) ?? 0;
      const clk = platformClicks.get(label) ?? 0;
      const rev = platformRevenue.get(label) ?? 0;
      return {
        platform: label,
        impressions: imp,
        clicks: clk,
        revenue: rev,
        ctr: imp > 0 ? (clk / imp) * 100 : 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  return {
    filters,
    range: { from, to },
    kpis,
    trend,
    platformBreakdown,
    contentStatusBreakdown: statusCounts.map((s) => ({ status: s.status, count: s._count._all })),
  };
}

export type AnalyticsData = Awaited<ReturnType<typeof getAnalyticsData>>;
