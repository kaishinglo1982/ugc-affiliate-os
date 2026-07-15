-- Phase 6 analytics models

-- CreateEnum
CREATE TYPE "AnalyticsEventType" AS ENUM ('IMPRESSION', 'VIEW', 'VIDEO_STARTED', 'VIDEO_COMPLETED', 'LIKE', 'COMMENT', 'SHARE', 'SAVE', 'PROFILE_VISIT', 'LINK_CLICK', 'AFFILIATE_CLICK', 'LEAD', 'CONVERSION', 'REFUND', 'CHARGEBACK', 'REVENUE', 'COST');
-- CreateEnum
CREATE TYPE "AnalyticsEventSource" AS ENUM ('PLATFORM_API', 'AFFILIATE_API', 'WEBHOOK', 'CSV', 'INTERNAL', 'MANUAL');
-- CreateEnum
CREATE TYPE "MetricSnapshotSource" AS ENUM ('PLATFORM_API', 'CSV', 'MANUAL');
-- CreateEnum
CREATE TYPE "SyncJobType" AS ENUM ('ACCOUNT_SYNC', 'POST_SYNC', 'POST_BACKFILL', 'METRIC_NORMALIZATION', 'EVENT_DEDUPLICATION', 'AGGREGATION', 'ANOMALY_DETECTION');
-- CreateEnum
CREATE TYPE "SyncJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'DEAD');
-- CreateEnum
CREATE TYPE "AnalyticsSyncFailureCode" AS ENUM ('AUTHENTICATION_FAILED', 'REAUTH_REQUIRED', 'ACCOUNT_RESTRICTED', 'POST_NOT_FOUND', 'RATE_LIMITED', 'UNSUPPORTED_METRIC', 'INVALID_RESPONSE', 'PLATFORM_UNAVAILABLE', 'NETWORK_ERROR', 'UNKNOWN_ERROR');
-- CreateEnum
CREATE TYPE "PublishingFormat" AS ENUM ('VIDEO_SHORT', 'VIDEO_LONG', 'IMAGE_CAROUSEL', 'STATIC_IMAGE', 'STORY', 'REEL', 'LIVESTREAM', 'TEXT_POST', 'OTHER');
-- CreateEnum
CREATE TYPE "HookType" AS ENUM ('PROBLEM', 'QUESTION', 'SHOCK', 'CURIOSITY', 'BENEFIT', 'COMPARISON', 'DEMONSTRATION', 'TESTIMONIAL', 'STORY', 'URGENCY', 'AUTHORITY', 'CONTRARIAN');
-- CreateEnum
CREATE TYPE "ScriptStructureType" AS ENUM ('HOOK_PROBLEM_SOLUTION_CTA', 'HOOK_DEMO_PROOF_CTA', 'STORY_PROBLEM_SOLUTION', 'COMPARISON_RECOMMENDATION', 'LISTICLE', 'BEFORE_AFTER', 'TESTIMONIAL', 'TUTORIAL', 'UNBOXING', 'REVIEW');
-- CreateEnum
CREATE TYPE "CallToActionType" AS ENUM ('CLICK_LINK', 'BUY_NOW', 'LEARN_MORE', 'SAVE_POST', 'FOLLOW', 'COMMENT', 'SHARE', 'VISIT_PROFILE', 'NONE');
-- CreateEnum
CREATE TYPE "AnalysisSource" AS ENUM ('MANUAL', 'RULE_ENGINE', 'AI');
-- CreateEnum
CREATE TYPE "ContentVariantStatus" AS ENUM ('DRAFT', 'READY', 'APPROVED', 'PUBLISHED', 'ARCHIVED');
-- CreateEnum
CREATE TYPE "GeneratedBy" AS ENUM ('HUMAN', 'TEMPLATE', 'AI', 'OPTIMIZATION_ENGINE');
-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED');
-- CreateEnum
CREATE TYPE "ExperimentStatus" AS ENUM ('DRAFT', 'AWAITING_APPROVAL', 'SCHEDULED', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED', 'INCONCLUSIVE');
-- CreateEnum
CREATE TYPE "ExperimentType" AS ENUM ('HOOK', 'SCRIPT', 'CAPTION', 'THUMBNAIL', 'CTA', 'POSTING_TIME', 'CONTENT_FORMAT', 'PRODUCT', 'PLATFORM');
-- CreateEnum
CREATE TYPE "ExperimentMetric" AS ENUM ('VIEW_RATE', 'COMPLETION_RATE', 'ENGAGEMENT_RATE', 'CLICK_THROUGH_RATE', 'CONVERSION_RATE', 'COMMISSION_REVENUE', 'ESTIMATED_NET_REVENUE', 'REVENUE_PER_VIEW', 'REVENUE_PER_CLICK', 'RETURN_ON_CONTENT_SPEND');
-- CreateEnum
CREATE TYPE "TrafficAllocationMode" AS ENUM ('EQUAL', 'WEIGHTED', 'MANUAL');
-- CreateEnum
CREATE TYPE "ExperimentVariantStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED');
-- CreateEnum
CREATE TYPE "ExperimentAssignmentType" AS ENUM ('PUBLISHING_JOB', 'SOCIAL_ACCOUNT', 'TIME_SLOT', 'AUDIENCE_SEGMENT');
-- CreateEnum
CREATE TYPE "AnalysisMethod" AS ENUM ('FREQUENTIST', 'BAYESIAN', 'DESCRIPTIVE');
-- CreateEnum
CREATE TYPE "ExperimentResultStatus" AS ENUM ('RUNNING', 'INSUFFICIENT_DATA', 'INCONCLUSIVE', 'WINNER_FOUND', 'COMPLETED_WITHOUT_WINNER');
-- CreateEnum
CREATE TYPE "RecommendationType" AS ENUM ('CREATE_VARIANT', 'REUSE_HOOK', 'RETIRE_HOOK', 'CHANGE_CTA', 'CHANGE_POSTING_TIME', 'CHANGE_PLATFORM', 'PROMOTE_PRODUCT', 'PAUSE_PRODUCT', 'INCREASE_TESTING', 'REDUCE_COST', 'REVIEW_ATTRIBUTION', 'REVIEW_COMPLIANCE');
-- CreateEnum
CREATE TYPE "ScopeType" AS ENUM ('WORKSPACE', 'BRAND', 'NICHE', 'CAMPAIGN', 'PRODUCT', 'CONTENT_ASSET', 'CONTENT_VARIANT', 'SOCIAL_ACCOUNT');
-- CreateEnum
CREATE TYPE "ExpectedImpact" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('GENERATED', 'REVIEWED', 'ACCEPTED', 'REJECTED', 'IMPLEMENTED', 'EXPIRED');
-- CreateEnum
CREATE TYPE "OptimizationMode" AS ENUM ('OBSERVE_ONLY', 'RECOMMEND', 'DRAFT_VARIANTS');
-- CreateEnum
CREATE TYPE "AnomalySeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
-- CreateEnum
CREATE TYPE "AnomalyStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');
-- CreateEnum
CREATE TYPE "DataQualityScope" AS ENUM ('WORKSPACE', 'SOCIAL_ACCOUNT', 'CAMPAIGN', 'CONTENT_ASSET', 'AFFILIATE_PROGRAM');
-- CreateEnum
CREATE TYPE "DataQualityIssueType" AS ENUM ('MISSING_METRICS', 'STALE_METRICS', 'DUPLICATE_EVENTS', 'CURRENCY_MISMATCH', 'MISSING_ATTRIBUTION', 'INVALID_TIMESTAMP', 'METRIC_REGRESSION', 'PROVIDER_MAPPING_ERROR', 'ORPHANED_POST', 'ORPHANED_TRANSACTION', 'UNEXPECTED_NEGATIVE_VALUE');
-- CreateEnum
CREATE TYPE "OptimizationRuleStatus" AS ENUM ('ACTIVE', 'DISABLED');
-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "Niche" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Niche_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "ContentAsset" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mediaAssetId" TEXT,
    "brandId" TEXT,
    "nicheId" TEXT,
    "format" "PublishingFormat",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentAsset_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "eventType" "AnalyticsEventType" NOT NULL,
    "platform" "SocialPlatform",
    "socialAccountId" TEXT,
    "brandId" TEXT,
    "nicheId" TEXT,
    "campaignId" TEXT,
    "publishingJobId" TEXT,
    "externalPostId" TEXT,
    "contentAssetId" TEXT,
    "contentVariantId" TEXT,
    "productId" TEXT,
    "affiliateProgramId" TEXT,
    "affiliateLinkId" TEXT,
    "experimentId" TEXT,
    "experimentVariantId" TEXT,
    "numericValue" DECIMAL(14,2),
    "currency" TEXT,
    "occurredAt" TIMESTAMPTZ(6) NOT NULL,
    "sourceTimezone" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "AnalyticsEventSource" NOT NULL,
    "externalEventId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "metadataReferenceId" TEXT,
    "correctedByEventId" TEXT,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "PlatformMetricSnapshot" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "externalPostId" TEXT NOT NULL,
    "publishingJobId" TEXT,
    "contentAssetId" TEXT,
    "measuredAt" TIMESTAMPTZ(6) NOT NULL,
    "periodStart" TIMESTAMPTZ(6),
    "periodEnd" TIMESTAMPTZ(6),
    "impressions" BIGINT,
    "reach" BIGINT,
    "views" BIGINT,
    "videoStarts" BIGINT,
    "videoCompletions" BIGINT,
    "likes" BIGINT,
    "comments" BIGINT,
    "shares" BIGINT,
    "saves" BIGINT,
    "profileVisits" BIGINT,
    "linkClicks" BIGINT,
    "averageWatchTimeSeconds" DECIMAL(12,2),
    "totalWatchTimeSeconds" DECIMAL(14,2),
    "completionRate" DECIMAL(6,4),
    "source" "MetricSnapshotSource" NOT NULL,
    "externalSnapshotId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformMetricSnapshot_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "AnalyticsSyncJob" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "jobType" "SyncJobType" NOT NULL,
    "socialAccountId" TEXT,
    "externalPostId" TEXT,
    "correlationId" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "status" "SyncJobStatus" NOT NULL DEFAULT 'PENDING',
    "failureCode" "AnalyticsSyncFailureCode",
    "lastError" TEXT,
    "nextAttemptAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsSyncJob_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "AnalyticsProviderMapping" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "mapping" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsProviderMapping_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "ContentIntelligenceProfile" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "contentAssetId" TEXT NOT NULL,
    "contentVariantId" TEXT,
    "language" TEXT NOT NULL,
    "durationSeconds" DECIMAL(10,2),
    "aspectRatio" TEXT,
    "contentFormat" "PublishingFormat",
    "hookType" "HookType",
    "scriptStructure" "ScriptStructureType",
    "callToActionType" "CallToActionType",
    "visualStyle" TEXT,
    "voiceStyle" TEXT,
    "pacing" TEXT,
    "sentiment" TEXT,
    "productMentionCount" INTEGER NOT NULL DEFAULT 0,
    "affiliateDisclosurePresent" BOOLEAN NOT NULL DEFAULT false,
    "subtitlePresent" BOOLEAN NOT NULL DEFAULT false,
    "faceVisible" BOOLEAN,
    "avatarUsed" BOOLEAN,
    "analysisSource" "AnalysisSource" NOT NULL,
    "modelReference" TEXT,
    "confidenceScore" DECIMAL(4,3),
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supersededByProfileId" TEXT,

    CONSTRAINT "ContentIntelligenceProfile_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "ContentVariant" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "parentContentAssetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "ContentVariantStatus" NOT NULL DEFAULT 'DRAFT',
    "hookText" TEXT,
    "scriptText" TEXT,
    "captionText" TEXT,
    "titleText" TEXT,
    "callToActionText" TEXT,
    "mediaAssetId" TEXT,
    "thumbnailAssetId" TEXT,
    "voiceAssetId" TEXT,
    "generatedBy" "GeneratedBy" NOT NULL DEFAULT 'HUMAN',
    "sourceVariantId" TEXT,
    "generationPromptReferenceId" TEXT,
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentVariant_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "ContentPerformanceSnapshot" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "contentAssetId" TEXT NOT NULL,
    "contentVariantId" TEXT,
    "platform" "SocialPlatform",
    "socialAccountId" TEXT,
    "brandId" TEXT,
    "nicheId" TEXT,
    "productId" TEXT,
    "campaignId" TEXT,
    "periodStart" TIMESTAMPTZ(6) NOT NULL,
    "periodEnd" TIMESTAMPTZ(6) NOT NULL,
    "impressions" BIGINT NOT NULL DEFAULT 0,
    "views" BIGINT NOT NULL DEFAULT 0,
    "engagements" BIGINT NOT NULL DEFAULT 0,
    "linkClicks" BIGINT NOT NULL DEFAULT 0,
    "conversions" BIGINT NOT NULL DEFAULT 0,
    "grossRevenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "commissionRevenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "attributedCosts" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "estimatedNetRevenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "engagementRate" DECIMAL(6,4),
    "clickThroughRate" DECIMAL(6,4),
    "conversionRate" DECIMAL(6,4),
    "completionRate" DECIMAL(6,4),
    "revenuePerView" DECIMAL(14,4),
    "revenuePerClick" DECIMAL(14,4),
    "revenuePerPost" DECIMAL(14,4),
    "returnOnContentSpend" DECIMAL(10,4),
    "sampleSize" BIGINT NOT NULL DEFAULT 0,
    "formulaVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentPerformanceSnapshot_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "ProductPerformanceSnapshot" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "brandId" TEXT,
    "nicheId" TEXT,
    "periodStart" TIMESTAMPTZ(6) NOT NULL,
    "periodEnd" TIMESTAMPTZ(6) NOT NULL,
    "publishedPostCount" INTEGER NOT NULL DEFAULT 0,
    "impressions" BIGINT NOT NULL DEFAULT 0,
    "views" BIGINT NOT NULL DEFAULT 0,
    "affiliateClicks" BIGINT NOT NULL DEFAULT 0,
    "conversions" BIGINT NOT NULL DEFAULT 0,
    "grossRevenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "commissionRevenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "attributedCosts" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "estimatedNetRevenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "clickThroughRate" DECIMAL(6,4),
    "conversionRate" DECIMAL(6,4),
    "returnOnContentSpend" DECIMAL(10,4),
    "refundRate" DECIMAL(6,4),
    "chargebackRate" DECIMAL(6,4),
    "dataQualityScore" DECIMAL(4,3) NOT NULL DEFAULT 0,
    "formulaVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductPerformanceSnapshot_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "PostingTimePerformance" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "weekday" INTEGER NOT NULL,
    "hourOfDay" INTEGER NOT NULL,
    "timezone" TEXT NOT NULL,
    "postCount" INTEGER NOT NULL DEFAULT 0,
    "impressions" BIGINT NOT NULL DEFAULT 0,
    "views" BIGINT NOT NULL DEFAULT 0,
    "linkClicks" BIGINT NOT NULL DEFAULT 0,
    "conversions" BIGINT NOT NULL DEFAULT 0,
    "commissionRevenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "engagementRate" DECIMAL(6,4),
    "clickThroughRate" DECIMAL(6,4),
    "conversionRate" DECIMAL(6,4),
    "sampleSize" BIGINT NOT NULL DEFAULT 0,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostingTimePerformance_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "ContentExperiment" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "experimentType" "ExperimentType" NOT NULL,
    "status" "ExperimentStatus" NOT NULL DEFAULT 'DRAFT',
    "primaryMetric" "ExperimentMetric" NOT NULL,
    "secondaryMetrics" "ExperimentMetric"[],
    "minimumSampleSize" INTEGER NOT NULL,
    "minimumRuntimeHours" INTEGER NOT NULL,
    "maximumRuntimeHours" INTEGER NOT NULL,
    "confidenceThreshold" DECIMAL(4,3) NOT NULL,
    "practicalSignificanceThreshold" DECIMAL(14,4) NOT NULL,
    "trafficAllocationMode" "TrafficAllocationMode" NOT NULL DEFAULT 'EQUAL',
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'DRAFT',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentExperiment_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "ExperimentVariant" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "contentVariantId" TEXT,
    "publishingConfigurationId" TEXT,
    "name" TEXT NOT NULL,
    "isControl" BOOLEAN NOT NULL DEFAULT false,
    "trafficWeight" INTEGER NOT NULL,
    "status" "ExperimentVariantStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExperimentVariant_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "ExperimentAssignment" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "experimentVariantId" TEXT NOT NULL,
    "assignmentKey" TEXT NOT NULL,
    "assignmentType" "ExperimentAssignmentType" NOT NULL,
    "assignmentReferenceId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExperimentAssignment_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "ExperimentResult" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ExperimentResultStatus" NOT NULL,
    "winningVariantId" TEXT,
    "primaryMetric" "ExperimentMetric" NOT NULL,
    "controlValue" DECIMAL(14,4),
    "winningValue" DECIMAL(14,4),
    "relativeLift" DECIMAL(10,4),
    "absoluteLift" DECIMAL(14,4),
    "sampleSize" BIGINT NOT NULL DEFAULT 0,
    "confidenceScore" DECIMAL(4,3),
    "practicalSignificanceReached" BOOLEAN NOT NULL DEFAULT false,
    "analysisMethod" "AnalysisMethod" NOT NULL DEFAULT 'FREQUENTIST',
    "analysisVersion" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,

    CONSTRAINT "ExperimentResult_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "OptimizationRecommendation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "recommendationType" "RecommendationType" NOT NULL,
    "scopeType" "ScopeType" NOT NULL,
    "scopeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "confidenceScore" DECIMAL(4,3) NOT NULL,
    "expectedImpact" "ExpectedImpact" NOT NULL,
    "evidenceReferences" TEXT[],
    "minimumEvidenceCount" INTEGER NOT NULL,
    "sampleSize" BIGINT,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'GENERATED',
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "ruleId" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,

    CONSTRAINT "OptimizationRecommendation_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "OptimizationPolicy" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "scopeType" "ScopeType" NOT NULL,
    "scopeId" TEXT NOT NULL,
    "mode" "OptimizationMode" NOT NULL DEFAULT 'OBSERVE_ONLY',
    "minimumSampleSize" INTEGER NOT NULL,
    "minimumConfidenceScore" DECIMAL(4,3) NOT NULL,
    "maximumRecommendationsPerDay" INTEGER NOT NULL,
    "allowAiAnalysis" BOOLEAN NOT NULL DEFAULT false,
    "allowAiVariantDrafts" BOOLEAN NOT NULL DEFAULT false,
    "requireApprovalForExperiment" BOOLEAN NOT NULL DEFAULT true,
    "requireApprovalForVariantDraft" BOOLEAN NOT NULL DEFAULT true,
    "requireApprovalForScheduleChange" BOOLEAN NOT NULL DEFAULT true,
    "blockedRecommendationTypes" "RecommendationType"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptimizationPolicy_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "AudienceSegment" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "platform" "SocialPlatform",
    "countryCodes" TEXT[],
    "languageCodes" TEXT[],
    "interestTags" TEXT[],
    "behaviorTags" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AudienceSegment_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "DataQualityReport" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "scopeType" "DataQualityScope" NOT NULL,
    "scopeId" TEXT NOT NULL,
    "completenessScore" DECIMAL(4,3) NOT NULL,
    "consistencyScore" DECIMAL(4,3) NOT NULL,
    "freshnessScore" DECIMAL(4,3) NOT NULL,
    "attributionScore" DECIMAL(4,3) NOT NULL,
    "overallScore" DECIMAL(4,3) NOT NULL,
    "issueCount" INTEGER NOT NULL DEFAULT 0,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataQualityReport_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "DataQualityIssue" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "issueType" "DataQualityIssueType" NOT NULL,
    "severity" "AnomalySeverity" NOT NULL,
    "detail" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataQualityIssue_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "AnalyticsAnomaly" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "anomalyType" TEXT NOT NULL,
    "scopeType" "ScopeType" NOT NULL,
    "scopeId" TEXT NOT NULL,
    "severity" "AnomalySeverity" NOT NULL,
    "observedValue" DECIMAL(14,4),
    "expectedRangeMin" DECIMAL(14,4),
    "expectedRangeMax" DECIMAL(14,4),
    "explanation" TEXT NOT NULL,
    "evidenceReferences" TEXT[],
    "status" "AnomalyStatus" NOT NULL DEFAULT 'OPEN',
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "AnalyticsAnomaly_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "OptimizationRule" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "status" "OptimizationRuleStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptimizationRule_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "OptimizationRuleExecution" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recommendationIds" TEXT[],
    "evaluatedCount" INTEGER NOT NULL DEFAULT 0,
    "matchedCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OptimizationRuleExecution_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "Brand_workspaceId_idx" ON "Brand"("workspaceId");
-- CreateIndex
CREATE INDEX "Niche_workspaceId_idx" ON "Niche"("workspaceId");
-- CreateIndex
CREATE INDEX "ContentAsset_workspaceId_idx" ON "ContentAsset"("workspaceId");
-- CreateIndex
CREATE INDEX "ContentAsset_brandId_idx" ON "ContentAsset"("brandId");
-- CreateIndex
CREATE INDEX "ContentAsset_nicheId_idx" ON "ContentAsset"("nicheId");
-- CreateIndex
CREATE INDEX "AnalyticsEvent_workspaceId_occurredAt_idx" ON "AnalyticsEvent"("workspaceId", "occurredAt");
-- CreateIndex
CREATE INDEX "AnalyticsEvent_workspaceId_eventType_idx" ON "AnalyticsEvent"("workspaceId", "eventType");
-- CreateIndex
CREATE INDEX "AnalyticsEvent_contentAssetId_idx" ON "AnalyticsEvent"("contentAssetId");
-- CreateIndex
CREATE INDEX "AnalyticsEvent_experimentId_idx" ON "AnalyticsEvent"("experimentId");
-- CreateIndex
CREATE INDEX "AnalyticsEvent_externalPostId_idx" ON "AnalyticsEvent"("externalPostId");
-- CreateIndex
CREATE INDEX "PlatformMetricSnapshot_workspaceId_platform_idx" ON "PlatformMetricSnapshot"("workspaceId", "platform");
-- CreateIndex
CREATE INDEX "PlatformMetricSnapshot_socialAccountId_measuredAt_idx" ON "PlatformMetricSnapshot"("socialAccountId", "measuredAt");
-- CreateIndex
CREATE INDEX "PlatformMetricSnapshot_externalPostId_idx" ON "PlatformMetricSnapshot"("externalPostId");
-- CreateIndex
CREATE INDEX "AnalyticsSyncJob_status_nextAttemptAt_idx" ON "AnalyticsSyncJob"("status", "nextAttemptAt");
-- CreateIndex
CREATE INDEX "AnalyticsSyncJob_workspaceId_jobType_idx" ON "AnalyticsSyncJob"("workspaceId", "jobType");
-- CreateIndex
CREATE INDEX "AnalyticsSyncJob_socialAccountId_idx" ON "AnalyticsSyncJob"("socialAccountId");
-- CreateIndex
CREATE INDEX "AnalyticsProviderMapping_workspaceId_platform_idx" ON "AnalyticsProviderMapping"("workspaceId", "platform");
-- CreateIndex
CREATE INDEX "ContentIntelligenceProfile_workspaceId_contentAssetId_idx" ON "ContentIntelligenceProfile"("workspaceId", "contentAssetId");
-- CreateIndex
CREATE INDEX "ContentIntelligenceProfile_hookType_idx" ON "ContentIntelligenceProfile"("hookType");
-- CreateIndex
CREATE INDEX "ContentVariant_workspaceId_parentContentAssetId_idx" ON "ContentVariant"("workspaceId", "parentContentAssetId");
-- CreateIndex
CREATE INDEX "ContentVariant_status_idx" ON "ContentVariant"("status");
-- CreateIndex
CREATE INDEX "ContentPerformanceSnapshot_workspaceId_contentAssetId_idx" ON "ContentPerformanceSnapshot"("workspaceId", "contentAssetId");
-- CreateIndex
CREATE INDEX "ContentPerformanceSnapshot_periodStart_periodEnd_idx" ON "ContentPerformanceSnapshot"("periodStart", "periodEnd");
-- CreateIndex
CREATE INDEX "ProductPerformanceSnapshot_workspaceId_productId_idx" ON "ProductPerformanceSnapshot"("workspaceId", "productId");
-- CreateIndex
CREATE INDEX "ProductPerformanceSnapshot_periodStart_periodEnd_idx" ON "ProductPerformanceSnapshot"("periodStart", "periodEnd");
-- CreateIndex
CREATE INDEX "PostingTimePerformance_workspaceId_socialAccountId_idx" ON "PostingTimePerformance"("workspaceId", "socialAccountId");
-- CreateIndex
CREATE INDEX "ContentExperiment_workspaceId_status_idx" ON "ContentExperiment"("workspaceId", "status");
-- CreateIndex
CREATE INDEX "ContentExperiment_brandId_idx" ON "ContentExperiment"("brandId");
-- CreateIndex
CREATE INDEX "ExperimentVariant_experimentId_idx" ON "ExperimentVariant"("experimentId");
-- CreateIndex
CREATE INDEX "ExperimentAssignment_workspaceId_experimentId_idx" ON "ExperimentAssignment"("workspaceId", "experimentId");
-- CreateIndex
CREATE INDEX "ExperimentAssignment_assignmentReferenceId_idx" ON "ExperimentAssignment"("assignmentReferenceId");
-- CreateIndex
CREATE INDEX "ExperimentResult_experimentId_idx" ON "ExperimentResult"("experimentId");
-- CreateIndex
CREATE INDEX "OptimizationRecommendation_workspaceId_status_idx" ON "OptimizationRecommendation"("workspaceId", "status");
-- CreateIndex
CREATE INDEX "OptimizationRecommendation_recommendationType_scopeType_sco_idx" ON "OptimizationRecommendation"("recommendationType", "scopeType", "scopeId");
-- CreateIndex
CREATE INDEX "OptimizationPolicy_workspaceId_scopeType_scopeId_idx" ON "OptimizationPolicy"("workspaceId", "scopeType", "scopeId");
-- CreateIndex
CREATE INDEX "AudienceSegment_workspaceId_idx" ON "AudienceSegment"("workspaceId");
-- CreateIndex
CREATE INDEX "DataQualityReport_workspaceId_scopeType_scopeId_idx" ON "DataQualityReport"("workspaceId", "scopeType", "scopeId");
-- CreateIndex
CREATE INDEX "DataQualityIssue_reportId_idx" ON "DataQualityIssue"("reportId");
-- CreateIndex
CREATE INDEX "AnalyticsAnomaly_workspaceId_status_idx" ON "AnalyticsAnomaly"("workspaceId", "status");
-- CreateIndex
CREATE INDEX "AnalyticsAnomaly_scopeType_scopeId_idx" ON "AnalyticsAnomaly"("scopeType", "scopeId");
-- CreateIndex
CREATE INDEX "OptimizationRule_workspaceId_status_idx" ON "OptimizationRule"("workspaceId", "status");
-- CreateIndex
CREATE INDEX "OptimizationRuleExecution_workspaceId_ruleId_idx" ON "OptimizationRuleExecution"("workspaceId", "ruleId");
-- AddForeignKey
ALTER TABLE "ContentIntelligenceProfile" ADD CONSTRAINT "ContentIntelligenceProfile_contentAssetId_fkey" FOREIGN KEY ("contentAssetId") REFERENCES "ContentAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "ContentIntelligenceProfile" ADD CONSTRAINT "ContentIntelligenceProfile_contentVariantId_fkey" FOREIGN KEY ("contentVariantId") REFERENCES "ContentVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "ContentVariant" ADD CONSTRAINT "ContentVariant_parentContentAssetId_fkey" FOREIGN KEY ("parentContentAssetId") REFERENCES "ContentAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "ExperimentVariant" ADD CONSTRAINT "ExperimentVariant_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "ContentExperiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "ExperimentVariant" ADD CONSTRAINT "ExperimentVariant_contentVariantId_fkey" FOREIGN KEY ("contentVariantId") REFERENCES "ContentVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "ExperimentAssignment" ADD CONSTRAINT "ExperimentAssignment_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "ContentExperiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "ExperimentAssignment" ADD CONSTRAINT "ExperimentAssignment_experimentVariantId_fkey" FOREIGN KEY ("experimentVariantId") REFERENCES "ExperimentVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "ExperimentResult" ADD CONSTRAINT "ExperimentResult_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "ContentExperiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "DataQualityIssue" ADD CONSTRAINT "DataQualityIssue_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "DataQualityReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "OptimizationRuleExecution" ADD CONSTRAINT "OptimizationRuleExecution_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "OptimizationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
