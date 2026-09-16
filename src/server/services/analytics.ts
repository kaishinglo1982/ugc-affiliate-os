import "server-only";
import { withWorkspaceDb } from "@/lib/db/workspace-context";
import type { DashboardPeriod } from "@/lib/dashboard-period";
import { getPeriodRange } from "@/lib/period-range";
import { platformLabel } from "@/lib/platforms";
import type { Prisma } from "@/generated/prisma/client";

export interface AnalyticsFilters {
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
  const { from, to } = getPeriodRange(filters.period);
  const platformText = filters.platform ? platformLabel(filters.platform) : undefined;

  const { clicks, revenues, adSpendAgg, posts, statusCounts } = await withWorkspaceDb(async (tx) => {
    const campaign = filters.campaignId
      ? await tx.campaign.findUnique({
          where: { id: filters.campaignId },
          select: { affiliateLinkId: true },
        })
      : null;

    // A foreign/non-visible campaign fails closed just like a campaign without
    // an affiliate link: it must never widen the click query to the workspace.
    const campaignHasNoVisibleLink = Boolean(filters.campaignId) && !campaign?.affiliateLinkId;

    const clickWhere: Prisma.LinkClickWhereInput = {
      occurredAt: { gte: from, lte: to },
      ...(campaignHasNoVisibleLink ? { linkId: "__none__" } : {}),
      link: {
        ...(filters.productId ? { productId: filters.productId } : {}),
        ...(filters.programId ? { programId: filters.programId } : {}),
        ...(platformText ? { platform: platformText } : {}),
        ...(campaign?.affiliateLinkId ? { id: campaign.affiliateLinkId } : {}),
      },
    };

    const revenueWhere: Prisma.RevenueWhereInput = {
      date: { gte: from, lte: to },
      ...(filters.productId ? { productId: filters.productId } : {}),
      ...(filters.campaignId ? { campaignId: filters.campaignId } : {}),
      ...(filters.programId ? { programId: filters.programId } : {}),
      ...(platformText ? { platform: platformText } : {}),
    };

    const adSpendWhere: Prisma.ExpenseWhereInput = {
      date: { gte: from, lte: to },
      category: "ADVERTISING",
      ...(filters.productId ? { productId: filters.productId } : {}),
      ...(filters.campaignId ? { campaignId: filters.campaignId } : {}),
    };

    const postWhere: Prisma.SocialPostWhereInput = {
      publishedAt: { gte: from, lte: to },
      ...(filters.campaignId ? { campaignId: filters.campaignId } : {}),
      ...(filters.contentStatus ? { status: filters.contentStatus as never } : {}),
      ...(filters.platform ? { account: { platform: filters.platform as never } } : {}),
      ...(filters.productId ? { campaign: { productId: filters.productId } } : {}),
    };

    const statusBreakdownWhere: Prisma.SocialPostWhereInput = {
      ...(filters.campaignId ? { campaignId: filters.campaignId } : {}),
      ...(filters.platform ? { account: { platform: filters.platform as never } } : {}),
      ...(filters.productId ? { campaign: { productId: filters.productId } } : {}),
    };

    const [clickRows, revenueRows, spendAggregate, postRows, statusRows] = await Promise.all([
      tx.linkClick.findMany({
        where: clickWhere,
        select: { occurredAt: true, link: { select: { platform: true } } },
      }),
      tx.revenue.findMany({
        where: revenueWhere,
        select: { date: true, grossAmount: true, platform: true },
      }),
      tx.expense.aggregate({ where: adSpendWhere, _sum: { amount: true } }),
      tx.socialPost.findMany({
        where: postWhere,
        select: {
          publishedAt: true,
          impressions: true,
          reach: true,
          likes: true,
          comments: true,
          shares: true,
          account: { select: { platform: true } },
        },
      }),
      tx.socialPost.groupBy({
        by: ["status"],
        where: statusBreakdownWhere,
        _count: { _all: true },
      }),
    ]);

    return {
      clicks: clickRows,
      revenues: revenueRows,
      adSpendAgg: spendAggregate,
      posts: postRows,
      statusCounts: statusRows,
    };
  });

  const impressions = posts.reduce((sum, p) => sum + (p.impressions ?? 0), 0);
  const reach = posts.reduce((sum, p) => sum + (p.reach ?? 0), 0);
  const engagement = posts.reduce(
    (sum, p) => sum + (p.likes ?? 0) + (p.comments ?? 0) + (p.shares ?? 0),
    0,
  );
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
    .map(([date, value]) => ({ date, ...value }))
    .sort((a, b) => a.date.localeCompare(b.date));

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
  const platforms = new Set([
    ...platformImpressions.keys(),
    ...platformClicks.keys(),
    ...platformRevenue.keys(),
  ]);
  const platformBreakdown = Array.from(platforms)
    .map((label) => {
      const impressionsForPlatform = platformImpressions.get(label) ?? 0;
      const clicksForPlatform = platformClicks.get(label) ?? 0;
      const revenueForPlatform = platformRevenue.get(label) ?? 0;
      return {
        platform: label,
        impressions: impressionsForPlatform,
        clicks: clicksForPlatform,
        revenue: revenueForPlatform,
        ctr: impressionsForPlatform > 0 ? (clicksForPlatform / impressionsForPlatform) * 100 : 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  return {
    filters,
    range: { from, to },
    kpis,
    trend,
    platformBreakdown,
    contentStatusBreakdown: statusCounts.map((status) => ({
      status: status.status,
      count: status._count._all,
    })),
  };
}

export type AnalyticsData = Awaited<ReturnType<typeof getAnalyticsData>>;
