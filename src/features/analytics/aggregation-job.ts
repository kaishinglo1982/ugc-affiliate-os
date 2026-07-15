import "server-only";
import { prisma } from "@/lib/db/client";
import { Decimal } from "@/lib/shared/decimal";
import { DEFAULT_WORKSPACE_ID } from "@/lib/config/workspace";
import { getCurrentUser } from "@/lib/auth/current-user";
import { writeAuditLog } from "@/lib/audit/log";
import { safeRatio } from "@/lib/analytics/metrics";
import type { SocialPlatform } from "@/generated/prisma/client";

export class AggregationError extends Error {}

const AGGREGATION_WINDOW_DAYS = 90;

interface ContentAgg {
  contentAssetId: string;
  contentVariantId: string | null;
  platform: SocialPlatform | null;
  periodStart: Date;
  periodEnd: Date;
  impressions: number;
  views: number;
  engagements: number;
  linkClicks: number;
  conversions: number;
  grossRevenue: number;
  commissionRevenue: number;
  attributedCosts: number;
}

interface ProductAgg {
  productId: string;
  periodStart: Date;
  periodEnd: Date;
  impressions: number;
  views: number;
  affiliateClicks: number;
  conversions: number;
  grossRevenue: number;
  commissionRevenue: number;
  attributedCosts: number;
}

interface PostingAgg {
  socialAccountId: string;
  weekday: number;
  hourOfDay: number;
  timezone: string;
  impressions: number;
  views: number;
  linkClicks: number;
  conversions: number;
  commissionRevenue: number;
  postCount: number;
}

function dayBounds(d: Date): { start: Date; end: Date } {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Rolls raw AnalyticsEvents up into the three performance snapshot tables
 * (content / product / posting-time). Idempotent: re-running replaces the
 * affected daily buckets. Required so dashboards, experiment analysis, the
 * recommendation engine, and quality scans have data to operate on. Does not
 * mutate live configuration.
 */
export async function runAggregation(actor: string) {
  const workspaceId = DEFAULT_WORKSPACE_ID;
  const since = new Date(Date.now() - AGGREGATION_WINDOW_DAYS * 86_400_000);
  const events = await prisma.analyticsEvent.findMany({
    where: { workspaceId, occurredAt: { gte: since } },
    select: {
      contentAssetId: true,
      contentVariantId: true,
      platform: true,
      socialAccountId: true,
      productId: true,
      numericValue: true,
      eventType: true,
      occurredAt: true,
      sourceTimezone: true,
    },
  });

  const content = new Map<string, ContentAgg>();
  const product = new Map<string, ProductAgg>();
  const posting = new Map<string, PostingAgg>();

  for (const e of events) {
    const { start, end } = dayBounds(e.occurredAt);
    const dayKey = start.toISOString().slice(0, 10);
    const num = e.numericValue != null ? Number(e.numericValue.toString()) : 0;

    if (e.contentAssetId) {
      const key = `${e.contentAssetId}|${e.contentVariantId ?? ""}|${e.platform ?? ""}|${dayKey}`;
      const a = content.get(key) ?? {
        contentAssetId: e.contentAssetId,
        contentVariantId: e.contentVariantId,
        platform: e.platform,
        periodStart: start,
        periodEnd: end,
        impressions: 0,
        views: 0,
        engagements: 0,
        linkClicks: 0,
        conversions: 0,
        grossRevenue: 0,
        commissionRevenue: 0,
        attributedCosts: 0,
      };
      switch (e.eventType) {
        case "IMPRESSION": a.impressions += 1; break;
        case "VIEW": case "VIDEO_STARTED": a.views += 1; break;
        case "LIKE": case "COMMENT": case "SHARE": case "SAVE": case "PROFILE_VISIT": a.engagements += 1; break;
        case "LINK_CLICK": case "AFFILIATE_CLICK": a.linkClicks += 1; break;
        case "CONVERSION": a.conversions += 1; a.commissionRevenue += num; a.grossRevenue += num; break;
        case "REVENUE": a.grossRevenue += num; a.commissionRevenue += num; break;
        case "COST": a.attributedCosts += num; break;
        default: break;
      }
      content.set(key, a);
    }

    if (e.productId) {
      const key = `${e.productId}|${dayKey}`;
      const a = product.get(key) ?? {
        productId: e.productId,
        periodStart: start,
        periodEnd: end,
        impressions: 0,
        views: 0,
        affiliateClicks: 0,
        conversions: 0,
        grossRevenue: 0,
        commissionRevenue: 0,
        attributedCosts: 0,
      };
      if (e.eventType === "IMPRESSION") a.impressions += 1;
      if (e.eventType === "VIEW") a.views += 1;
      if (e.eventType === "AFFILIATE_CLICK" || e.eventType === "LINK_CLICK") a.affiliateClicks += 1;
      if (e.eventType === "CONVERSION") { a.conversions += 1; a.commissionRevenue += num; a.grossRevenue += num; }
      if (e.eventType === "REVENUE") { a.grossRevenue += num; a.commissionRevenue += num; }
      if (e.eventType === "COST") a.attributedCosts += num;
      product.set(key, a);
    }

    if (e.socialAccountId) {
      const tz = e.sourceTimezone ?? "UTC";
      const key = `${e.socialAccountId}|${e.occurredAt.getDay()}|${e.occurredAt.getHours()}|${tz}`;
      const a = posting.get(key) ?? {
        socialAccountId: e.socialAccountId,
        weekday: e.occurredAt.getDay(),
        hourOfDay: e.occurredAt.getHours(),
        timezone: tz,
        impressions: 0,
        views: 0,
        linkClicks: 0,
        conversions: 0,
        commissionRevenue: 0,
        postCount: 0,
      };
      a.postCount += 1;
      if (e.eventType === "IMPRESSION") a.impressions += 1;
      if (e.eventType === "VIEW") a.views += 1;
      if (e.eventType === "LINK_CLICK" || e.eventType === "AFFILIATE_CLICK") a.linkClicks += 1;
      if (e.eventType === "CONVERSION") { a.conversions += 1; a.commissionRevenue += num; }
      posting.set(key, a);
    }
  }

  let contentRows = 0;
  let productRows = 0;
  let postingRows = 0;

  for (const a of content.values()) {
    await prisma.contentPerformanceSnapshot.deleteMany({
      where: { workspaceId, contentAssetId: a.contentAssetId, contentVariantId: a.contentVariantId, platform: a.platform, periodStart: a.periodStart },
    });
    const impressions = BigInt(a.impressions);
    const views = BigInt(a.views);
    const linkClicks = BigInt(a.linkClicks);
    const conversions = BigInt(a.conversions);
    await prisma.contentPerformanceSnapshot.create({
      data: {
        workspaceId,
        contentAssetId: a.contentAssetId,
        contentVariantId: a.contentVariantId,
        platform: a.platform,
        periodStart: a.periodStart,
        periodEnd: a.periodEnd,
        impressions,
        views,
        engagements: BigInt(a.engagements),
        linkClicks,
        conversions,
        grossRevenue: new Decimal(a.grossRevenue),
        commissionRevenue: new Decimal(a.commissionRevenue),
        attributedCosts: new Decimal(a.attributedCosts),
        estimatedNetRevenue: new Decimal(a.commissionRevenue - a.attributedCosts),
        engagementRate: safeRatio(views, impressions),
        clickThroughRate: safeRatio(linkClicks, impressions),
        conversionRate: safeRatio(conversions, linkClicks),
        completionRate: null,
        revenuePerView: safeRatio(new Decimal(a.commissionRevenue), views),
        revenuePerClick: safeRatio(new Decimal(a.commissionRevenue), linkClicks),
        revenuePerPost: null,
        returnOnContentSpend: a.attributedCosts > 0 ? safeRatio(new Decimal(a.commissionRevenue - a.attributedCosts), new Decimal(a.attributedCosts)) : null,
        sampleSize: BigInt(a.impressions + a.views),
        formulaVersion: "1.0.0",
      },
    });
    contentRows += 1;
  }

  for (const a of product.values()) {
    await prisma.productPerformanceSnapshot.deleteMany({
      where: { workspaceId, productId: a.productId, periodStart: a.periodStart },
    });
    const impressions = BigInt(a.impressions);
    const views = BigInt(a.views);
    const affiliateClicks = BigInt(a.affiliateClicks);
    const conversions = BigInt(a.conversions);
    await prisma.productPerformanceSnapshot.create({
      data: {
        workspaceId,
        productId: a.productId,
        periodStart: a.periodStart,
        periodEnd: a.periodEnd,
        publishedPostCount: 0,
        impressions,
        views,
        affiliateClicks,
        conversions,
        grossRevenue: new Decimal(a.grossRevenue),
        commissionRevenue: new Decimal(a.commissionRevenue),
        attributedCosts: new Decimal(a.attributedCosts),
        estimatedNetRevenue: new Decimal(a.commissionRevenue - a.attributedCosts),
        clickThroughRate: safeRatio(affiliateClicks, impressions),
        conversionRate: safeRatio(conversions, affiliateClicks),
        returnOnContentSpend: a.attributedCosts > 0 ? safeRatio(new Decimal(a.commissionRevenue - a.attributedCosts), new Decimal(a.attributedCosts)) : null,
        refundRate: null,
        chargebackRate: null,
        dataQualityScore: new Decimal("1.000"),
        formulaVersion: "1.0.0",
      },
    });
    productRows += 1;
  }

  for (const a of posting.values()) {
    await prisma.postingTimePerformance.deleteMany({
      where: { workspaceId, socialAccountId: a.socialAccountId, weekday: a.weekday, hourOfDay: a.hourOfDay, timezone: a.timezone },
    });
    const impressions = BigInt(a.impressions);
    const views = BigInt(a.views);
    const linkClicks = BigInt(a.linkClicks);
    const conversions = BigInt(a.conversions);
    await prisma.postingTimePerformance.create({
      data: {
        workspaceId,
        socialAccountId: a.socialAccountId,
        platform: "INSTAGRAM" as SocialPlatform,
        weekday: a.weekday,
        hourOfDay: a.hourOfDay,
        timezone: a.timezone,
        postCount: a.postCount,
        impressions,
        views,
        linkClicks,
        conversions,
        commissionRevenue: new Decimal(a.commissionRevenue),
        engagementRate: safeRatio(views, impressions),
        clickThroughRate: safeRatio(linkClicks, impressions),
        conversionRate: safeRatio(conversions, linkClicks),
        sampleSize: BigInt(a.postCount),
      },
    });
    postingRows += 1;
  }

  await writeAuditLog({
    action: "analytics.aggregation.run",
    entityType: "ContentPerformanceSnapshot",
    entityId: "batch",
    actor,
    metadata: { contentRows, productRows, postingRows, events: events.length },
  });
  return { contentRows, productRows, postingRows, events: events.length };
}
