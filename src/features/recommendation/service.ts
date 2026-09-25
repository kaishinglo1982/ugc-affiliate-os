import "server-only";
import { prisma } from "@/lib/db/client";
import { Decimal } from "@/lib/shared/decimal";
import { getCurrentUser } from "@/lib/auth/current-user";
import { writeAuditLog } from "@/lib/audit/log";
import { runRecommendationRules, type RecommendationContext } from "@/lib/recommendation/rules";
import { safeRatio } from "@/lib/analytics/metrics";
import type { RecommendationStatus } from "@/generated/prisma/client";

export class RecommendationError extends Error {}

function big(v: { toString(): string } | null | undefined): bigint {
  return BigInt(v?.toString() ?? "0");
}

async function buildContext(workspaceId: string): Promise<RecommendationContext> {
  const content = await prisma.contentPerformanceSnapshot.findMany({
    where: { workspaceId },
    orderBy: { commissionRevenue: "desc" },
    take: 200,
  });
  const brandImpressions = content.reduce((s, c) => s + big(c.impressions), 0n);
  const brandClicks = content.reduce((s, c) => s + big(c.linkClicks), 0n);
  const brandConversions = content.reduce((s, c) => s + big(c.conversions), 0n);
  const brandMedianCtr = safeRatio(brandClicks, brandImpressions) ?? new Decimal("0");
  const brandMedianConversion = safeRatio(brandConversions, brandClicks) ?? new Decimal("0");

  const hooks = content.map((c) => ({
    hookType: c.contentAssetId,
    postCount: Number(c.sampleSize ?? 0n) || 1,
    impressions: big(c.impressions),
    ctr: safeRatio(big(c.linkClicks), big(c.impressions)),
    conversionRate: safeRatio(big(c.conversions), big(c.linkClicks)),
    brandMedianCtr,
    brandMedianConversion,
    attributionErrors: 0,
  }));

  const products = await prisma.productPerformanceSnapshot.findMany({ where: { workspaceId }, take: 200 });
  const productPerf = products.map((p) => ({
    productId: p.productId,
    views: big(p.views),
    ctr: safeRatio(big(p.affiliateClicks), big(p.views)),
    conversionRate: safeRatio(big(p.conversions), big(p.affiliateClicks)),
    netRevenue: new Decimal(p.estimatedNetRevenue.toString()),
    generationCost: new Decimal(p.attributedCosts.toString()),
    affiliateLinkActive: true,
    attributionCorrect: true,
  }));

  return { hooks, products: productPerf };
}

export async function generateRecommendations(actor: string, workspaceId: string) {
  const ctx = await buildContext(workspaceId);
  const drafts = runRecommendationRules(ctx);

  let created = 0;
  for (const d of drafts) {
    const existing = await prisma.optimizationRecommendation.findFirst({
      where: {
        workspaceId,
        recommendationType: d.recommendationType,
        scopeType: d.scopeType,
        scopeId: d.scopeId,
        status: { in: ["GENERATED", "REVIEWED", "ACCEPTED"] },
      },
    });
    if (existing) continue;
    await prisma.optimizationRecommendation.create({
      data: {
        workspaceId,
        recommendationType: d.recommendationType,
        scopeType: d.scopeType,
        scopeId: d.scopeId,
        title: d.title,
        explanation: d.explanation,
        confidenceScore: new Decimal(d.confidenceScore),
        expectedImpact: d.expectedImpact,
        evidenceReferences: d.evidenceReferences,
        minimumEvidenceCount: d.minimumEvidenceCount,
        sampleSize: d.sampleSize,
        ruleId: d.ruleId,
        requiresApproval: true,
      },
    });
    created += 1;
  }
  await writeAuditLog({ action: "recommendation.generated", entityType: "OptimizationRecommendation", entityId: "batch", actor, metadata: { created } });
  return { created };
}

export async function listRecommendations(workspaceId: string, status?: string) {
  return prisma.optimizationRecommendation.findMany({
    where: { workspaceId, ...(status ? { status: status as RecommendationStatus } : {}) },
    orderBy: { generatedAt: "desc" },
    take: 100,
  });
}

export async function reviewRecommendation(id: string, actor: string, status: "REVIEWED" | "ACCEPTED" | "REJECTED", workspaceId: string, note?: string) {
  const rec = await prisma.optimizationRecommendation.findFirst({ where: { id, workspaceId } });
  if (!rec) throw new RecommendationError("Empfehlung nicht gefunden.");
  const updated = await prisma.optimizationRecommendation.update({
    where: { id: rec.id, workspaceId },
    data: { status, reviewedAt: new Date(), reviewedBy: actor },
  });
  await writeAuditLog({ action: "recommendation.reviewed", entityType: "OptimizationRecommendation", entityId: id, actor, metadata: { status, note } });
  return updated;
}

export async function createVariantDraftFromRecommendation(id: string, actor: string, workspaceId: string) {
  const rec = await prisma.optimizationRecommendation.findFirst({ where: { id, workspaceId } });
  if (!rec) throw new RecommendationError("Empfehlung nicht gefunden.");
  const asset = await prisma.contentAsset.findFirst({ where: { workspaceId } });
  if (!asset) throw new RecommendationError("Kein Content-Asset für den Entwurf vorhanden.");

  const version = (await prisma.contentVariant.count({ where: { workspaceId, parentContentAssetId: asset.id } })) + 1;
  const variant = await prisma.contentVariant.create({
    data: {
      workspaceId,
      parentContentAssetId: asset.id,
      name: `Draft: ${rec.title}`.slice(0, 120),
      version,
      status: "DRAFT",
      approvalStatus: "DRAFT",
      generatedBy: "HUMAN",
    },
  });
  await writeAuditLog({ action: "content_variant.created", entityType: "ContentVariant", entityId: variant.id, actor, metadata: { source: "recommendation", recommendationId: id } });
  return variant;
}

export async function createExperimentDraftFromRecommendation(id: string, actor: string, workspaceId: string) {
  const rec = await prisma.optimizationRecommendation.findFirst({ where: { id, workspaceId } });
  if (!rec) throw new RecommendationError("Empfehlung nicht gefunden.");
  const brand = await prisma.brand.findFirst({ where: { workspaceId } });
  if (!brand) throw new RecommendationError("Keine Marke für das Experiment vorhanden.");

  const experiment = await prisma.contentExperiment.create({
    data: {
      workspaceId,
      brandId: brand.id,
      name: `Experiment: ${rec.title}`.slice(0, 200),
      description: rec.explanation,
      experimentType: "HOOK",
      status: "DRAFT",
      primaryMetric: "CONVERSION_RATE",
      secondaryMetrics: [],
      minimumSampleSize: 1000,
      minimumRuntimeHours: 72,
      maximumRuntimeHours: 720,
      confidenceThreshold: new Decimal("0.95"),
      practicalSignificanceThreshold: new Decimal("0.01"),
      trafficAllocationMode: "EQUAL",
      approvalStatus: "DRAFT",
      variants: {
        create: [
          { workspaceId, name: "Kontrolle", isControl: true, trafficWeight: 50, status: "DRAFT" },
          { workspaceId, name: "Variante B", isControl: false, trafficWeight: 50, status: "DRAFT" },
        ],
      },
    },
    include: { variants: true },
  });
  await writeAuditLog({ action: "experiment.created", entityType: "ContentExperiment", entityId: experiment.id, actor, metadata: { source: "recommendation", recommendationId: id } });
  return experiment;
}
