import "server-only";
import { prisma } from "@/lib/db/client";
import { summarizeFinance } from "@/lib/finance/calculations";
import type { DashboardPeriod } from "@/lib/dashboard-period";

export type { DashboardPeriod } from "@/lib/dashboard-period";

function getPeriodRange(period: DashboardPeriod): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();

  switch (period) {
    case "7d":
      from.setDate(from.getDate() - 7);
      break;
    case "30d":
      from.setDate(from.getDate() - 30);
      break;
    case "90d":
      from.setDate(from.getDate() - 90);
      break;
    case "month":
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
      break;
    case "quarter": {
      const quarterStartMonth = Math.floor(from.getMonth() / 3) * 3;
      from.setMonth(quarterStartMonth, 1);
      from.setHours(0, 0, 0, 0);
      break;
    }
    case "all":
      from.setFullYear(from.getFullYear() - 5);
      break;
  }

  return { from, to };
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function getDashboardData(period: DashboardPeriod) {
  const { from, to } = getPeriodRange(period);

  const [
    revenues,
    expenses,
    clickCount,
    conversionCount,
    publishedPosts,
    activeCampaigns,
    openVideoJobs,
    recentActivity,
    upcomingPosts,
    integrationIssues,
    agents,
    campaignStatusCounts,
    scripts,
    videoJobs,
    socialPosts,
  ] = await Promise.all([
    prisma.revenue.findMany({
      where: { date: { gte: from, lte: to } },
      include: { product: true },
      orderBy: { date: "asc" },
    }),
    prisma.expense.findMany({
      where: { date: { gte: from, lte: to } },
      orderBy: { date: "asc" },
    }),
    prisma.linkClick.count({ where: { occurredAt: { gte: from, lte: to } } }),
    prisma.revenue.count({ where: { date: { gte: from, lte: to } } }),
    prisma.socialPost.count({
      where: { status: "PUBLISHED", publishedAt: { gte: from, lte: to } },
    }),
    prisma.campaign.count({ where: { status: "ACTIVE" } }),
    prisma.videoJob.count({
      where: { status: { in: ["QUEUED", "PROCESSING", "REVIEW_REQUIRED"] } },
    }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.socialPost.findMany({
      where: { status: "SCHEDULED", scheduledAt: { gte: new Date() } },
      orderBy: { scheduledAt: "asc" },
      take: 5,
      include: { account: true, campaign: true },
    }),
    prisma.integration.findMany({ where: { lastError: { not: null } } }),
    prisma.agent.findMany({ orderBy: { name: "asc" } }),
    prisma.campaign.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.script.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.videoJob.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.socialPost.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const summary = summarizeFinance(
    revenues.map((r) => r.grossAmount),
    expenses.map((e) => e.amount),
  );

  const totalCommission = revenues.reduce((sum, r) => sum + Number(r.grossAmount), 0);
  const conversionRate = clickCount > 0 ? (conversionCount / clickCount) * 100 : 0;

  // Revenue/cost history bucketed by day
  const historyMap = new Map<string, { revenue: number; expense: number }>();
  for (const r of revenues) {
    const key = dayKey(r.date);
    const entry = historyMap.get(key) ?? { revenue: 0, expense: 0 };
    entry.revenue += Number(r.grossAmount);
    historyMap.set(key, entry);
  }
  for (const e of expenses) {
    const key = dayKey(e.date);
    const entry = historyMap.get(key) ?? { revenue: 0, expense: 0 };
    entry.expense += Number(e.amount);
    historyMap.set(key, entry);
  }
  const history = Array.from(historyMap.entries())
    .map(([date, values]) => ({ date, ...values }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Top products by revenue
  const productRevenue = new Map<string, { name: string; revenue: number }>();
  for (const r of revenues) {
    if (!r.productId || !r.product) continue;
    const entry = productRevenue.get(r.productId) ?? { name: r.product.name, revenue: 0 };
    entry.revenue += Number(r.grossAmount);
    productRevenue.set(r.productId, entry);
  }
  const topProducts = Array.from(productRevenue.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Top platforms by revenue
  const platformRevenue = new Map<string, number>();
  for (const r of revenues) {
    const platform = r.platform ?? "Unbekannt";
    platformRevenue.set(platform, (platformRevenue.get(platform) ?? 0) + Number(r.grossAmount));
  }
  const topPlatforms = Array.from(platformRevenue.entries())
    .map(([platform, revenue]) => ({ platform, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  const agentStatusCounts = agents.reduce<Record<string, number>>((acc, agent) => {
    acc[agent.status] = (acc[agent.status] ?? 0) + 1;
    return acc;
  }, {});

  return {
    period,
    range: { from, to },
    kpis: {
      monthlyRevenue: summary.totalRevenue.toNumber(),
      monthlyExpense: summary.totalExpense.toNumber(),
      estimatedProfit: summary.provisionalProfit.toNumber(),
      commission: totalCommission,
      clicks: clickCount,
      conversions: conversionCount,
      conversionRate,
      publishedVideos: publishedPosts,
      activeCampaigns,
      openVideoJobs,
    },
    history,
    topProducts,
    topPlatforms,
    recentActivity,
    upcomingPosts,
    integrationIssues,
    agents,
    agentStatusCounts,
    campaignStatusCounts: campaignStatusCounts.map((c) => ({
      status: c.status,
      count: c._count._all,
    })),
    contentPipeline: {
      scripts: scripts.map((s) => ({ status: s.status, count: s._count._all })),
      videoJobs: videoJobs.map((v) => ({ status: v.status, count: v._count._all })),
      socialPosts: socialPosts.map((s) => ({ status: s.status, count: s._count._all })),
    },
    funnel: {
      clicks: clickCount,
      conversions: conversionCount,
      revenue: totalCommission,
    },
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
