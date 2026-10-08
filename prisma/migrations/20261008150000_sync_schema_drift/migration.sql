-- Schema drift sync (Audit 2026-10-08 P0-3).
-- Generated with `prisma migrate diff` from a database migrated to the previous head against
-- prisma/schema.prisma. New tables follow the existing workspaceId model; enabling RLS on them is
-- tracked separately (Phase 2 of the roadmap).

-- CreateEnum
CREATE TYPE "CreativeAngleType" AS ENUM ('problem_solution', 'product_demo', 'comparison', 'testimonial', 'before_after', 'tutorial', 'review', 'unboxing', 'listicle', 'story', 'authority', 'contrarian', 'urgency', 'benefit', 'faq', 'myth_busting');

-- CreateEnum
CREATE TYPE "CampaignObjective" AS ENUM ('traffic', 'affiliate_clicks', 'conversions', 'revenue', 'content_testing');

-- CreateEnum
CREATE TYPE "CampaignPrimaryMetric" AS ENUM ('views', 'clicks', 'ctr', 'conversions', 'conversion_rate', 'commission_revenue', 'estimated_net_revenue', 'return_on_content_spend');

-- CreateEnum
CREATE TYPE "CampaignRiskLevel" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "CampaignCandidateStatus" AS ENUM ('new', 'under_review', 'approved', 'rejected', 'expired', 'converted');

-- CreateEnum
CREATE TYPE "CampaignStrategyStatus" AS ENUM ('draft', 'under_review', 'approved', 'rejected', 'superseded', 'archived');

-- CreateEnum
CREATE TYPE "CampaignAudienceStatus" AS ENUM ('draft', 'approved', 'rejected', 'archived');

-- CreateEnum
CREATE TYPE "CreativeAngleStatus" AS ENUM ('draft', 'approved', 'rejected', 'archived');

-- CreateEnum
CREATE TYPE "CampaignHookPlanStatus" AS ENUM ('draft', 'ready', 'completed', 'archived');

-- CreateEnum
CREATE TYPE "CampaignScriptPlanStatus" AS ENUM ('draft', 'ready', 'completed', 'archived');

-- CreateEnum
CREATE TYPE "CampaignCallToActionPlanStatus" AS ENUM ('draft', 'approved', 'archived');

-- CreateEnum
CREATE TYPE "ContentBatchStatus" AS ENUM ('draft', 'planning', 'awaiting_approval', 'approved', 'in_production', 'quality_review', 'completed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "ContentBatchPriority" AS ENUM ('low', 'normal', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "ContentBatchItemStatus" AS ENUM ('planned', 'brief_ready', 'hook_ready', 'script_ready', 'production_ready', 'in_production', 'quality_review', 'approved', 'rejected', 'failed');

-- CreateEnum
CREATE TYPE "ProductionTaskType" AS ENUM ('research_validation', 'brief_creation', 'hook_creation', 'script_creation', 'caption_creation', 'cta_creation', 'disclosure_validation', 'visual_planning', 'voice_planning', 'media_generation', 'editing', 'subtitle_creation', 'thumbnail_creation', 'quality_assurance', 'compliance_review', 'final_approval', 'publishing_preparation');

-- CreateEnum
CREATE TYPE "ProductionTaskStatus" AS ENUM ('pending', 'ready', 'in_progress', 'waiting_for_approval', 'completed', 'failed', 'cancelled', 'skipped');

-- CreateEnum
CREATE TYPE "ProductionScheduleStatus" AS ENUM ('planned', 'confirmed', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "CampaignFactoryTemplateStatus" AS ENUM ('draft', 'active', 'archived');

-- CreateEnum
CREATE TYPE "CampaignFactoryRunStatus" AS ENUM ('queued', 'running', 'waiting_for_approval', 'completed', 'partially_completed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "CampaignQualityReportStatus" AS ENUM ('pending', 'passed', 'failed', 'manual_review');

-- CreateEnum
CREATE TYPE "CampaignQualityIssueSeverity" AS ENUM ('info', 'warning', 'error', 'critical');

-- CreateEnum
CREATE TYPE "CampaignQualityScopeType" AS ENUM ('workspace', 'brand', 'niche', 'campaign');

-- CreateEnum
CREATE TYPE "ProductionCapacityScopeType" AS ENUM ('workspace', 'agent', 'user', 'provider');

-- CreateEnum
CREATE TYPE "ProductionCapacityStatus" AS ENUM ('active', 'paused', 'archived');

-- CreateEnum
CREATE TYPE "MediaProviderType" AS ENUM ('mock', 'openai', 'google', 'anthropic', 'mistral', 'higgsfield', 'runway', 'luma', 'kling', 'pika', 'replicate', 'fal', 'elevenlabs', 'cartesia', 'playht', 'heygen', 'synthesia', 'custom');

-- CreateEnum
CREATE TYPE "MediaCapability" AS ENUM ('text_to_image', 'image_to_image', 'text_to_video', 'image_to_video', 'video_to_video', 'text_to_speech', 'voice_clone', 'voice_conversion', 'avatar_video', 'lip_sync', 'subtitle_generation', 'translation', 'background_removal', 'upscaling', 'frame_interpolation', 'thumbnail_generation', 'music_generation', 'sound_effect_generation');ULL DEFAULT CURRENT_TIMESTAMP,
    "qualityVersion" TEXT NOT NULL DEFAULT '1',

    CONSTRAINT "CampaignQualityReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignQualityIssue" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "reportId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "severity" "CampaignQualityIssueSeverity" NOT NULL,
    "message" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "evidenceReferences" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignQualityIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionCapacityProfile" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "name" TEXT NOT NULL,
    "scopeType" "ProductionCapacityScopeType" NOT NULL DEFAULT 'workspace',
    "scopeId" TEXT NOT NULL,
    "maximumConcurrentTasks" INTEGER NOT NULL DEFAULT 1,
    "maximumTasksPerDay" INTEGER,
    "maximumEstimatedMinutesPerDay" INTEGER,
    "allowedTaskTypes" "ProductionTaskType"[] DEFAULT ARRAY[]::"ProductionTaskType"[],
    "status" "ProductionCapacityStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionCapacityProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignProductionEstimate" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "campaignId" TEXT NOT NULL,
    "contentBatchId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "researchCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "scriptCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "mediaGenerationCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "editingCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "voiceCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "subtitleCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "thumbnailCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "qualityAssuranceCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "publishingPreparationCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalEstimatedCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "lowerBound" DECIMAL(12,2),
    "upperBound" DECIMAL(12,2),
    "assumptions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "confidenceScore" DECIMAL(3,2) NOT NULL DEFAULT 0.5,
    "estimationVersion" TEXT NOT NULL DEFAULT '1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignProductionEstimate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaProviderConfiguration" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "provider" "MediaProviderType" NOT NULL,
    "displayName" TEXT NOT NULL,
    "credentialReferenceId" TEXT,
    "status" "MediaProviderStatus" NOT NULL DEFAULT 'draft',
    "enabledCapabilities" "MediaCapability"[],
    "defaultModelId" TEXT,
    "fallbackProviderConfigurationId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "monthlySpendLimit" DECIMAL(12,2),
    "currency" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaProviderConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaModelDefinition" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "providerConfigurationId" TEXT NOT NULL,
    "externalModelId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "capability" "MediaCapability" NOT NULL,
    "status" "MediaModelStatus" NOT NULL DEFAULT 'active',
    "inputSchemaVersion" TEXT NOT NULL DEFAULT '1',
    "outputSchemaVersion" TEXT NOT NULL DEFAULT '1',
    "estimatedCostPerUnit" DECIMAL(12,4),
    "billingUnit" "MediaBillingUnit" NOT NULL DEFAULT 'unknown',
    "currency" TEXT,
    "commercialUseAllowed" BOOLEAN,
    "modelTermsReferenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_Tx" ON "MediaVariant"("workspaceId", "parentAssetId");

-- CreateIndex
CREATE INDEX "MediaQualityPolicy_workspaceId_scopeType_scopeId_idx" ON "MediaQualityPolicy"("workspaceId", "scopeType", "scopeId");

-- CreateIndex
CREATE INDEX "MediaQualityReport_workspaceId_assetId_idx" ON "MediaQualityReport"("workspaceId", "assetId");

-- CreateIndex
CREATE INDEX "MediaQualityReport_workspaceId_status_idx" ON "MediaQualityReport"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "MediaQualityIssue_workspaceId_mediaQualityReportId_idx" ON "MediaQualityIssue"("workspaceId", "mediaQualityReportId");

-- CreateIndex
CREATE INDEX "MediaRoutingDecision_workspaceId_capability_idx" ON "MediaRoutingDecision"("workspaceId", "capability");

-- CreateIndex
CREATE INDEX "MediaLicenseReference_workspaceId_status_idx" ON "MediaLicenseReference"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "DataQualityIssue_workspaceId_reportId_idx" ON "DataQualityIssue"("workspaceId", "reportId");

-- CreateIndex
CREATE INDEX "ExperimentVariant_workspaceId_experimentId_idx" ON "ExperimentVariant"("workspaceId", "experimentId");

