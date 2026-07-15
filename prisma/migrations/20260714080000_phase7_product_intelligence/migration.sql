-- CreateEnum
CREATE TYPE "ApprovalResourceType" AS ENUM ('product', 'affiliate_offer', 'product_opportunity', 'product_campaign_candidate');

-- CreateEnum
CREATE TYPE "AffiliateOfferStatus" AS ENUM ('ACTIVE', 'PAUSED', 'EXPIRED', 'UNAVAILABLE', 'INVALID');

-- CreateEnum
CREATE TYPE "Availability" AS ENUM ('IN_STOCK', 'LIMITED', 'OUT_OF_STOCK', 'PREORDER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('PERCENTAGE', 'FIXED', 'VARIABLE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ProductSourceFailureCode" AS ENUM ('AUTHENTICATION_FAILED', 'REAUTH_REQUIRED', 'PROGRAM_NOT_APPROVED', 'PERMISSION_DENIED', 'RATE_LIMITED', 'PRODUCT_NOT_FOUND', 'OFFER_NOT_FOUND', 'INVALID_RESPONSE', 'UNSUPPORTED_OPERATION', 'PLATFORM_UNAVAILABLE', 'NETWORK_ERROR', 'UNKNOWN_ERROR');

-- CreateEnum
CREATE TYPE "DiscoveryQueryStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DiscoveryRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'PARTIALLY_COMPLETED', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MatchMethod" AS ENUM ('EXTERNAL_ID', 'GTIN', 'MANUFACTURER_PART_NUMBER', 'NORMALIZED_NAME', 'FUZZY', 'MANUAL');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('PENDING', 'PASSED', 'FAILED', 'MANUAL_REVIEW');

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('NEW', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED', 'CONVERTED_TO_CAMPAIGN');

-- CreateEnum
CREATE TYPE "ResearchJobType" AS ENUM ('PRODUCT_DISCOVERY_RUN', 'PRODUCT_PROVIDER_IMPORT', 'PRODUCT_NORMALIZATION', 'PRODUCT_DEDUPLICATION', 'PRODUCT_OFFER_REFRESH', 'PRODUCT_COMPLIANCE_EVALUATION', 'PRODUCT_CONTENT_FIT_ANALYSIS', 'PRODUCT_PROFITABILITY_ESTIMATION', 'PRODUCT_OPPORTUNITY_SCORING', 'PRODUCT_OPPORTUNITY_EXPIRATION', 'PRODUCT_DATA_QUALITY_SCAN');

-- CreateEnum
CREATE TYPE "ResearchJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProductDataQualityIssueType" AS ENUM ('MISSING_TITLE', 'MISSING_DESCRIPTION', 'MISSING_CATEGORY', 'MISSING_BRAND', 'MISSING_PRICE', 'MISSING_CURRENCY', 'MISSING_COMMISSION', 'MISSING_AVAILABILITY', 'MISSING_TARGET_MARKET', 'INVALID_PRODUCT_URL', 'INVALID_AFFILIATE_URL', 'STALE_OFFER', 'CONFLICTING_IDENTITY', 'POSSIBLE_DUPLICATE', 'CURRENCY_MISMATCH', 'COMPLIANCE_NOT_EVALUATED', 'INACTIVE_AFFILIATE_PROGRAM');

-- AlterEnum
BEGIN;
CREATE TYPE "ProductStatus_new" AS ENUM ('DISCOVERED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PAUSED', 'UNAVAILABLE', 'ARCHIVED');
ALTER TABLE "public"."Product" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Product" ALTER COLUMN "status" TYPE "ProductStatus_new" USING (
  CASE "status"::text
    WHEN 'IDEA' THEN 'DISCOVERED'
    WHEN 'RESEARCHING' THEN 'UNDER_REVIEW'
    WHEN 'VALIDATED' THEN 'APPROVED'
    WHEN 'ACTIVE' THEN 'APPROVED'
    ELSE "status"::text
  END::"ProductStatus_new"
);
ALTER TYPE "ProductStatus" RENAME TO "ProductStatus_old";
ALTER TYPE "ProductStatus_new" RENAME TO "ProductStatus";
DROP TYPE "public"."ProductStatus_old";
ALTER TABLE "Product" ALTER COLUMN "status" SET DEFAULT 'DISCOVERED';
COMMIT;

-- AlterEnum
ALTER TYPE "RiskLevel" ADD VALUE IF NOT EXISTS 'CRITICAL';

-- DropIndex
DROP INDEX "Product_category_idx";

-- DropIndex
DROP INDEX "Product_status_idx";

-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parentCategoryId" TEXT,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "requiresManualApproval" BOOLEAN NOT NULL DEFAULT false,
    "contentGenerationAllowed" BOOLEAN NOT NULL DEFAULT true,
    "affiliatePromotionAllowed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Product"
ADD COLUMN     "brandName" TEXT,
ADD COLUMN     "canonicalName" TEXT,
ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "categoryLabel" TEXT,
ADD COLUMN     "languageCode" TEXT NOT NULL DEFAULT 'de',
ADD COLUMN     "lastVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "manufacturerName" TEXT,
ADD COLUMN     "nicheId" TEXT,
ADD COLUMN     "primaryImageReferenceId" TEXT,
ADD COLUMN     "riskLevel" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "targetCountryCodes" TEXT[] DEFAULT ARRAY['DE']::TEXT[],
ADD COLUMN     "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
ALTER COLUMN "name" SET DEFAULT '',
ALTER COLUMN "status" SET DEFAULT 'DISCOVERED';

-- Backfill Phase 7 fields before enforcing NOT NULL or removing legacy data.
UPDATE "Product"
SET "canonicalName" = COALESCE(NULLIF(BTRIM("name"), ''), "id")
WHERE "canonicalName" IS NULL;

UPDATE "Product"
SET "categoryLabel" = "category"
WHERE "categoryLabel" IS NULL
  AND "category" IS NOT NULL
  AND BTRIM("category") <> '';

INSERT INTO "ProductCategory" ("id", "workspaceId", "name", "slug", "createdAt", "updatedAt")
SELECT
    'legacy-category-' || LEFT(MD5("workspaceId" || ':' || BTRIM("category")), 32) AS "id",
    "workspaceId",
    BTRIM("category") AS "name",
    COALESCE(
        NULLIF(BTRIM(REGEXP_REPLACE(LOWER(BTRIM("category")), '[^a-z0-9]+', '-', 'g'), '-'), ''),
        'category'
    ) || '-' || LEFT(MD5(BTRIM("category")), 8) AS "slug",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT "workspaceId", "category"
    FROM "Product"
    WHERE "category" IS NOT NULL
      AND BTRIM("category") <> ''
) legacy_categories;

UPDATE "Product"
SET "categoryId" = 'legacy-category-' || LEFT(MD5("workspaceId" || ':' || BTRIM("category")), 32)
WHERE "categoryId" IS NULL
  AND "category" IS NOT NULL
  AND BTRIM("category") <> '';

ALTER TABLE "Product" ALTER COLUMN "canonicalName" SET NOT NULL;

ALTER TABLE "Product" DROP COLUMN "category";

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "resourceType" "ApprovalResourceType" NOT NULL,
    "resourceId" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT,
    "decidedBy" TEXT,
    "decisionReason" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateOffer" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "productId" TEXT NOT NULL,
    "affiliateProgramId" TEXT NOT NULL,
    "provider" "AffiliateProviderKey" NOT NULL,
    "externalProductId" TEXT NOT NULL,
    "externalOfferId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "productUrl" TEXT NOT NULL,
    "affiliateUrl" TEXT,
    "priceAmount" DECIMAL(12,2),
    "originalPriceAmount" DECIMAL(12,2),
    "currency" TEXT,
    "commissionType" "CommissionType" NOT NULL DEFAULT 'UNKNOWN',
    "commissionRate" DECIMAL(6,4),
    "commissionAmount" DECIMAL(12,2),
    "availability" "Availability" NOT NULL DEFAULT 'UNKNOWN',
    "sellerName" TEXT,
    "shippingCountryCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "averageRating" DECIMAL(3,2),
    "ratingCount" BIGINT,
    "status" "AffiliateOfferStatus" NOT NULL DEFAULT 'ACTIVE',
    "sourceUpdatedAt" TIMESTAMP(3),
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCheckedAt" TIMESTAMP(3),
    "rawReferenceId" TEXT,

    CONSTRAINT "AffiliateOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateOfferSnapshot" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "affiliateOfferId" TEXT NOT NULL,
    "priceAmount" DECIMAL(12,2),
    "originalPriceAmount" DECIMAL(12,2),
    "currency" TEXT,
    "commissionRate" DECIMAL(6,4),
    "commissionAmount" DECIMAL(12,2),
    "availability" "Availability" NOT NULL,
    "averageRating" DECIMAL(3,2),
    "ratingCount" BIGINT,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliateOfferSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductDiscoveryQuery" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "name" TEXT NOT NULL,
    "nicheId" TEXT,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "excludedKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "categoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "excludedCategoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetCountryCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "languageCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "minimumPrice" DECIMAL(12,2),
    "maximumPrice" DECIMAL(12,2),
    "currency" TEXT,
    "minimumCommissionRate" DECIMAL(6,4),
    "minimumCommissionAmount" DECIMAL(12,2),
    "minimumRating" DECIMAL(3,2),
    "minimumRatingCount" INTEGER,
    "requireInStock" BOOLEAN NOT NULL DEFAULT false,
    "providerIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "DiscoveryQueryStatus" NOT NULL DEFAULT 'DRAFT',
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductDiscoveryQuery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductDiscoveryQueryVersion" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "queryId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "querySnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductDiscoveryQueryVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductDiscoveryRun" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "queryId" TEXT NOT NULL,
    "status" "DiscoveryRunStatus" NOT NULL DEFAULT 'QUEUED',
    "providerCount" INTEGER NOT NULL DEFAULT 0,
    "successfulProviderCount" INTEGER NOT NULL DEFAULT 0,
    "failedProviderCount" INTEGER NOT NULL DEFAULT 0,
    "discoveredOfferCount" INTEGER NOT NULL DEFAULT 0,
    "newProductCount" INTEGER NOT NULL DEFAULT 0,
    "updatedProductCount" INTEGER NOT NULL DEFAULT 0,
    "duplicateCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "correlationId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductDiscoveryRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductDiscoveryProviderRun" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "discoveryRunId" TEXT NOT NULL,
    "provider" "AffiliateProviderKey" NOT NULL,
    "status" "DiscoveryRunStatus" NOT NULL DEFAULT 'QUEUED',
    "discoveredOfferCount" INTEGER NOT NULL DEFAULT 0,
    "newProductCount" INTEGER NOT NULL DEFAULT 0,
    "updatedProductCount" INTEGER NOT NULL DEFAULT 0,
    "duplicateCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "failureCode" "ProductSourceFailureCode",
    "failureReason" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ProductDiscoveryProviderRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImportBatch" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "fileName" TEXT,
    "fileHash" TEXT,
    "source" TEXT NOT NULL DEFAULT 'csv',
    "status" TEXT NOT NULL DEFAULT 'preview',
    "previewToken" TEXT,
    "validRows" INTEGER NOT NULL DEFAULT 0,
    "invalidRows" INTEGER NOT NULL DEFAULT 0,
    "warningRows" INTEGER NOT NULL DEFAULT 0,
    "committedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImportRow" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "batchId" TEXT NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'valid',
    "rawData" JSONB NOT NULL,
    "normalizedData" JSONB,
    "errors" JSONB,
    "warnings" JSONB,

    CONSTRAINT "ProductImportRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMatchCandidate" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "sourceOfferId" TEXT NOT NULL,
    "candidateProductId" TEXT NOT NULL,
    "matchMethod" "MatchMethod" NOT NULL,
    "confidenceScore" DECIMAL(4,3) NOT NULL,
    "evidence" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "MatchStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decidedBy" TEXT,

    CONSTRAINT "ProductMatchCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductComplianceProfile" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "productId" TEXT NOT NULL,
    "categoryAllowed" BOOLEAN NOT NULL DEFAULT true,
    "nicheAllowed" BOOLEAN NOT NULL DEFAULT true,
    "targetMarketAllowed" BOOLEAN NOT NULL DEFAULT true,
    "affiliateProgramAllowsPromotion" BOOLEAN,
    "ageRestrictionDetected" BOOLEAN NOT NULL DEFAULT false,
    "healthClaimRiskDetected" BOOLEAN NOT NULL DEFAULT false,
    "financialClaimRiskDetected" BOOLEAN NOT NULL DEFAULT false,
    "regulatedProductRiskDetected" BOOLEAN NOT NULL DEFAULT false,
    "trademarkRiskDetected" BOOLEAN NOT NULL DEFAULT false,
    "misleadingClaimRiskDetected" BOOLEAN NOT NULL DEFAULT false,
    "disclosureRequired" BOOLEAN NOT NULL DEFAULT false,
    "manualReviewRequired" BOOLEAN NOT NULL DEFAULT false,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "status" "ComplianceStatus" NOT NULL DEFAULT 'PENDING',
    "reasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "evidenceReferences" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evaluationVersion" TEXT NOT NULL,

    CONSTRAINT "ProductComplianceProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductContentFitProfile" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "productId" TEXT NOT NULL,
    "demonstrabilityScore" INTEGER NOT NULL DEFAULT 0,
    "visualAppealScore" INTEGER NOT NULL DEFAULT 0,
    "problemSolutionFitScore" INTEGER NOT NULL DEFAULT 0,
    "testimonialFitScore" INTEGER NOT NULL DEFAULT 0,
    "tutorialFitScore" INTEGER NOT NULL DEFAULT 0,
    "shortVideoFitScore" INTEGER NOT NULL DEFAULT 0,
    "recommendedHookTypes" "HookType"[] DEFAULT ARRAY[]::"HookType"[],
    "recommendedScriptStructures" "ScriptStructureType"[] DEFAULT ARRAY[]::"ScriptStructureType"[],
    "recommendedContentFormats" "PublishingFormat"[] DEFAULT ARRAY[]::"PublishingFormat"[],
    "confidenceScore" DECIMAL(4,3) NOT NULL DEFAULT 0,
    "evidenceReferences" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductContentFitProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductProfitabilityEstimate" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "productId" TEXT NOT NULL,
    "affiliateOfferId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "estimatedCommissionPerConversion" DECIMAL(12,2),
    "estimatedConversionRate" DECIMAL(6,4),
    "estimatedRevenuePerPost" DECIMAL(12,2),
    "estimatedContentCost" DECIMAL(12,2),
    "estimatedPlatformCost" DECIMAL(12,2),
    "estimatedNetRevenuePerPost" DECIMAL(12,2),
    "lowerBound" DECIMAL(12,2),
    "upperBound" DECIMAL(12,2),
    "confidenceScore" DECIMAL(4,3) NOT NULL DEFAULT 0,
    "estimationVersion" TEXT NOT NULL,
    "assumptions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductProfitabilityEstimate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductOpportunity" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "productId" TEXT NOT NULL,
    "affiliateOfferId" TEXT NOT NULL,
    "nicheId" TEXT,
    "brandId" TEXT,
    "status" "OpportunityStatus" NOT NULL DEFAULT 'NEW',
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "commissionScore" INTEGER NOT NULL DEFAULT 0,
    "demandScore" INTEGER NOT NULL DEFAULT 0,
    "competitionScore" INTEGER NOT NULL DEFAULT 0,
    "contentFitScore" INTEGER NOT NULL DEFAULT 0,
    "audienceFitScore" INTEGER NOT NULL DEFAULT 0,
    "trendScore" INTEGER NOT NULL DEFAULT 0,
    "profitabilityScore" INTEGER NOT NULL DEFAULT 0,
    "dataQualityScore" INTEGER NOT NULL DEFAULT 0,
    "complianceScore" INTEGER NOT NULL DEFAULT 0,
    "confidenceScore" DECIMAL(4,3) NOT NULL DEFAULT 0,
    "sampleSize" BIGINT,
    "scoringVersion" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "evidenceReferences" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "ProductOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductOpportunityScoreComponent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "opportunityId" TEXT NOT NULL,
    "component" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "weight" DECIMAL(5,4) NOT NULL,
    "contribution" DECIMAL(8,4) NOT NULL,
    "explanation" TEXT,
    "evidenceReferences" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "ProductOpportunityScoreComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductDataQualityReport" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "productId" TEXT NOT NULL,
    "affiliateOfferId" TEXT,
    "completenessScore" INTEGER NOT NULL DEFAULT 0,
    "freshnessScore" INTEGER NOT NULL DEFAULT 0,
    "consistencyScore" INTEGER NOT NULL DEFAULT 0,
    "identityScore" INTEGER NOT NULL DEFAULT 0,
    "commercialDataScore" INTEGER NOT NULL DEFAULT 0,
    "complianceDataScore" INTEGER NOT NULL DEFAULT 0,
    "overallScore" INTEGER NOT NULL DEFAULT 0,
    "issueCount" INTEGER NOT NULL DEFAULT 0,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductDataQualityReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductDataQualityIssue" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "reportId" TEXT NOT NULL,
    "issueType" "ProductDataQualityIssueType" NOT NULL,
    "severity" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "detail" TEXT,

    CONSTRAINT "ProductDataQualityIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductResearchJob" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "jobType" "ResearchJobType" NOT NULL,
    "status" "ResearchJobStatus" NOT NULL DEFAULT 'QUEUED',
    "correlationId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "queryId" TEXT,
    "productId" TEXT,
    "provider" "AffiliateProviderKey",
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductResearchJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSourceConfiguration" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "provider" "AffiliateProviderKey" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "mode" "IntegrationMode" NOT NULL DEFAULT 'MOCK',
    "credentialId" TEXT,
    "capabilities" JSONB,
    "lastValidatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductSourceConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Approval_workspaceId_resourceType_resourceId_idx" ON "Approval"("workspaceId", "resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "Approval_resourceType_resourceId_idx" ON "Approval"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "ProductCategory_workspaceId_parentCategoryId_idx" ON "ProductCategory"("workspaceId", "parentCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_workspaceId_slug_key" ON "ProductCategory"("workspaceId", "slug");

-- CreateIndex
CREATE INDEX "AffiliateOffer_workspaceId_productId_idx" ON "AffiliateOffer"("workspaceId", "productId");

-- CreateIndex
CREATE INDEX "AffiliateOffer_workspaceId_affiliateProgramId_idx" ON "AffiliateOffer"("workspaceId", "affiliateProgramId");

-- CreateIndex
CREATE INDEX "AffiliateOffer_workspaceId_status_idx" ON "AffiliateOffer"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "AffiliateOffer_workspaceId_provider_idx" ON "AffiliateOffer"("workspaceId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateOffer_provider_externalProductId_externalOfferId_key" ON "AffiliateOffer"("provider", "externalProductId", "externalOfferId");

-- CreateIndex
CREATE INDEX "AffiliateOfferSnapshot_workspaceId_affiliateOfferId_capture_idx" ON "AffiliateOfferSnapshot"("workspaceId", "affiliateOfferId", "capturedAt");

-- CreateIndex
CREATE INDEX "ProductDiscoveryQuery_workspaceId_status_idx" ON "ProductDiscoveryQuery"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "ProductDiscoveryQueryVersion_workspaceId_queryId_idx" ON "ProductDiscoveryQueryVersion"("workspaceId", "queryId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductDiscoveryRun_idempotencyKey_key" ON "ProductDiscoveryRun"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ProductDiscoveryRun_workspaceId_queryId_idx" ON "ProductDiscoveryRun"("workspaceId", "queryId");

-- CreateIndex
CREATE INDEX "ProductDiscoveryRun_workspaceId_status_idx" ON "ProductDiscoveryRun"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "ProductDiscoveryProviderRun_workspaceId_discoveryRunId_idx" ON "ProductDiscoveryProviderRun"("workspaceId", "discoveryRunId");

-- CreateIndex
CREATE INDEX "ProductDiscoveryProviderRun_workspaceId_provider_idx" ON "ProductDiscoveryProviderRun"("workspaceId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "ProductImportBatch_previewToken_key" ON "ProductImportBatch"("previewToken");

-- CreateIndex
CREATE INDEX "ProductImportBatch_workspaceId_previewToken_idx" ON "ProductImportBatch"("workspaceId", "previewToken");

-- CreateIndex
CREATE INDEX "ProductImportRow_workspaceId_batchId_idx" ON "ProductImportRow"("workspaceId", "batchId");

-- CreateIndex
CREATE INDEX "ProductMatchCandidate_workspaceId_sourceOfferId_idx" ON "ProductMatchCandidate"("workspaceId", "sourceOfferId");

-- CreateIndex
CREATE INDEX "ProductMatchCandidate_workspaceId_candidateProductId_idx" ON "ProductMatchCandidate"("workspaceId", "candidateProductId");

-- CreateIndex
CREATE INDEX "ProductMatchCandidate_workspaceId_status_idx" ON "ProductMatchCandidate"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "ProductComplianceProfile_workspaceId_productId_idx" ON "ProductComplianceProfile"("workspaceId", "productId");

-- CreateIndex
CREATE INDEX "ProductContentFitProfile_workspaceId_productId_idx" ON "ProductContentFitProfile"("workspaceId", "productId");

-- CreateIndex
CREATE INDEX "ProductProfitabilityEstimate_workspaceId_productId_idx" ON "ProductProfitabilityEstimate"("workspaceId", "productId");

-- CreateIndex
CREATE INDEX "ProductOpportunity_workspaceId_status_idx" ON "ProductOpportunity"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "ProductOpportunity_workspaceId_productId_idx" ON "ProductOpportunity"("workspaceId", "productId");

-- CreateIndex
CREATE INDEX "ProductOpportunity_workspaceId_affiliateOfferId_idx" ON "ProductOpportunity"("workspaceId", "affiliateOfferId");

-- CreateIndex
CREATE INDEX "ProductOpportunity_workspaceId_totalScore_idx" ON "ProductOpportunity"("workspaceId", "totalScore");

-- CreateIndex
CREATE INDEX "ProductOpportunityScoreComponent_workspaceId_opportunityId_idx" ON "ProductOpportunityScoreComponent"("workspaceId", "opportunityId");

-- CreateIndex
CREATE INDEX "ProductDataQualityReport_workspaceId_productId_idx" ON "ProductDataQualityReport"("workspaceId", "productId");

-- CreateIndex
CREATE INDEX "ProductDataQualityIssue_workspaceId_reportId_idx" ON "ProductDataQualityIssue"("workspaceId", "reportId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductResearchJob_idempotencyKey_key" ON "ProductResearchJob"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ProductResearchJob_workspaceId_jobType_status_idx" ON "ProductResearchJob"("workspaceId", "jobType", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSourceConfiguration_workspaceId_provider_key" ON "ProductSourceConfiguration"("workspaceId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsEvent_idempotencyKey_key" ON "AnalyticsEvent"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsProviderMapping_platform_version_key" ON "AnalyticsProviderMapping"("platform", "version");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsSyncJob_idempotencyKey_key" ON "AnalyticsSyncJob"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "ExperimentAssignment_experimentId_assignmentKey_key" ON "ExperimentAssignment"("experimentId", "assignmentKey");

-- CreateIndex
CREATE UNIQUE INDEX "OptimizationRule_code_version_key" ON "OptimizationRule"("code", "version");

-- CreateIndex
CREATE UNIQUE INDEX "PostingTimePerformance_socialAccountId_weekday_hourOfDay_ti_key" ON "PostingTimePerformance"("socialAccountId", "weekday", "hourOfDay", "timezone");

-- CreateIndex
CREATE INDEX "Product_workspaceId_status_idx" ON "Product"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Product_workspaceId_categoryId_idx" ON "Product"("workspaceId", "categoryId");

-- CreateIndex
CREATE INDEX "Product_workspaceId_nicheId_idx" ON "Product"("workspaceId", "nicheId");

-- CreateIndex
CREATE INDEX "Product_workspaceId_riskLevel_idx" ON "Product"("workspaceId", "riskLevel");

-- CreateIndex
CREATE UNIQUE INDEX "Product_workspaceId_slug_key" ON "Product"("workspaceId", "slug");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_nicheId_fkey" FOREIGN KEY ("nicheId") REFERENCES "Niche"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_primaryImageReferenceId_fkey" FOREIGN KEY ("primaryImageReferenceId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_parentCategoryId_fkey" FOREIGN KEY ("parentCategoryId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateOffer" ADD CONSTRAINT "AffiliateOffer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateOffer" ADD CONSTRAINT "AffiliateOffer_affiliateProgramId_fkey" FOREIGN KEY ("affiliateProgramId") REFERENCES "AffiliateProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateOfferSnapshot" ADD CONSTRAINT "AffiliateOfferSnapshot_affiliateOfferId_fkey" FOREIGN KEY ("affiliateOfferId") REFERENCES "AffiliateOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDiscoveryQueryVersion" ADD CONSTRAINT "ProductDiscoveryQueryVersion_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "ProductDiscoveryQuery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDiscoveryRun" ADD CONSTRAINT "ProductDiscoveryRun_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "ProductDiscoveryQuery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDiscoveryProviderRun" ADD CONSTRAINT "ProductDiscoveryProviderRun_discoveryRunId_fkey" FOREIGN KEY ("discoveryRunId") REFERENCES "ProductDiscoveryRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImportRow" ADD CONSTRAINT "ProductImportRow_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ProductImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMatchCandidate" ADD CONSTRAINT "ProductMatchCandidate_sourceOfferId_fkey" FOREIGN KEY ("sourceOfferId") REFERENCES "AffiliateOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMatchCandidate" ADD CONSTRAINT "ProductMatchCandidate_candidateProductId_fkey" FOREIGN KEY ("candidateProductId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductComplianceProfile" ADD CONSTRAINT "ProductComplianceProfile_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductContentFitProfile" ADD CONSTRAINT "ProductContentFitProfile_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductProfitabilityEstimate" ADD CONSTRAINT "ProductProfitabilityEstimate_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductProfitabilityEstimate" ADD CONSTRAINT "ProductProfitabilityEstimate_affiliateOfferId_fkey" FOREIGN KEY ("affiliateOfferId") REFERENCES "AffiliateOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOpportunity" ADD CONSTRAINT "ProductOpportunity_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOpportunity" ADD CONSTRAINT "ProductOpportunity_affiliateOfferId_fkey" FOREIGN KEY ("affiliateOfferId") REFERENCES "AffiliateOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOpportunityScoreComponent" ADD CONSTRAINT "ProductOpportunityScoreComponent_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "ProductOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDataQualityReport" ADD CONSTRAINT "ProductDataQualityReport_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDataQualityIssue" ADD CONSTRAINT "ProductDataQualityIssue_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ProductDataQualityReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
