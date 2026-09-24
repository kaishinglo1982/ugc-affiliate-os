/**
 * Phase 7 — Product Intelligence application services (core).
 *
 * Orchestrates discovery, deduplication, compliance, content-fit, profitability,
 * opportunity scoring, import and refresh. Every DB write is scoped by
 * `workspaceId` (default `DEFAULT_WORKSPACE_ID`), wrapped in audit logging that
 * never throws, and emits metrics via the observability module.
 *
 * No `any` is used; all inputs are typed or narrowed with Zod/type guards.
 */
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/client";
import { Prisma } from "@/generated/prisma/client";
import { Decimal, type DecimalValue } from "@/lib/shared/decimal";
import { DEFAULT_WORKSPACE_ID } from "@/lib/config/workspace";
import { writeAuditLog } from "@/lib/audit/log";
import {
  METRICS,
  incrementMetric,
  logStructured,
  type StructuredLog,
} from "@/lib/observability/metrics";
import {
  getProductSourceProvider,
  ALL_PROVIDERS,
} from "@/lib/providers/affiliate/registry";
import { validateUrl, normalizeOffer, KNOWN_CURRENCIES } from "@/features/products/domain/normalization";
import { previewCsv, type ProductCsvRow } from "@/lib/providers/affiliate/csv-import";
import { resolveMatch } from "@/features/products/domain/deduplication";
import { evaluateCompliance, COMPLIANCE_VERSION } from "@/features/products/domain/compliance";
import { analyzeContentFit } from "@/features/products/domain/content-fit";
import { estimateProfitability, PROFITABILITY_VERSION } from "@/features/products/domain/profitability";
import {
  scoreOpportunity,
  type OpportunityInput,
} from "@/features/products/domain/opportunity-scoring";
import { evaluateDataQuality } from "@/features/products/domain/data-quality";
import {
  PRODUCT_STATUS_TO_PRISMA,
  RISK_LEVEL_TO_PRISMA,
  RISK_LEVEL_FROM_PRISMA,
  OFFER_STATUS_TO_PRISMA,
  OFFER_STATUS_FROM_PRISMA,
  AVAILABILITY_TO_PRISMA,
  AVAILABILITY_FROM_PRISMA,
  COMMISSION_TYPE_TO_PRISMA,
  COMMISSION_TYPE_FROM_PRISMA,
  DISCOVERY_RUN_STATUS_TO_PRISMA,
  MATCH_METHOD_TO_PRISMA,
  MATCH_STATUS_TO_PRISMA,
  COMPLIANCE_STATUS_TO_PRISMA,
  OPPORTUNITY_STATUS_TO_PRISMA,
  DQ_ISSUE_TO_PRISMA,
  APPROVAL_RESOURCE_TO_PRISMA,
  APPROVAL_STATUS_TO_PRISMA,
  SCORING_VERSION,
  type NormalizedOffer,
  type AffiliateNetwork,
  type ProductStatus,
  type DiscoveryQueryStatus,
  type RiskLevel,
  type MatchMethod,
} from "@/features/products/domain/types";

type Tx = Prisma.TransactionClient;

const PROVIDER_DEFAULT_PROGRAM_PREFIX = "prog-";

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function dec(value: DecimalValue | null | undefined): Decimal | null {
  if (value === null || value === undefined) return null;
  return new Decimal(value);
}

function newId(): string {
  return randomUUID();
}

async function ensureProgram(
  tx: Tx,
  provider: AffiliateNetwork,
  workspaceId: string,
): Promise<string> {
  const existing = await tx.affiliateProgram.findFirst({
    where: { workspaceId, provider },
    select: { id: true },
  });
  if (existing) return existing.id;

  const id = randomUUID();
  await tx.affiliateProgram.create({
    data: { id, workspaceId, provider, mode: "MOCK" },
  });
  return id;
}

function log(message: string, extra?: Omit<StructuredLog, "message">): void {
  logStructured({ message, ...extra });
}

function safeAudit(entry: {
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  actor: string;
}): void {
  void writeAuditLog({
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    metadata: entry.metadata,
    actor: entry.actor,
  });
}

// ---------------------------------------------------------------------------
// classifyOffers (PURE — no DB)
// ---------------------------------------------------------------------------

export interface ExistingProductLike {
  id: string;
  canonicalName: string;
  gtin: string | null;
  manufacturerPartNumber: string | null;
  externalIds: string[];
}

export interface ClassifyResult {
  toCreate: NormalizedOffer[];
  duplicates: string[];
  matched: { offer: NormalizedOffer; productId: string; method: string }[];
}

export function classifyOffers(
  offers: NormalizedOffer[],
  existingProducts: ExistingProductLike[],
): ClassifyResult {
  const toCreate: NormalizedOffer[] = [];
  const duplicates: string[] = [];
  const matched: ClassifyResult["matched"] = [];

  for (const offer of offers) {
    let best: { productId: string; method: string; confidence: number } | null = null;
    for (const product of existingProducts) {
      const result = resolveMatch(
        {
          externalProductId: product.externalIds[0] ?? null,
          gtin: product.gtin,
          manufacturerPartNumber: product.manufacturerPartNumber,
          normalizedName: product.canonicalName,
        },
        offer,
      );
      if (result && (!best || result.confidence > best.confidence)) {
        best = { productId: product.id, method: result.method, confidence: result.confidence };
      }
    }
    if (best) {
      matched.push({ offer, productId: best.productId, method: best.method });
      duplicates.push(best.productId);
    } else {
      toCreate.push(offer);
    }
  }

  return { toCreate, duplicates, matched };
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

interface DiscoveryCounters {
  newProductCount: number;
  updatedProductCount: number;
  duplicateCount: number;
  rejectedCount: number;
  discoveredOfferCount: number;
}

export async function runDiscoveryForQuery(
  queryId: string,
  actor: string,
  workspaceId: string = DEFAULT_WORKSPACE_ID,
): Promise<{
  runId: string;
  status: string;
  newProductCount: number;
  updatedProductCount: number;
  duplicateCount: number;
  rejectedCount: number;
  discoveredOfferCount: number;
}> {
  const correlationId = randomUUID();
  const query = await prisma.productDiscoveryQuery.findFirst({
    where: { id: queryId, workspaceId },
  });
  if (!query) throw new Error(`ProductDiscoveryQuery not found: ${queryId}`);

  const providerIds = (query.providerIds && query.providerIds.length > 0
    ? query.providerIds
    : ALL_PROVIDERS) as AffiliateNetwork[];

  const runId = newId();
  await prisma.productDiscoveryRun.create({
    data: {
      id: runId,
      workspaceId,
      queryId,
      status: "RUNNING",
      providerCount: providerIds.length,
      correlationId,
      idempotencyKey: `discovery:${queryId}:${correlationId}`,
      startedAt: new Date(),
    },
  });

  const counters: DiscoveryCounters = {
    newProductCount: 0,
    updatedProductCount: 0,
    duplicateCount: 0,
    rejectedCount: 0,
    discoveredOfferCount: 0,
  };

  // Load products once for classification (with their offer external ids).
  const products = await prisma.product.findMany({
    where: { workspaceId },
    include: { offers: { select: { externalProductId: true } } },
  });
  const existingProducts: ExistingProductLike[] = products.map((p) => ({
    id: p.id,
    canonicalName: p.canonicalName,
    gtin: null,
    manufacturerPartNumber: null,
    externalIds: p.offers.map((o) => o.externalProductId),
  }));

  let successfulProviders = 0;
  let failedProviders = 0;

  for (const provider of providerIds) {
    const providerRunId = newId();
    await prisma.productDiscoveryProviderRun.create({
      data: {
        id: providerRunId,
        workspaceId,
        discoveryRunId: runId,
        provider,
        status: "RUNNING",
        startedAt: new Date(),
      },
    });

    try {
      const programId = await ensureProgram(prisma, provider, workspaceId);
      const providerPort = getProductSourceProvider(provider);
      const request = {
        workspaceId,
        correlationId,
        keywords: query.keywords,
        excludedKeywords: query.excludedKeywords,
        categoryIds: query.categoryIds,
        targetCountryCodes: query.targetCountryCodes,
        languageCodes: query.languageCodes,
        minimumPrice: query.minimumPrice,
        maximumPrice: query.maximumPrice,
        currency: query.currency,
        minimumCommissionRate: query.minimumCommissionRate,
        minimumCommissionAmount: query.minimumCommissionAmount,
        minimumRating: query.minimumRating,
        minimumRatingCount: query.minimumRatingCount,
        requireInStock: query.requireInStock,
        providerId: provider,
        cursor: null,
        limit: 50,
      };
      const result = await providerPort.searchProducts(request);
      counters.discoveredOfferCount += result.offers.length;

      for (const rawOffer of result.offers) {
        let offer: NormalizedOffer;
        try {
          offer = normalizeOffer(rawOffer);
        } catch {
          counters.rejectedCount++;
          continue;
        }
        const urlCheck = validateUrl(offer.productUrl);
        if (!urlCheck.valid) {
          counters.rejectedCount++;
          continue;
        }

        const existingOffer = await prisma.affiliateOffer.findUnique({
          where: {
            workspaceId_provider_externalProductId_externalOfferId: {
              workspaceId,
              provider,
              externalProductId: offer.externalProductId,
              externalOfferId: offer.externalOfferId ?? "",
            },
          },
          select: { id: true, productId: true },
        });
        if (existingOffer) {
          counters.duplicateCount++;
          await prisma.affiliateOffer.update({
            where: { id: existingOffer.id, workspaceId },
            data: { lastCheckedAt: new Date() },
          });
          continue;
        }

        const classification = classifyOffers([offer], existingProducts);
        if (classification.matched.length > 0) {
          const productId = classification.matched[0].productId;
          await prisma.affiliateOffer.create({
            data: {
              workspaceId,
              productId,
              affiliateProgramId: programId,
              provider,
              externalProductId: offer.externalProductId,
              externalOfferId: offer.externalOfferId,
              title: offer.title,
              description: offer.description,
              productUrl: offer.productUrl,
              affiliateUrl: offer.affiliateUrl,
              priceAmount: offer.priceAmount,
              originalPriceAmount: offer.originalPriceAmount,
              currency: offer.currency,
              commissionType: COMMISSION_TYPE_TO_PRISMA[offer.commissionType],
              commissionRate: offer.commissionRate,
              commissionAmount: offer.commissionAmount,
              availability: AVAILABILITY_TO_PRISMA[offer.availability],
              sellerName: offer.sellerName,
              shippingCountryCodes: offer.shippingCountryCodes,
              averageRating: offer.averageRating,
              ratingCount: offer.ratingCount,
              status: "ACTIVE",
              sourceUpdatedAt: offer.sourceUpdatedAt,
              lastCheckedAt: new Date(),
              rawReferenceId: offer.rawReferenceId,
            },
          });
          await prisma.product.update({
            where: { id: productId },
            data: { lastVerifiedAt: new Date() },
          });
          counters.updatedProductCount++;
        } else {
          const category = query.categoryIds.length
            ? await prisma.productCategory.findFirst({
                where: { id: query.categoryIds[0], workspaceId },
              })
            : null;
          const risk: RiskLevel = category ? RISK_LEVEL_FROM_PRISMA[category.riskLevel] : "medium";
          const product = await prisma.product.create({
            data: {
              workspaceId,
              canonicalName: offer.title,
              description: offer.description,
              brandName: null,
              manufacturerName: null,
              status: "DISCOVERED",
              riskLevel: RISK_LEVEL_TO_PRISMA[risk],
              languageCode: query.languageCodes[0] ?? "de",
              targetCountryCodes: query.targetCountryCodes.length
                ? query.targetCountryCodes
                : ["DE"],
              lastVerifiedAt: new Date(),
            },
          });
          await prisma.affiliateOffer.create({
            data: {
              workspaceId,
              productId: product.id,
              affiliateProgramId: programId,
              provider,
              externalProductId: offer.externalProductId,
              externalOfferId: offer.externalOfferId,
              title: offer.title,
              description: offer.description,
              productUrl: offer.productUrl,
              affiliateUrl: offer.affiliateUrl,
              priceAmount: offer.priceAmount,
              originalPriceAmount: offer.originalPriceAmount,
              currency: offer.currency,
              commissionType: COMMISSION_TYPE_TO_PRISMA[offer.commissionType],
              commissionRate: offer.commissionRate,
              commissionAmount: offer.commissionAmount,
              availability: AVAILABILITY_TO_PRISMA[offer.availability],
              sellerName: offer.sellerName,
              shippingCountryCodes: offer.shippingCountryCodes,
              averageRating: offer.averageRating,
              ratingCount: offer.ratingCount,
              status: "ACTIVE",
              sourceUpdatedAt: offer.sourceUpdatedAt,
              lastCheckedAt: new Date(),
              rawReferenceId: offer.rawReferenceId,
            },
          });
          existingProducts.push({
            id: product.id,
            canonicalName: product.canonicalName,
            gtin: null,
            manufacturerPartNumber: null,
            externalIds: [offer.externalProductId],
          });
          counters.newProductCount++;
        }
      }

      await prisma.productDiscoveryProviderRun.update({
        where: { id: providerRunId, workspaceId },
        data: {
          status: "COMPLETED",
          discoveredOfferCount: result.offers.length,
          completedAt: new Date(),
        },
      });
      successfulProviders++;
    } catch (error) {
      failedProviders++;
      const reason = error instanceof Error ? error.message : "unknown_error";
      const rateLimited = /rate.?limit/i.test(reason);
      await prisma.productDiscoveryProviderRun.update({
        where: { id: providerRunId, workspaceId },
        data: {
          status: "FAILED",
          failureCode: rateLimited ? "RATE_LIMITED" : "UNKNOWN_ERROR",
          failureReason: reason.slice(0, 500),
          completedAt: new Date(),
        },
      });
      if (rateLimited) incrementMetric(METRICS.productProviderRateLimitedTotal);
      incrementMetric(METRICS.productProviderFailedTotal);
    }
  }

  const finalStatus: "COMPLETED" | "FAILED" | "PARTIALLY_COMPLETED" =
    failedProviders === 0
      ? "COMPLETED"
      : successfulProviders === 0
        ? "FAILED"
        : "PARTIALLY_COMPLETED";

  await prisma.productDiscoveryRun.update({
    where: { id: runId, workspaceId },
    data: {
      status: finalStatus,
      successfulProviderCount: successfulProviders,
      failedProviderCount: failedProviders,
      discoveredOfferCount: counters.discoveredOfferCount,
      newProductCount: counters.newProductCount,
      updatedProductCount: counters.updatedProductCount,
      duplicateCount: counters.duplicateCount,
      rejectedCount: counters.rejectedCount,
      completedAt: new Date(),
    },
  });

  incrementMetric(METRICS.productDiscoveryRunsTotal);
  if (finalStatus === "FAILED") incrementMetric(METRICS.productDiscoveryRunsFailedTotal);
  if (counters.duplicateCount > 0)
    incrementMetric(METRICS.productDuplicatesDetectedTotal, counters.duplicateCount);

  safeAudit({
    action: "product.discovery.run",
    entityType: "ProductDiscoveryRun",
    entityId: runId,
    metadata: { queryId, status: finalStatus, ...counters } as Prisma.InputJsonValue,
    actor,
  });

  return {
    runId,
    status: finalStatus,
    newProductCount: counters.newProductCount,
    updatedProductCount: counters.updatedProductCount,
    duplicateCount: counters.duplicateCount,
    rejectedCount: counters.rejectedCount,
    discoveredOfferCount: counters.discoveredOfferCount,
  };
}

// ---------------------------------------------------------------------------
// Match candidates
// ---------------------------------------------------------------------------

export async function recomputeMatchesForPendingOffers(
  actor: string,
  workspaceId: string = DEFAULT_WORKSPACE_ID,
): Promise<number> {
  const offers = await prisma.affiliateOffer.findMany({
    where: { workspaceId },
    select: {
      id: true,
      externalProductId: true,
      title: true,
      productId: true,
    },
  });
  const products = await prisma.product.findMany({
    where: { workspaceId },
    include: { offers: { select: { externalProductId: true } } },
  });

  const existing = products.map((p) => ({
    id: p.id,
    canonicalName: p.canonicalName,
    gtin: null as string | null,
    manufacturerPartNumber: null as string | null,
    externalIds: p.offers.map((o) => o.externalProductId),
  }));

  let created = 0;
  await prisma.$transaction(async (tx: Tx) => {
    for (const offer of offers) {
      // Skip if a product already exists for the same external id.
      const alreadyMatched = existing.some(
        (p) => p.externalIds.includes(offer.externalProductId) && p.id === offer.productId,
      );
      if (alreadyMatched) continue;

      const candidate = classifyFirstMatch(
        {
          externalProductId: offer.externalProductId,
          externalOfferId: null,
          title: offer.title,
          description: null,
          productUrl: "",
          affiliateUrl: null,
          priceAmount: null,
          originalPriceAmount: null,
          currency: null,
          commissionType: "unknown",
          commissionRate: null,
          commissionAmount: null,
          availability: "unknown",
          sellerName: null,
          shippingCountryCodes: [],
          averageRating: null,
          ratingCount: null,
          sourceUpdatedAt: null,
          gtin: null,
          manufacturerPartNumber: null,
          rawReferenceId: null,
        },
        existing,
      );
      if (!candidate) continue;
      if (candidate.productId === offer.productId) continue;

      const dup = await tx.productMatchCandidate.findFirst({
        where: { workspaceId, sourceOfferId: offer.id, candidateProductId: candidate.productId },
        select: { id: true },
      });
      if (dup) continue;

      await tx.productMatchCandidate.create({
        data: {
          workspaceId,
          sourceOfferId: offer.id,
          candidateProductId: candidate.productId,
          matchMethod: MATCH_METHOD_TO_PRISMA[candidate.method],
          confidenceScore: new Decimal(candidate.confidence),
          evidence: [candidate.method],
          status: "PENDING",
        },
      });
      created++;
    }
  });

  log("recomputed match candidates", { correlationId: randomUUID(), actor, count: created });
  return created;
}

function classifyFirstMatch(offer: NormalizedOffer, existing: ExistingProductLike[]) {
  let best: { productId: string; method: MatchMethod; confidence: number } | null = null;
  for (const product of existing) {
    const result = resolveMatch(
      {
        externalProductId: product.externalIds[0] ?? null,
        gtin: product.gtin,
        manufacturerPartNumber: product.manufacturerPartNumber,
        normalizedName: product.canonicalName,
      },
      offer,
    );
    if (result && (!best || result.confidence > best.confidence)) {
      best = { productId: product.id, method: result.method, confidence: result.confidence };
    }
  }
  return best;
}

export async function confirmMatch(
  candidateId: string,
  actor: string,
  workspaceId: string = DEFAULT_WORKSPACE_ID,
): Promise<void> {
  const candidate = await prisma.productMatchCandidate.findFirst({ where: { id: candidateId, workspaceId } });
  if (!candidate) throw new Error("ProductMatchCandidate not found");
  await prisma.productMatchCandidate.update({
    where: { id: candidate.id },
    data: {
      status: "CONFIRMED",
      decidedAt: new Date(),
      decidedBy: actor,
    },
  });
  incrementMetric(METRICS.productMatchesConfirmedTotal);
  safeAudit({
    action: "product.match.confirm",
    entityType: "ProductMatchCandidate",
    entityId: candidateId,
    actor,
  });
}

export async function rejectMatch(
  candidateId: string,
  actor: string,
  workspaceId: string = DEFAULT_WORKSPACE_ID,
): Promise<void> {
  const candidate = await prisma.productMatchCandidate.findFirst({ where: { id: candidateId, workspaceId } });
  if (!candidate) throw new Error("ProductMatchCandidate not found");
  await prisma.productMatchCandidate.update({
    where: { id: candidate.id },
    data: {
      status: "REJECTED",
      decidedAt: new Date(),
      decidedBy: actor,
    },
  });
  incrementMetric(METRICS.productMatchesRejectedTotal);
  safeAudit({
    action: "product.match.reject",
    entityType: "ProductMatchCandidate",
    entityId: candidateId,
    actor,
  });
}

// ---------------------------------------------------------------------------
// Compliance
// ---------------------------------------------------------------------------

export async function evaluateComplianceForProduct(
  productId: string,
  actor: string,
  workspaceId: string = DEFAULT_WORKSPACE_ID,
): Promise<unknown> {
  const product = await prisma.product.findFirst({
    where: { id: productId, workspaceId },
    include: { category: true, offers: { include: { affiliateProgram: true } } },
  });
  if (!product) throw new Error(`Product not found: ${productId}`);

  const category = product.category;
  const categoryRisk: RiskLevel = category ? RISK_LEVEL_FROM_PRISMA[category.riskLevel] : "medium";
  const categoryAllowed = category ? category.affiliatePromotionAllowed : true;
  const nicheAllowed = true;
  const targetMarketAllowed =
    product.targetCountryCodes.length > 0 ||
    (category ? category.affiliatePromotionAllowed : true);

  const firstProgram = product.offers[0]?.affiliateProgram;
  const affiliateProgramAllowsPromotion: boolean | null = firstProgram
    ? firstProgram.mode === "LIVE" && firstProgram.status === "ACTIVE"
    : null;

  const result = evaluateCompliance({
    categoryRiskLevel: categoryRisk,
    categoryAllowed,
    nicheAllowed,
    targetMarketAllowed,
    affiliateProgramAllowsPromotion,
    title: product.canonicalName,
    description: product.description,
    brandName: product.brandName,
  });

  await prisma.$transaction(async (tx: Tx) => {
    await tx.productComplianceProfile.deleteMany({ where: { productId, workspaceId } });
    await tx.productComplianceProfile.create({
      data: {
        workspaceId,
        productId,
        categoryAllowed: result.categoryAllowed,
        nicheAllowed: result.nicheAllowed,
        targetMarketAllowed: result.targetMarketAllowed,
        affiliateProgramAllowsPromotion: result.affiliateProgramAllowsPromotion,
        ageRestrictionDetected: result.ageRestrictionDetected,
        healthClaimRiskDetected: result.healthClaimRiskDetected,
        financialClaimRiskDetected: result.financialClaimRiskDetected,
        regulatedProductRiskDetected: result.regulatedProductRiskDetected,
        trademarkRiskDetected: result.trademarkRiskDetected,
        misleadingClaimRiskDetected: result.misleadingClaimRiskDetected,
        disclosureRequired: result.disclosureRequired,
        manualReviewRequired: result.manualReviewRequired,
        riskLevel: RISK_LEVEL_TO_PRISMA[result.riskLevel],
        status: COMPLIANCE_STATUS_TO_PRISMA[result.status],
        reasons: result.reasons,
        evidenceReferences: result.evidenceReferences,
        evaluationVersion: COMPLIANCE_VERSION,
      },
    });
  });

  if (result.status === "failed") incrementMetric(METRICS.productComplianceFailedTotal);
  if (result.status === "manual_review") incrementMetric(METRICS.productManualReviewTotal);

  safeAudit({
    action: "product.compliance.evaluate",
    entityType: "ProductComplianceProfile",
    entityId: productId,
    metadata: { status: result.status } as Prisma.InputJsonValue,
    actor,
  });

  return { productId, status: result.status, riskLevel: result.riskLevel };
}

export async function overrideCompliance(
  profileId: string,
  actor: string,
  decision: "approve" | "reject",
  reason?: string,
  workspaceId: string = DEFAULT_WORKSPACE_ID,
): Promise<unknown> {
  const newStatus = decision === "approve" ? "PASSED" : "FAILED";
  const profile = await prisma.productComplianceProfile.findFirst({ where: { id: profileId, workspaceId } });
  if (!profile) throw new Error("ProductComplianceProfile not found");
  const updatedProfile = await prisma.productComplianceProfile.update({
    where: { id: profile.id },
    data: { status: COMPLIANCE_STATUS_TO_PRISMA[newStatus === "PASSED" ? "passed" : "failed"] },
  });

  await prisma.approval.create({
    data: {
      workspaceId,
      resourceType: "product",
      resourceId: profile.productId,
      status: "APPROVED",
      decidedBy: actor,
      decisionReason: reason ?? null,
      decidedAt: new Date(),
    },
  });

  safeAudit({
    action: "product.compliance.override",
    entityType: "ProductComplianceProfile",
    entityId: profileId,
    metadata: { decision, reason } as Prisma.InputJsonValue,
    actor,
  });

  return profile;
}

// ---------------------------------------------------------------------------
// Content fit
// ---------------------------------------------------------------------------

export async function analyzeContentFitForProduct(
  productId: string,
  actor: string,
  workspaceId: string = DEFAULT_WORKSPACE_ID,
): Promise<unknown> {
  const product = await prisma.product.findFirst({
    where: { id: productId, workspaceId },
    include: { category: true },
  });
  if (!product) throw new Error(`Product not found: ${productId}`);

  const category = product.category;
  const result = analyzeContentFit({
    categoryId: product.categoryId,
    categoryAllowed: category ? category.affiliatePromotionAllowed : true,
    contentGenerationAllowed: category ? category.contentGenerationAllowed : true,
    confidenceScore: 0.6,
    evidence: ["heuristic"],
  });

  await prisma.$transaction(async (tx: Tx) => {
    await tx.productContentFitProfile.deleteMany({ where: { productId, workspaceId } });
    await tx.productContentFitProfile.create({
      data: {
        workspaceId,
        productId,
        demonstrabilityScore: result.demonstrabilityScore,
        visualAppealScore: result.visualAppealScore,
        problemSolutionFitScore: result.problemSolutionFitScore,
        testimonialFitScore: result.testimonialFitScore,
        tutorialFitScore: result.tutorialFitScore,
        shortVideoFitScore: result.shortVideoFitScore,
        recommendedHookTypes: result.recommendedHookTypes,
        recommendedScriptStructures: result.recommendedScriptStructures,
        recommendedContentFormats: result.recommendedContentFormats,
        confidenceScore: new Decimal(result.confidenceScore),
        evidenceReferences: result.evidenceReferences,
      },
    });
  });

  safeAudit({
    action: "product.contentFit.analyze",
    entityType: "ProductContentFitProfile",
    entityId: productId,
    actor,
  });

  return { productId, shortVideoFitScore: result.shortVideoFitScore };
}

// ---------------------------------------------------------------------------
// Profitability
// ---------------------------------------------------------------------------

export async function estimateProfitabilityForOffer(
  offerId: string,
  actor: string,
  workspaceId: string = DEFAULT_WORKSPACE_ID,
): Promise<unknown> {
  const offer = await prisma.affiliateOffer.findFirst({
    where: { id: offerId, workspaceId },
  });
  if (!offer) throw new Error(`AffiliateOffer not found: ${offerId}`);

  const estimatedCommissionPerConversion =
    offer.commissionType === "PERCENTAGE" && offer.commissionRate && offer.priceAmount
      ? offer.priceAmount.mul(offer.commissionRate)
      : offer.commissionAmount;

  const result = estimateProfitability({
    currency: offer.currency ?? "EUR",
    estimatedCommissionPerConversion,
    estimatedConversionRate: new Decimal(0.02),
    estimatedContentCost: new Decimal(50),
    estimatedPlatformCost: new Decimal(10),
    assumptionsProvided: true,
    confidenceScore: 0.4,
    evidence: ["heuristic"],
  });

  await prisma.productProfitabilityEstimate.deleteMany({ where: { workspaceId, affiliateOfferId: offerId } });
  const created = await prisma.productProfitabilityEstimate.create({
    data: {
      workspaceId,
      productId: offer.productId,
      affiliateOfferId: offer.id,
      currency: offer.currency ?? "EUR",
      estimatedCommissionPerConversion: result.estimatedCommissionPerConversion,
      estimatedRevenuePerPost: result.estimatedRevenuePerPost,
      estimatedNetRevenuePerPost: result.estimatedNetRevenuePerPost,
      lowerBound: result.lowerBound,
      upperBound: result.upperBound,
      confidenceScore: new Decimal(result.confidenceScore),
      estimationVersion: PROFITABILITY_VERSION,
      assumptions: result.assumptions,
    },
  });

  safeAudit({
    action: "product.profitability.estimate",
    entityType: "ProductProfitabilityEstimate",
    entityId: created.id,
    actor,
  });

  return created;
}

// ---------------------------------------------------------------------------
// Opportunity scoring
// ---------------------------------------------------------------------------

export async function scoreProductOpportunities(
  productId: string | null,
  actor: string,
  workspaceId: string = DEFAULT_WORKSPACE_ID,
): Promise<number> {
  const statusFilter = ["DISCOVERED", "UNDER_REVIEW", "APPROVED"] as const;
  const products = await prisma.product.findMany({
    where: {
      workspaceId,
      ...(productId ? { id: productId } : { status: { in: [...statusFilter] } }),
    },
    include: {
      offers: { include: { affiliateProgram: true } },
      complianceProfiles: true,
      contentFitProfiles: true,
      profitabilityEstimates: true,
      dataQualityReports: { orderBy: { generatedAt: "desc" }, take: 1 },
    },
  });

  let createdCount = 0;
  for (const product of products) {
    const compliantOffer = product.offers.find((o) => {
      const profile = product.complianceProfiles[0];
      return profile
        ? profile.status === "PASSED"
        : true;
    });
    if (!compliantOffer) continue;

    const profile = product.complianceProfiles[0];
    const complianceStatus =
      profile?.status === "PASSED"
        ? "passed"
        : profile?.status === "FAILED"
          ? "failed"
          : "manual_review";
    const complianceCritical = complianceStatus === "failed";

    const offer = compliantOffer;
    const commissionScore = offer.commissionRate
      ? Math.min(100, Math.round(Number(offer.commissionRate) * 1000))
      : 30;
    const ratingCount = offer.ratingCount ?? 0n;
    const demandScore = ratingCount > 1000n ? 80 : ratingCount > 100n ? 50 : 20;
    const competitionScore = 50;
    const contentFit = product.contentFitProfiles[0];
    const contentFitScore = contentFit
      ? Math.round(
          (contentFit.demonstrabilityScore +
            contentFit.visualAppealScore +
            contentFit.shortVideoFitScore) /
            3,
        )
      : 40;
    const audienceFitScore = product.nicheId ? 60 : 40;
    const trendScore = 50;
    const profitability = product.profitabilityEstimates[0];
    const profitabilityScore = profitability && profitability.estimatedNetRevenuePerPost
      ? profitability.estimatedNetRevenuePerPost.gt(new Decimal(0))
        ? 70
        : 20
      : 40;
    const dq = product.dataQualityReports[0];
    const dataQualityScore = dq ? dq.overallScore : 50;
    const complianceScore = complianceStatus === "passed" ? 100 : 0;

    const input: OpportunityInput = {
      commissionScore,
      demandScore,
      competitionScore,
      contentFitScore,
      audienceFitScore,
      trendScore,
      profitabilityScore,
      dataQualityScore,
      complianceScore,
      complianceCritical,
      confidenceScore: 0.5,
      sampleSize: ratingCount,
      evidence: {},
    };

    const scored = scoreOpportunity(input);

    await prisma.$transaction(async (tx: Tx) => {
      await tx.productOpportunity.deleteMany({ where: { productId: product.id } });
      const opportunity = await tx.productOpportunity.create({
        data: {
          workspaceId,
          productId: product.id,
          affiliateOfferId: offer.id,
          nicheId: product.nicheId,
          brandId: null,
          status: "NEW",
          totalScore: scored.totalScore,
          commissionScore,
          demandScore,
          competitionScore,
          contentFitScore,
          audienceFitScore,
          trendScore,
          profitabilityScore,
          dataQualityScore,
          complianceScore,
          confidenceScore: new Decimal(scored.confidenceScore),
          sampleSize: ratingCount,
          scoringVersion: SCORING_VERSION,
          explanation: scored.explanation,
          evidenceReferences: [],
        },
      });
      await tx.productOpportunityScoreComponent.createMany({
        data: scored.components.map((c) => ({
          workspaceId,
          opportunityId: opportunity.id,
          component: c.component,
          score: Math.round(c.score),
          weight: new Decimal(c.weight),
          contribution: new Decimal(c.contribution),
          explanation: c.explanation,
          evidenceReferences: c.evidenceReferences,
        })),
      });
    });

    createdCount++;
  }

  if (createdCount > 0) incrementMetric(METRICS.productOpportunitiesCreatedTotal, createdCount);
  log("scored product opportunities", {
    correlationId: randomUUID(),
    actor,
    count: createdCount,
  });
  return createdCount;
}

export async function expireOpportunities(
  actor: string,
  workspaceId: string = DEFAULT_WORKSPACE_ID,
): Promise<number> {
  const now = new Date();
  const result = await prisma.productOpportunity.updateMany({
    where: {
      workspaceId,
      status: { in: ["NEW", "UNDER_REVIEW", "APPROVED"] },
      expiresAt: { lt: now },
    },
    data: { status: "EXPIRED" },
  });
  if (result.count > 0) incrementMetric(METRICS.productOpportunitiesExpiredTotal, result.count);
  return result.count;
}

// ---------------------------------------------------------------------------
// Approvals
// ---------------------------------------------------------------------------

/** Pure status mapping for product lifecycle actions. */
export function nextProductStatus(action: "approve" | "reject" | "archive"): ProductStatus {
  if (action === "approve") return "approved";
  if (action === "reject") return "rejected";
  return "archived";
}

export async function approveProduct(
  productId: string,
  actor: string,
  reason?: string,
  workspaceId: string = DEFAULT_WORKSPACE_ID,
): Promise<unknown> {
  return applyProductDecision(productId, actor, "approve", reason, workspaceId);
}

export async function rejectProduct(
  productId: string,
  actor: string,
  reason?: string,
  workspaceId: string = DEFAULT_WORKSPACE_ID,
): Promise<unknown> {
  return applyProductDecision(productId, actor, "reject", reason, workspaceId);
}

export async function archiveProduct(
  productId: string,
  actor: string,
  workspaceId: string = DEFAULT_WORKSPACE_ID,
): Promise<unknown> {
  return applyProductDecision(productId, actor, "archive", undefined, workspaceId);
}

async function applyProductDecision(
  productId: string,
  actor: string,
  action: "approve" | "reject" | "archive",
  reason: string | undefined,
  workspaceId: string,
): Promise<unknown> {
  const prismaStatus = PRODUCT_STATUS_TO_PRISMA[nextProductStatus(action)];
  const data: Prisma.ProductUncheckedUpdateInput = { status: prismaStatus };
  if (action === "archive") data.archivedAt = new Date();
  const product = await prisma.product.findFirst({ where: { id: productId, workspaceId } });
  if (!product) throw new Error("Product not found");
  const updatedProduct = await prisma.product.update({ where: { id: product.id }, data });

  await prisma.approval.create({
    data: {
      workspaceId,
      resourceType: APPROVAL_RESOURCE_TO_PRISMA.product,
      resourceId: productId,
      status: APPROVAL_STATUS_TO_PRISMA.approved,
      decidedBy: actor,
      decisionReason: reason ?? null,
      decidedAt: new Date(),
    },
  });

  safeAudit({
    action: `product.${action}`,
    entityType: "Product",
    entityId: productId,
    metadata: { reason } as Prisma.InputJsonValue,
    actor,
  });

  return updatedProduct;
}

export async function approveOpportunity(
  opportunityId: string,
  actor: string,
  workspaceId: string = DEFAULT_WORKSPACE_ID,
): Promise<unknown> {
  return applyOpportunityDecision(opportunityId, actor, "approve", workspaceId);
}

export async function rejectOpportunity(
  opportunityId: string,
  actor: string,
  workspaceId: string = DEFAULT_WORKSPACE_ID,
): Promise<unknown> {
  return applyOpportunityDecision(opportunityId, actor, "reject", workspaceId);
}

async function applyOpportunityDecision(
  opportunityId: string,
  actor: string,
  action: "approve" | "reject",
  workspaceId: string,
): Promise<unknown> {
  const prismaStatus = OPPORTUNITY_STATUS_TO_PRISMA[action === "approve" ? "approved" : "rejected"];
  const opportunity = await prisma.productOpportunity.findFirst({ where: { id: opportunityId, workspaceId } });
  if (!opportunity) throw new Error("ProductOpportunity not found");
  const updatedOpportunity = await prisma.productOpportunity.update({
    where: { id: opportunity.id },
    data: { status: prismaStatus },
  });

  await prisma.approval.create({
    data: {
      workspaceId,
      resourceType: "product_opportunity",
      resourceId: opportunityId,
      status: "APPROVED",
      decidedBy: actor,
      decidedAt: new Date(),
    },
  });

  if (action === "approve") incrementMetric(METRICS.productOpportunitiesApprovedTotal);
  else incrementMetric(METRICS.productOpportunitiesRejectedTotal);

  safeAudit({
    action: `opportunity.${action}`,
    entityType: "ProductOpportunity",
    entityId: opportunityId,
    actor,
  });

  return updatedOpportunity;
}

export async function convertOpportunityToCampaign(
  opportunityId: string,
  actor: string,
  workspaceId: string = DEFAULT_WORKSPACE_ID,
): Promise<string> {
  const opportunity = await prisma.productOpportunity.findFirst({
    where: { id: opportunityId, workspaceId },
    include: { product: true, offer: true },
  });
  if (!opportunity) throw new Error(`ProductOpportunity not found: ${opportunityId}`);

  const campaign = await prisma.campaign.create({
    data: {
      workspaceId,
      name: opportunity.product.canonicalName,
      productId: opportunity.productId,
      status: "DRAFT",
      budget: null,
      currency: opportunity.offer.currency ?? "EUR",
    },
  });

  await prisma.productOpportunity.update({
    where: { id: opportunity.id },
    data: { status: "CONVERTED_TO_CAMPAIGN" },
  });

  safeAudit({
    action: "opportunity.convert",
    entityType: "Campaign",
    entityId: campaign.id,
    metadata: { opportunityId } as Prisma.InputJsonValue,
    actor,
  });

  return campaign.id;
}

// ---------------------------------------------------------------------------
// CSV import
// ---------------------------------------------------------------------------

export interface ImportPreview {
  previewToken: string;
  validRows: number;
  invalidRows: number;
  warnings: number;
}

export async function previewImport(
  content: string,
  actor: string,
  workspaceId: string = DEFAULT_WORKSPACE_ID,
): Promise<ImportPreview> {
  const categories = await prisma.productCategory.findMany({
    where: { workspaceId },
    select: { name: true },
  });
  const knownCategories = new Set(categories.map((c) => c.name));
  const knownCurrencies = KNOWN_CURRENCIES;

  const preview = previewCsv(content, knownCategories, knownCurrencies);

  const previewToken = randomUUID();
  const batch = await prisma.productImportBatch.create({
    data: {
      workspaceId,
      source: "csv",
      status: "preview",
      previewToken,
      validRows: preview.validRows.length,
      invalidRows: preview.invalidRows.length,
      warningRows: preview.warnings.filter((w) => w.warnings.length > 0).length,
    },
  });

  const rows = [
    ...preview.validRows.map((row, idx) => ({
      workspaceId,
      batchId: batch.id,
      rowIndex: idx,
      status: "valid",
      rawData: row as unknown as Prisma.InputJsonValue,
      normalizedData: buildNormalizedFromRow(row) as unknown as Prisma.InputJsonValue,
      errors: [],
      warnings: preview.warnings[idx]?.warnings ?? [],
    })),
    ...preview.invalidRows.map((inv) => ({
      workspaceId,
      batchId: batch.id,
      rowIndex: inv.index,
      status: "invalid",
      rawData: inv.raw as unknown as Prisma.InputJsonValue,
      normalizedData: null,
      errors: inv.errors,
      warnings: [],
    })),
  ];

  await prisma.productImportRow.createMany({
    data: rows as Prisma.ProductImportRowCreateManyInput[],
  });

  safeAudit({
    action: "product.import.preview",
    entityType: "ProductImportBatch",
    entityId: batch.id,
    metadata: { previewToken, validRows: preview.validRows.length } as Prisma.InputJsonValue,
    actor,
  });

  return {
    previewToken,
    validRows: preview.validRows.length,
    invalidRows: preview.invalidRows.length,
    warnings: preview.warnings.filter((w) => w.warnings.length > 0).length,
  };
}

function buildNormalizedFromRow(row: ProductCsvRow): NormalizedOffer {
  const raw: NormalizedOffer = {
    externalProductId: row.external_product_id ?? "",
    externalOfferId: row.external_offer_id ?? null,
    title: row.title ?? "",
    description: row.description ?? null,
    productUrl: row.product_url ?? "",
    affiliateUrl: row.affiliate_url ?? null,
    priceAmount: row.price ? new Decimal(row.price) : null,
    originalPriceAmount: row.original_price ? new Decimal(row.original_price) : null,
    currency: row.currency ?? null,
    commissionType: (row.commission_type as NormalizedOffer["commissionType"]) ?? "unknown",
    commissionRate: row.commission_rate ? new Decimal(row.commission_rate) : null,
    commissionAmount: row.commission_amount ? new Decimal(row.commission_amount) : null,
    availability: (row.availability as NormalizedOffer["availability"]) ?? "unknown",
    sellerName: row.seller ?? null,
    shippingCountryCodes: row.country_codes
      ? row.country_codes.split("|").map((s) => s.trim())
      : [],
    averageRating: null,
    ratingCount: null,
    sourceUpdatedAt: null,
    gtin: null,
    manufacturerPartNumber: row.manufacturer ?? null,
    rawReferenceId: null,
  };
  return normalizeOffer(raw);
}

export async function commitImport(
  previewToken: string,
  actor: string,
  workspaceId: string = DEFAULT_WORKSPACE_ID,
): Promise<number> {
  const batch = await prisma.productImportBatch.findFirst({
    where: { previewToken, workspaceId },
    include: { rows: { where: { status: "valid" } } },
  });
  if (!batch) throw new Error(`Import batch not found for token: ${previewToken}`);

  let committed = 0;
  await prisma.$transaction(async (tx: Tx) => {
    for (const row of batch.rows) {
      const normalized = row.normalizedData as unknown as NormalizedOffer | null;
      if (!normalized) continue;
      const provider = (normalized.productUrl ? "CUSTOM" : "CUSTOM") as AffiliateNetwork;
      const programId = await ensureProgram(tx, provider, workspaceId);

      const product = await tx.product.create({
        data: {
          workspaceId,
          canonicalName: normalized.title,
          description: normalized.description,
          brandName: null,
          manufacturerName: normalized.manufacturerPartNumber,
          status: "DISCOVERED",
          riskLevel: "MEDIUM",
          languageCode: "de",
          targetCountryCodes: normalized.shippingCountryCodes.length
            ? normalized.shippingCountryCodes
            : ["DE"],
          lastVerifiedAt: new Date(),
        },
      });
      await tx.affiliateOffer.create({
        data: {
          workspaceId,
          productId: product.id,
          affiliateProgramId: programId,
          provider,
          externalProductId: normalized.externalProductId,
          externalOfferId: normalized.externalOfferId,
          title: normalized.title,
          description: normalized.description,
          productUrl: normalized.productUrl,
          affiliateUrl: normalized.affiliateUrl,
          priceAmount: normalized.priceAmount,
          originalPriceAmount: normalized.originalPriceAmount,
          currency: normalized.currency,
          commissionType: COMMISSION_TYPE_TO_PRISMA[normalized.commissionType],
          commissionRate: normalized.commissionRate,
          commissionAmount: normalized.commissionAmount,
          availability: AVAILABILITY_TO_PRISMA[normalized.availability],
          sellerName: normalized.sellerName,
          shippingCountryCodes: normalized.shippingCountryCodes,
          averageRating: normalized.averageRating,
          ratingCount: normalized.ratingCount,
          status: "ACTIVE",
          lastCheckedAt: new Date(),
          rawReferenceId: normalized.rawReferenceId,
        },
      });
      committed++;
    }

    await tx.productImportBatch.update({
      where: { id: batch.id },
      data: { status: "committed", committedAt: new Date() },
    });
  });

  if (committed > 0) incrementMetric(METRICS.productOffersImportedTotal, committed);

  safeAudit({
    action: "product.import.commit",
    entityType: "ProductImportBatch",
    entityId: batch.id,
    metadata: { committed } as Prisma.InputJsonValue,
    actor,
  });

  return committed;
}

// ---------------------------------------------------------------------------
// Data quality
// ---------------------------------------------------------------------------

export async function scanDataQualityForProduct(
  productId: string,
  actor: string,
  workspaceId: string = DEFAULT_WORKSPACE_ID,
): Promise<unknown> {
  const product = await prisma.product.findFirst({
    where: { id: productId, workspaceId },
    include: { offers: { include: { affiliateProgram: true } } },
  });
  if (!product) throw new Error(`Product not found: ${productId}`);

  const offer = product.offers[0];
  const result = evaluateDataQuality({
    product: {
      canonicalName: product.canonicalName,
      description: product.description,
      brandName: product.brandName,
      categoryId: product.categoryId,
      targetCountryCodes: product.targetCountryCodes,
    },
    offer: offer
      ? {
          priceAmount: offer.priceAmount,
          currency: offer.currency,
          commissionType: COMMISSION_TYPE_FROM_PRISMA[offer.commissionType],
          commissionRate: offer.commissionRate,
          commissionAmount: offer.commissionAmount,
          availability: AVAILABILITY_FROM_PRISMA[offer.availability],
          affiliateUrl: offer.affiliateUrl,
          productUrl: offer.productUrl,
          lastCheckedAt: offer.lastCheckedAt,
          status: OFFER_STATUS_FROM_PRISMA[offer.status],
          affiliateProgramStatus: offer.affiliateProgram?.status ?? null,
        }
      : {
          priceAmount: null,
          currency: null,
          commissionType: "unknown",
          commissionRate: null,
          commissionAmount: null,
          availability: "unknown",
          affiliateUrl: null,
          productUrl: null,
          lastCheckedAt: null,
          status: "invalid",
        },
  });

  await prisma.$transaction(async (tx: Tx) => {
    await tx.productDataQualityReport.deleteMany({ where: { productId, workspaceId } });
    const report = await tx.productDataQualityReport.create({
      data: {
        workspaceId,
        productId,
        completenessScore: result.completenessScore,
        freshnessScore: result.freshnessScore,
        consistencyScore: result.consistencyScore,
        identityScore: result.identityScore,
        commercialDataScore: result.commercialDataScore,
        complianceDataScore: result.complianceDataScore,
        overallScore: result.overallScore,
        issueCount: result.issues.length,
      },
    });
    if (result.issues.length > 0) {
      await tx.productDataQualityIssue.createMany({
        data: result.issues.map((issue) => ({
          workspaceId,
          reportId: report.id,
          issueType: DQ_ISSUE_TO_PRISMA[issue.issueType],
          severity: RISK_LEVEL_TO_PRISMA[issue.severity],
          detail: issue.detail ?? null,
        })),
      });
    }
  });

  incrementMetric(METRICS.productDataQualityScore, result.overallScore);

  safeAudit({
    action: "product.dataQuality.scan",
    entityType: "ProductDataQualityReport",
    entityId: productId,
    metadata: { overallScore: result.overallScore } as Prisma.InputJsonValue,
    actor,
  });

  return { productId, overallScore: result.overallScore, issueCount: result.issues.length };
}

// ---------------------------------------------------------------------------
// Offer refresh
// ---------------------------------------------------------------------------

export async function refreshOffers(
  actor: string,
  workspaceId: string = DEFAULT_WORKSPACE_ID,
): Promise<{ updated: number; unavailable: number }> {
  const offers = await prisma.affiliateOffer.findMany({
    where: { workspaceId, status: { in: ["ACTIVE", "PAUSED"] } },
    select: {
      id: true,
      provider: true,
      externalProductId: true,
      productUrl: true,
    },
  });

  const byProvider = new Map<AffiliateNetwork, string[]>();
  for (const o of offers) {
    const list = byProvider.get(o.provider) ?? [];
    list.push(o.externalProductId);
    byProvider.set(o.provider, list);
  }

  let updated = 0;
  let unavailable = 0;

  for (const [provider, externalIds] of byProvider) {
    try {
      const port = getProductSourceProvider(provider);
      const result = await port.getOfferUpdates({
        workspaceId,
        correlationId: randomUUID(),
        providerId: provider,
        externalProductIds: externalIds,
      });
      const byId = new Map(result.offers.map((o) => [o.externalProductId, o]));
      for (const o of offers) {
        if (o.provider !== provider) continue;
        const fresh = byId.get(o.externalProductId);
        if (!fresh) continue;
        const urlCheck = validateUrl(fresh.productUrl);
        if (!urlCheck.valid) {
          await prisma.affiliateOffer.update({
            where: { id: o.id, workspaceId },
            data: { status: "UNAVAILABLE", lastCheckedAt: new Date() },
          });
          unavailable++;
          continue;
        }
        await prisma.affiliateOffer.update({
          where: { id: o.id, workspaceId },
          data: {
            priceAmount: fresh.priceAmount,
            availability: AVAILABILITY_TO_PRISMA[fresh.availability],
            commissionRate: fresh.commissionRate,
            commissionAmount: fresh.commissionAmount,
            currency: fresh.currency,
            lastCheckedAt: new Date(),
          },
        });
        updated++;
      }
    } catch {
      incrementMetric(METRICS.productProviderFailedTotal);
    }
  }

  if (updated > 0) incrementMetric(METRICS.productOffersUpdatedTotal, updated);
  if (unavailable > 0) incrementMetric(METRICS.productOffersUnavailableTotal, unavailable);

  log("refreshed offers", { correlationId: randomUUID(), actor, updated, unavailable });
  return { updated, unavailable };
}
