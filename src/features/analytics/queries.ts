import "server-only";
import { prisma } from "@/lib/db/client";
import { Decimal } from "@/lib/shared/decimal";
import { safeRatio } from "@/lib/analytics/metrics";

export interface DateRange {
  from?: string;
  to?: string;
}

function rangeFilter(range: DateRange) {
  const filter: { gte?: Date; lte?: Date } = {};
  if (range.from) filter.gte = new Date(range.from);
  if (range.to) filter.lte = new Date(range.to);
  return filter;
}

export interface OverviewKpis {
  impressions: string;
  views: string;
  engagements: string;
  linkClicks: string;
  conversions: string;
  grossRevenue: string;
  commissionRevenue: string;
  estimatedNetRevenue: string;
  engagementRate: string | null;
  clickThroughRate: string | null;
  conversionRate: string | null;
  revenuePerView: string | null;
  sampleSize: string;
}

export interface PlatformBreakdownItem {
  platform: string | null;
  impressions: string;
  views: string;
  linkClicks: string;
  conversions: string;
  commissionRevenue: string;
  sampleSize: string;
}

export interface AnalyticsOverview {
  kpis: OverviewKpis;
  byPlatform: PlatformBreakdownItem[];
  range: { from: string | null; to: string | null };
}

function big(sum: { toString(): string } | null | undefined): bigint {
  return BigInt(sum?.toString() ?? "0");
}
function dec(d: { toString(): string } | null | undefined): Decimal {
  return new Decimal(d?.toString() ?? "0");
}

export async function getAnalyticsOverview(workspaceId: string, range: DateRange): Promise<AnalyticsOverview> {
  const period = rangeFilter(range);
  const where = { workspaceId, periodStart: period };

  const agg = await prisma.contentPerformanceSnapshot.aggregate({
    where,
    _sum: {
      impressions: true,
      views: true,
      engagements: true,
      linkClicks: true,
      conversions: true,
      grossRevenue: true,
      commissionRevenue: true,
      estimatedNetRevenue: true,
      sampleSize: true,
    },
  });

  const s = (agg._sum ?? {}) as NonNullable<typeof agg._sum>;
  const impressions = big(s.impressions);
  const views = big(s.views);
  const linkClicks = big(s.linkClicks);
  const conversions = big(s.conversions);

  const kpis: OverviewKpis = {
    impressions: impressions.toString(),
    views: views.toString(),
    engagements: big(s.engagements).toString(),
    linkClicks: linkClicks.toString(),
    conversions: conversions.toString(),
    grossRevenue: dec(s.grossRevenue).toString(),
    commissionRevenue: dec(s.commissionRevenue).toString(),
    estimatedNetRevenue: dec(s.estimatedNetRevenue).toString(),
    engagementRate: safeRatio(views, impressions)?.toString() ?? null,
    clickThroughRate: safeRatio(linkClicks, impressions)?.toString() ?? null,
    conversionRate: safeRatio(conversions, linkClicks)?.toString() ?? null,
    revenuePerView: safeRatio(dec(s.commissionRevenue).toString(), views)?.toString() ?? null,
    sampleSize: big(s.sampleSize).toString(),
  };

  const byPlatform = await prisma.contentPerformanceSnapshot.groupBy({
    by: ["platform"],
    where,
    _sum: {
      impressions: true,
      views: true,
      linkClicks: true,
      conversions: true,
      commissionRevenue: true,
      sampleSize: true,
    },
  });

  const platformItems: PlatformBreakdownItem[] = byPlatform.map((p) => {
    const ps = (p._sum ?? {}) as NonNullable<typeof p._sum>;
    return {
      platform: p.platform,
      impressions: big(ps.impressions).toString(),
      views: big(ps.views).toString(),
      linkClicks: big(ps.linkClicks).toString(),
      conversions: big(ps.conversions).toString(),
      commissionRevenue: dec(ps.commissionRevenue).toString(),
      sampleSize: big(ps.sampleSize).toString(),
    };
  });

  return {
    kpis,
    byPlatform: platformItems,
    range: { from: range.from ?? null, to: range.to ?? null },
  };
}

export interface ContentPerformanceRow {
  contentAssetId: string;
  contentVariantId: string | null;
  platform: string | null;
  impressions: string;
  views: string;
  linkClicks: string;
  conversions: string;
  commissionRevenue: string;
  engagementRate: string | null;
  conversionRate: string | null;
  sampleSize: string;
}

export async function getContentPerformance(
  workspaceId: string,
  range: DateRange,
  limit = 20,
): Promise<ContentPerformanceRow[]> {
  const period = rangeFilter(range);
  const rows = await prisma.contentPerformanceSnapshot.findMany({
    where: { workspaceId, periodStart: period },
    orderBy: { commissionRevenue: "desc" },
    take: limit,
  });
  return rows.map((r) => ({
    contentAssetId: r.contentAssetId,
    contentVariantId: r.contentVariantId,
    platform: r.platform,
    impressions: big(r.impressions).toString(),
    views: big(r.views).toString(),
    linkClicks: big(r.linkClicks).toString(),
    conversions: big(r.conversions).toString(),
    commissionRevenue: dec(r.commissionRevenue).toString(),
    engagementRate: r.engagementRate?.toString() ?? safeRatio(big(r.views), big(r.impressions))?.toString() ?? null,
    conversionRate: r.conversionRate?.toString() ?? safeRatio(big(r.conversions), big(r.linkClicks))?.toString() ?? null,
    sampleSize: big(r.sampleSize).toString(),
  }));
}

export async function getProductPerformance(workspaceId: string, range: DateRange) {
  const period = rangeFilter(range);
  return prisma.productPerformanceSnapshot.findMany({
    where: { workspaceId, periodStart: period },
    orderBy: { commissionRevenue: "desc" },
    take: 20,
  });
}

export async function getPostingTimePerformance(workspaceId: string, socialAccountId?: string) {
  return prisma.postingTimePerformance.findMany({
    where: { workspaceId, ...(socialAccountId ? { socialAccountId } : {}) },
    orderBy: [{ weekday: "asc" }, { hourOfDay: "asc" }],
  });
}

export async function getDataQualityReports(workspaceId: string, limit = 20) {
  return prisma.dataQualityReport.findMany({
    where: { workspaceId },
    orderBy: { generatedAt: "desc" },
    take: limit,
  });
}

export async function getAnomalies(workspaceId: string, unresolvedOnly = false) {
  return prisma.analyticsAnomaly.findMany({
    where: { workspaceId, ...(unresolvedOnly ? { status: { not: "RESOLVED" } } : {}) },
    orderBy: { detectedAt: "desc" },
    take: 50,
  });
}
