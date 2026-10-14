-- Schema drift sync (Audit 2026-10-08 P0-3): ADDITIVE ONLY.
-- Generated with `prisma migrate diff` from a database migrated to the previous head against
-- prisma/schema.prisma, then filtered to additive statements. Intentionally NOT applied:
--   * DROP TABLE AgentCapability*/AgentCapacity*, DROP COLUMN on WorkflowDefinition/WorkflowStepRun
--     and the WorkflowRunStatus rewrite: these exist in earlier migrations (Phase 10 workflow engine)
--     but are missing from schema.prisma; the schema must catch up, data must not be dropped.
--   * SET DEFAULT on workspaceId columns: already established by 20261007232000.
-- New tables do not yet have RLS enabled (tracked separately in the roadmap, Phase 2).

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
CREATE TYPE "MediaCapability" AS ENUM ('text_to_image', 'image_to_image', 'text_to_video', 'image_to_video', 'video_to_video', 'text_to_speech', 'voice_clone', 'voice_conversion', 'avatar_video', 'lip_sync', 'subtitle_generation', 'translation', 'background_removal', 'upscaling', 'frame_interpolation', 'thumbnail_generation', 'music_generation', 'sound_effect_generation');

-- CreateEnum
CREATE TYPE "MediaProviderStatus" AS ENUM ('draft', 'active', 'paused', 'invalid', 'disconnected');

-- CreateEnum
CREATE TYPE "MediaBillingUnit" AS ENUM ('request', 'second', 'minute', 'image', 'character', 'token', 'unknown');

-- CreateEnum
CREATE TYPE "MediaModelStatus" AS ENUM ('active', 'deprecated', 'disabled');

-- CreateEnum
CREATE TYPE "MediaProductionStatus" AS ENUM ('draft', 'planning', 'awaiting_approval', 'approved', 'in_production', 'quality_review', 'completed', 'failed', 'cancelled', 'archived');

-- CreateEnum
CREATE TYPE "MediaVisualStrategy" AS ENUM ('generated_video', 'avatar', 'product_demo', 'slideshow', 'mixed', 'template_based');

-- CreateEnum
CREATE TYPE "MediaVoiceStrategy" AS ENUM ('generated_voice', 'approved_cloned_voice', 'human_voice', 'no_voice');

-- CreateEnum
CREATE TYPE "MediaSubtitleStrategy" AS ENUM ('burned_in', 'sidecar', 'both', 'none');

-- CreateEnum
CREATE TYPE "MediaMusicStrategy" AS ENUM ('licensed_music', 'generated_music', 'no_music');

-- CreateEnum
CREATE TYPE "MediaSceneType" AS ENUM ('hook', 'problem', 'demonstration', 'benefit', 'proof', 'comparison', 'testimonial', 'cta', 'transition', 'other');

-- CreateEnum
CREATE TYPE "MediaSceneStatus" AS ENUM ('draft', 'ready', 'generating', 'completed', 'failed', 'approved');

-- CreateEnum
CREATE TYPE "MediaGenerationJobStatus" AS ENUM ('draft', 'awaiting_approval', 'approved', 'queued', 'submitted', 'processing', 'completed', 'failed', 'cancelled', 'expired');

-- CreateEnum
CREATE TYPE "MediaGenerationFailureCode" AS ENUM ('AUTHENTICATION_FAILED', 'REAUTH_REQUIRED', 'PROVIDER_DISABLED', 'MODEL_DISABLED', 'CAPABILITY_NOT_SUPPORTED', 'INVALID_INPUT', 'INVALID_ASSET', 'CONSENT_REQUIRED', 'CONSENT_EXPIRED', 'LICENSE_REQUIRED', 'CONTENT_REJECTED', 'SAFETY_POLICY_REJECTED', 'RATE_LIMITED', 'BUDGET_EXCEEDED', 'APPROVAL_REQUIRED', 'PROVIDER_UNAVAILABLE', 'NETWORK_ERROR', 'OUTPUT_INVALID', 'OUTPUT_MISSING', 'TIMEOUT', 'UNKNOWN_ERROR');

-- CreateEnum
CREATE TYPE "MediaAttemptStatus" AS ENUM ('submitted', 'processing', 'completed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "MediaAssetOrigin" AS ENUM ('uploaded', 'generated', 'rendered', 'derived', 'recorded', 'imported');

-- CreateEnum
CREATE TYPE "MediaAssetStatus" AS ENUM ('draft', 'pending_review', 'approved', 'rejected', 'archived');

-- CreateEnum
CREATE TYPE "MediaAssetQaStatus" AS ENUM ('pending', 'passed', 'failed', 'manual_review');

-- CreateEnum
CREATE TYPE "MediaRenderStatus" AS ENUM ('draft', 'awaiting_approval', 'approved', 'queued', 'processing', 'completed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "MediaSubtitleSource" AS ENUM ('manual', 'speech_to_text', 'script_alignment', 'translated');

-- CreateEnum
CREATE TYPE "MediaSubtitleStatus" AS ENUM ('draft', 'generated', 'reviewed', 'approved', 'archived');

-- CreateEnum
CREATE TYPE "MediaVariantCropStrategy" AS ENUM ('center', 'face_tracking', 'subject_tracking', 'manual', 'none');

-- CreateEnum
CREATE TYPE "MediaQualityStatus" AS ENUM ('pending', 'passed', 'failed', 'manual_review');

-- CreateEnum
CREATE TYPE "MediaQualityIssueSeverity" AS ENUM ('info', 'warning', 'error', 'critical');

-- CreateEnum
CREATE TYPE "MediaQualityScopeType" AS ENUM ('workspace', 'brand', 'campaign', 'platform');

-- CreateEnum
CREATE TYPE "MediaPromptTemplateStatus" AS ENUM ('draft', 'active', 'deprecated');

-- CreateEnum
CREATE TYPE "MediaVoiceProfileType" AS ENUM ('provider_voice', 'approved_cloned_voice', 'human_recording', 'synthetic_custom');

-- CreateEnum
CREATE TYPE "MediaGenderPresentation" AS ENUM ('female', 'male', 'neutral', 'unspecified');

-- CreateEnum
CREATE TYPE "MediaAvatarType" AS ENUM ('synthetic', 'licensed_stock', 'custom_with_consent', 'brand_character');

-- CreateEnum
CREATE TYPE "MediaConsentSubjectType" AS ENUM ('voice', 'likeness', 'avatar', 'recording');

-- CreateEnum
CREATE TYPE "MediaConsentStatus" AS ENUM ('active', 'expired', 'revoked', 'invalid');

-- CreateEnum
CREATE TYPE "MediaTimelineStatus" AS ENUM ('draft', 'approved', 'rendering', 'completed', 'superseded');

-- CreateEnum
CREATE TYPE "MediaTimelineTrackType" AS ENUM ('video', 'audio', 'voice', 'music', 'subtitle', 'overlay', 'transition');

-- CreateEnum
CREATE TYPE "MediaAudioAssetType" AS ENUM ('voice', 'music', 'sound_effect', 'ambient', 'mixed_track');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ApprovalResourceType" ADD VALUE 'campaign_candidate';
ALTER TYPE "ApprovalResourceType" ADD VALUE 'campaign_strategy';
ALTER TYPE "ApprovalResourceType" ADD VALUE 'creative_angle';
ALTER TYPE "ApprovalResourceType" ADD VALUE 'creative_brief';
ALTER TYPE "ApprovalResourceType" ADD VALUE 'content_batch';
ALTER TYPE "ApprovalResourceType" ADD VALUE 'production_task_override';
ALTER TYPE "ApprovalResourceType" ADD VALUE 'production_schedule_override';
ALTER TYPE "ApprovalResourceType" ADD VALUE 'campaign_quality_override';
ALTER TYPE "ApprovalResourceType" ADD VALUE 'campaign_production';
ALTER TYPE "ApprovalResourceType" ADD VALUE 'media_production_plan';
ALTER TYPE "ApprovalResourceType" ADD VALUE 'voice_profile';
ALTER TYPE "ApprovalResourceType" ADD VALUE 'avatar_profile';
ALTER TYPE "ApprovalResourceType" ADD VALUE 'consent_record';
ALTER TYPE "ApprovalResourceType" ADD VALUE 'media_generation_job';
ALTER TYPE "ApprovalResourceType" ADD VALUE 'render_specification';
ALTER TYPE "ApprovalResourceType" ADD VALUE 'media_timeline';
ALTER TYPE "ApprovalResourceType" ADD VALUE 'render_job';
ALTER TYPE "ApprovalResourceType" ADD VALUE 'subtitle_track';
ALTER TYPE "ApprovalResourceType" ADD VALUE 'media_asset';
ALTER TYPE "ApprovalResourceType" ADD VALUE 'media_variant';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ContentBriefStatus" ADD VALUE 'UNDER_REVIEW';
ALTER TYPE "ContentBriefStatus" ADD VALUE 'REJECTED';
ALTER TYPE "ContentBriefStatus" ADD VALUE 'SUPERSEDED';

-- CreateTable
CREATE TABLE "CampaignCandidate" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "productOpportunityId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "affiliateOfferId" TEXT NOT NULL,
    "affiliateProgramId" TEXT NOT NULL,
    "brandId" TEXT,
    "nicheId" TEXT,
    "status" "CampaignCandidateStatus" NOT NULL DEFAULT 'new',
    "opportunityScore" INTEGER NOT NULL DEFAULT 0,
    "opportunityConfidence" DECIMAL(4,3),
    "proposedObjective" "CampaignObjective",
    "targetPlatformCandidates" "SocialPlatform"[] DEFAULT ARRAY[]::"SocialPlatform"[],
    "targetCountryCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "languageCode" TEXT NOT NULL DEFAULT 'de',
    "estimatedCampaignCost" DECIMAL(12,2),
    "estimatedRevenuePerPost" DECIMAL(12,2),
    "currency" TEXT,
    "sourceScoreVersion" TEXT,
    "evidenceReferences" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignStrategy" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "campaignCandidateId" TEXT NOT NULL,
    "campaignId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "objective" "CampaignObjective" NOT NULL,
    "primarySuccessMetric" "CampaignPrimaryMetric" NOT NULL,
    "secondarySuccessMetrics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetPlatforms" "SocialPlatform"[] DEFAULT ARRAY[]::"SocialPlatform"[],
    "targetCountryCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "languageCode" TEXT NOT NULL DEFAULT 'de',
    "targetAudienceProfileId" TEXT,
    "campaignDurationDays" INTEGER,
    "plannedContentCount" INTEGER NOT NULL DEFAULT 1,
    "estimatedBudget" DECIMAL(12,2),
    "currency" TEXT,
    "riskLevel" "CampaignRiskLevel" NOT NULL DEFAULT 'low',
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "CampaignStrategyStatus" NOT NULL DEFAULT 'draft',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "supersededById" TEXT,
    "supersededAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignStrategy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignAudienceProfile" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "brandId" TEXT,
    "nicheId" TEXT,
    "languageCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "countryCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "demographicNotes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "interestTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "problemStatements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "desiredOutcomes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "objections" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "trustSignals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "prohibitedTargetingAttributes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "CampaignAudienceStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignAudienceProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreativeAngle" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "campaignStrategyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "angleType" "CreativeAngleType" NOT NULL,
    "description" TEXT NOT NULL,
    "targetProblem" TEXT,
    "desiredOutcome" TEXT,
    "coreMessage" TEXT NOT NULL,
    "proofStrategy" TEXT,
    "objectionHandled" TEXT,
    "suitablePlatforms" "SocialPlatform"[] DEFAULT ARRAY[]::"SocialPlatform"[],
    "suitableFormats" "PublishingFormat"[] DEFAULT ARRAY[]::"PublishingFormat"[],
    "recommendedHookTypes" "HookType"[] DEFAULT ARRAY[]::"HookType"[],
    "recommendedScriptStructures" "ScriptStructureType"[] DEFAULT ARRAY[]::"ScriptStructureType"[],
    "riskLevel" "CampaignRiskLevel" NOT NULL DEFAULT 'low',
    "status" "CreativeAngleStatus" NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreativeAngle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignHookPlan" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "creativeBriefId" TEXT NOT NULL,
    "creativeAngleId" TEXT NOT NULL,
    "requiredHookCount" INTEGER NOT NULL DEFAULT 1,
    "selectedHookTypes" "HookType"[] DEFAULT ARRAY[]::"HookType"[],
    "hookObjectives" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "prohibitedPatterns" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "CampaignHookPlanStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignHookPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignScriptPlan" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "creativeBriefId" TEXT NOT NULL,
    "creativeAngleId" TEXT NOT NULL,
    "selectedStructure" "ScriptStructureType" NOT NULL,
    "requiredScriptCount" INTEGER NOT NULL DEFAULT 1,
    "targetDurationSeconds" INTEGER,
    "requiredSections" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "prohibitedClaims" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requiredDisclosure" BOOLEAN NOT NULL DEFAULT false,
    "status" "CampaignScriptPlanStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignScriptPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignCallToActionPlan" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "creativeBriefId" TEXT NOT NULL,
    "primaryCtaType" "CallToActionType" NOT NULL,
    "secondaryCtaTypes" "CallToActionType"[] DEFAULT ARRAY[]::"CallToActionType"[],
    "requiredText" TEXT,
    "prohibitedTextPatterns" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "affiliateLinkRequired" BOOLEAN NOT NULL DEFAULT false,
    "status" "CampaignCallToActionPlanStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignCallToActionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentBatch" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "campaignId" TEXT NOT NULL,
    "campaignStrategyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "targetPlatforms" "SocialPlatform"[] DEFAULT ARRAY[]::"SocialPlatform"[],
    "plannedAssetCount" INTEGER NOT NULL DEFAULT 1,
    "status" "ContentBatchStatus" NOT NULL DEFAULT 'draft',
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'DRAFT',
    "estimatedCost" DECIMAL(12,2),
    "actualCost" DECIMAL(12,2),
    "currency" TEXT,
    "priority" "ContentBatchPriority" NOT NULL DEFAULT 'normal',
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ContentBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentBatchItem" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "contentBatchId" TEXT NOT NULL,
    "creativeBriefId" TEXT NOT NULL,
    "creativeAngleId" TEXT NOT NULL,
    "targetPlatform" "SocialPlatform" NOT NULL,
    "publishingFormat" "PublishingFormat" NOT NULL,
    "hookId" TEXT,
    "scriptId" TEXT,
    "contentVariantId" TEXT,
    "contentAssetId" TEXT,
    "status" "ContentBatchItemStatus" NOT NULL DEFAULT 'planned',
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentBatchItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionTask" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "contentBatchId" TEXT NOT NULL,
    "contentBatchItemId" TEXT,
    "taskType" "ProductionTaskType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProductionTaskStatus" NOT NULL DEFAULT 'pending',
    "assignedAgentDefinitionId" TEXT,
    "assignedUserId" TEXT,
    "dependsOnTaskIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requiredPermission" TEXT,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "estimatedCost" DECIMAL(12,2),
    "actualCost" DECIMAL(12,2),
    "currency" TEXT,
    "estimatedDurationMinutes" INTEGER,
    "dueAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "outputReferenceId" TEXT,
    "failureCode" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ProductionTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionScheduleEntry" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "productionTaskId" TEXT NOT NULL,
    "assignedAgentDefinitionId" TEXT,
    "assignedUserId" TEXT,
    "scheduledStartAt" TIMESTAMP(3) NOT NULL,
    "scheduledEndAt" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "status" "ProductionScheduleStatus" NOT NULL DEFAULT 'planned',
    "overrideReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionScheduleEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignFactoryTemplate" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "nicheId" TEXT,
    "brandId" TEXT,
    "objective" "CampaignObjective" NOT NULL,
    "defaultPlatforms" "SocialPlatform"[] DEFAULT ARRAY[]::"SocialPlatform"[],
    "defaultFormats" "PublishingFormat"[] DEFAULT ARRAY[]::"PublishingFormat"[],
    "defaultCreativeAngleTypes" "CreativeAngleType"[] DEFAULT ARRAY[]::"CreativeAngleType"[],
    "plannedContentCount" INTEGER NOT NULL DEFAULT 1,
    "taskTemplateDefinition" JSONB NOT NULL DEFAULT '{}',
    "status" "CampaignFactoryTemplateStatus" NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignFactoryTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignFactoryRun" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "templateId" TEXT,
    "campaignCandidateId" TEXT NOT NULL,
    "status" "CampaignFactoryRunStatus" NOT NULL DEFAULT 'queued',
    "campaignId" TEXT,
    "campaignStrategyId" TEXT,
    "contentBatchId" TEXT,
    "correlationId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failureCode" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignFactoryRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignQualityPolicy" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "scopeType" "CampaignQualityScopeType" NOT NULL DEFAULT 'workspace',
    "scopeId" TEXT NOT NULL,
    "minimumStrategyScore" DECIMAL(3,2) NOT NULL DEFAULT 0.6,
    "minimumAudienceScore" DECIMAL(3,2) NOT NULL DEFAULT 0.6,
    "minimumCreativeScore" DECIMAL(3,2) NOT NULL DEFAULT 0.6,
    "minimumCommercialScore" DECIMAL(3,2) NOT NULL DEFAULT 0.6,
    "minimumComplianceScore" DECIMAL(3,2) NOT NULL DEFAULT 0.6,
    "minimumDataQualityScore" DECIMAL(3,2) NOT NULL DEFAULT 0.6,
    "minimumProductionReadinessScore" DECIMAL(3,2) NOT NULL DEFAULT 0.6,
    "minimumOverallScore" DECIMAL(3,2) NOT NULL DEFAULT 0.6,
    "criticalIssueBlocksApproval" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignQualityPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignQualityReport" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "campaignId" TEXT NOT NULL,
    "campaignStrategyId" TEXT NOT NULL,
    "status" "CampaignQualityReportStatus" NOT NULL DEFAULT 'pending',
    "strategyScore" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "audienceScore" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "creativeScore" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "commercialScore" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "complianceScore" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "dataQualityScore" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "productionReadinessScore" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "overallScore" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaModelDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaProductionProject" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "campaignId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "contentBriefId" TEXT NOT NULL,
    "contentScriptId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "targetPlatforms" "SocialPlatform"[],
    "targetFormats" "PublishingFormat"[],
    "languageCode" TEXT NOT NULL DEFAULT 'de',
    "targetCountryCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "MediaProductionStatus" NOT NULL DEFAULT 'draft',
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'DRAFT',
    "productionPlanId" TEXT,
    "estimatedCost" DECIMAL(12,2),
    "actualCost" DECIMAL(12,2),
    "currency" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaProductionProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaProductionPlan" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "mediaProductionProjectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "visualStrategy" "MediaVisualStrategy" NOT NULL DEFAULT 'generated_video',
    "voiceStrategy" "MediaVoiceStrategy" NOT NULL DEFAULT 'generated_voice',
    "subtitleStrategy" "MediaSubtitleStrategy" NOT NULL DEFAULT 'burned_in',
    "musicStrategy" "MediaMusicStrategy" NOT NULL DEFAULT 'no_music',
    "estimatedDurationSeconds" INTEGER NOT NULL,
    "sceneCount" INTEGER NOT NULL,
    "targetAspectRatios" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetResolutions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "MediaProductionStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaProductionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaScene" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "mediaProductionPlanId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "scriptSegment" TEXT,
    "voiceText" TEXT,
    "durationSeconds" DECIMAL(10,3) NOT NULL,
    "sceneType" "MediaSceneType" NOT NULL DEFAULT 'other',
    "visualSourceType" TEXT NOT NULL DEFAULT 'generated_video',
    "sourceAssetId" TEXT,
    "generatedAssetId" TEXT,
    "voiceProfileId" TEXT,
    "avatarProfileId" TEXT,
    "promptTemplateId" TEXT,
    "promptVersion" INTEGER,
    "status" "MediaSceneStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaScene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaPromptTemplate" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "capability" "MediaCapability" NOT NULL,
    "providerType" "MediaProviderType",
    "templateText" TEXT NOT NULL,
    "negativePromptTemplate" TEXT,
    "inputSchema" JSONB NOT NULL DEFAULT '{}',
    "outputSchema" JSONB NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "MediaPromptTemplateStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaPromptTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceProfile" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "profileType" "MediaVoiceProfileType" NOT NULL,
    "providerConfigurationId" TEXT,
    "externalVoiceId" TEXT,
    "languageCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "genderPresentation" "MediaGenderPresentation" NOT NULL DEFAULT 'unspecified',
    "styleTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "consentRecordId" TEXT,
    "sourceAssetId" TEXT,
    "commercialUseAllowed" BOOLEAN,
    "status" "MediaProviderStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoiceProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvatarProfile" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "avatarType" "MediaAvatarType" NOT NULL,
    "providerConfigurationId" TEXT,
    "externalAvatarId" TEXT,
    "sourceAssetId" TEXT,
    "consentRecordId" TEXT,
    "licenseReferenceId" TEXT,
    "languageCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "styleTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "commercialUseAllowed" BOOLEAN,
    "status" "MediaProviderStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvatarProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaConsentRecord" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "subjectType" "MediaConsentSubjectType" NOT NULL,
    "subjectReference" TEXT NOT NULL,
    "consentScope" TEXT[],
    "allowedUseCases" TEXT[],
    "prohibitedUseCases" TEXT[],
    "commercialUseAllowed" BOOLEAN NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3),
    "evidenceAssetId" TEXT,
    "evidenceReference" TEXT,
    "status" "MediaConsentStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaGenerationJob" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "mediaProductionProjectId" TEXT NOT NULL,
    "mediaSceneId" TEXT,
    "capability" "MediaCapability" NOT NULL,
    "providerConfigurationId" TEXT NOT NULL,
    "modelDefinitionId" TEXT NOT NULL,
    "requestReferenceId" TEXT NOT NULL,
    "status" "MediaGenerationJobStatus" NOT NULL DEFAULT 'draft',
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'DRAFT',
    "idempotencyKey" TEXT NOT NULL,
    "externalJobId" TEXT,
    "estimatedCost" DECIMAL(12,2),
    "reservedCost" DECIMAL(12,2),
    "actualCost" DECIMAL(12,2),
    "currency" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "progressPercent" INTEGER,
    "failureCode" "MediaGenerationFailureCode",
    "failureReason" TEXT,
    "submittedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaGenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaGenerationAttempt" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "mediaGenerationJobId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "providerConfigurationId" TEXT NOT NULL,
    "modelDefinitionId" TEXT NOT NULL,
    "externalJobId" TEXT,
    "status" "MediaAttemptStatus" NOT NULL DEFAULT 'submitted',
    "estimatedCost" DECIMAL(12,2),
    "actualCost" DECIMAL(12,2),
    "currency" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "failureCode" "MediaGenerationFailureCode",
    "failureReason" TEXT,
    "outputAssetIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaGenerationAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAssetMetadata" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "mediaAssetId" TEXT NOT NULL,
    "origin" "MediaAssetOrigin" NOT NULL DEFAULT 'generated',
    "status" "MediaAssetStatus" NOT NULL DEFAULT 'draft',
    "qaStatus" "MediaAssetQaStatus" NOT NULL DEFAULT 'pending',
    "parentAssetId" TEXT,
    "providerConfigurationId" TEXT,
    "modelDefinitionId" TEXT,
    "promptTemplateId" TEXT,
    "promptVersion" INTEGER,
    "consentRecordId" TEXT,
    "licenseReferenceId" TEXT,
    "checksum" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "width" INTEGER,
    "height" INTEGER,
    "durationSeconds" DECIMAL(10,3),
    "frameRate" DECIMAL(6,3),
    "bitrate" BIGINT,
    "sampleRate" INTEGER,
    "channels" INTEGER,
    "codec" TEXT,
    "aspectRatio" TEXT,
    "languageCode" TEXT,
    "audioAssetType" "MediaAudioAssetType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAssetMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RenderSpecification" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "mediaProductionProjectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "frameRate" DECIMAL(6,3) NOT NULL,
    "durationSeconds" DECIMAL(10,3) NOT NULL,
    "videoCodec" TEXT NOT NULL,
    "audioCodec" TEXT NOT NULL,
    "containerFormat" TEXT NOT NULL,
    "backgroundColor" TEXT,
    "subtitleMode" "MediaSubtitleStrategy" NOT NULL DEFAULT 'burned_in',
    "loudnessTargetLufs" DECIMAL(6,2),
    "status" "MediaProductionStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RenderSpecification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaTimeline" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "mediaProductionProjectId" TEXT NOT NULL,
    "renderSpecificationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "durationSeconds" DECIMAL(10,3) NOT NULL,
    "status" "MediaTimelineStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaTimeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaTimelineTrack" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "mediaTimelineId" TEXT NOT NULL,
    "trackType" "MediaTimelineTrackType" NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaTimelineTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaTimelineClip" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "mediaTimelineTrackId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "startTimeSeconds" DECIMAL(10,3) NOT NULL,
    "endTimeSeconds" DECIMAL(10,3) NOT NULL,
    "sourceStartSeconds" DECIMAL(10,3),
    "sourceEndSeconds" DECIMAL(10,3),
    "volume" DECIMAL(4,2),
    "opacity" DECIMAL(4,2),
    "transform" JSONB,
    "effects" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaTimelineClip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RenderJob" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "mediaProductionProjectId" TEXT NOT NULL,
    "mediaTimelineId" TEXT NOT NULL,
    "renderSpecificationId" TEXT NOT NULL,
    "status" "MediaRenderStatus" NOT NULL DEFAULT 'draft',
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'DRAFT',
    "idempotencyKey" TEXT NOT NULL,
    "externalRenderId" TEXT,
    "estimatedCost" DECIMAL(12,2),
    "actualCost" DECIMAL(12,2),
    "currency" TEXT,
    "progressPercent" INTEGER,
    "outputAssetId" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "failureCode" TEXT,
    "failureReason" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RenderJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubtitleTrack" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "mediaProductionProjectId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "source" "MediaSubtitleSource" NOT NULL DEFAULT 'manual',
    "status" "MediaSubtitleStatus" NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubtitleTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubtitleCue" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "subtitleTrackId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "startTimeSeconds" DECIMAL(10,3) NOT NULL,
    "endTimeSeconds" DECIMAL(10,3) NOT NULL,
    "text" TEXT NOT NULL,
    "confidenceScore" DECIMAL(4,3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubtitleCue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaVariant" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "parentAssetId" TEXT NOT NULL,
    "platform" "SocialPlatform",
    "format" "PublishingFormat",
    "aspectRatio" TEXT NOT NULL,
    "resolution" TEXT NOT NULL,
    "durationSeconds" DECIMAL(10,3) NOT NULL,
    "cropStrategy" "MediaVariantCropStrategy" NOT NULL DEFAULT 'center',
    "subtitleMode" "MediaSubtitleStrategy" NOT NULL DEFAULT 'none',
    "outputAssetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaQualityPolicy" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "scopeType" "MediaQualityScopeType" NOT NULL DEFAULT 'workspace',
    "scopeId" TEXT NOT NULL DEFAULT 'global',
    "minimumTechnicalScore" DECIMAL(4,3) NOT NULL DEFAULT 0,
    "minimumAudioScore" DECIMAL(4,3) NOT NULL DEFAULT 0,
    "minimumVisualScore" DECIMAL(4,3) NOT NULL DEFAULT 0,
    "minimumContentScore" DECIMAL(4,3) NOT NULL DEFAULT 0,
    "minimumComplianceScore" DECIMAL(4,3) NOT NULL DEFAULT 0,
    "minimumOverallScore" DECIMAL(4,3) NOT NULL DEFAULT 0,
    "criticalIssueBlocksApproval" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaQualityPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaQualityReport" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "assetId" TEXT NOT NULL,
    "status" "MediaQualityStatus" NOT NULL DEFAULT 'pending',
    "technicalScore" DECIMAL(4,3) NOT NULL DEFAULT 0,
    "audioScore" DECIMAL(4,3) NOT NULL DEFAULT 0,
    "visualScore" DECIMAL(4,3) NOT NULL DEFAULT 0,
    "contentScore" DECIMAL(4,3) NOT NULL DEFAULT 0,
    "complianceScore" DECIMAL(4,3) NOT NULL DEFAULT 0,
    "overallScore" DECIMAL(4,3) NOT NULL DEFAULT 0,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "qualityVersion" TEXT NOT NULL DEFAULT '1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaQualityReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaQualityIssue" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "mediaQualityReportId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "severity" "MediaQualityIssueSeverity" NOT NULL DEFAULT 'warning',
    "message" TEXT NOT NULL,
    "timestampSeconds" DECIMAL(10,3),
    "evidenceReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaQualityIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaRoutingDecision" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "capability" "MediaCapability" NOT NULL,
    "selectedProviderConfigurationId" TEXT NOT NULL,
    "selectedModelDefinitionId" TEXT NOT NULL,
    "fallbackProviderConfigurationIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "explanation" TEXT NOT NULL,
    "evidenceReferences" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "estimatedCost" DECIMAL(12,2),
    "currency" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaRoutingDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaLicenseReference" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "name" TEXT NOT NULL,
    "licenseType" TEXT NOT NULL,
    "referenceUrl" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "status" "MediaConsentStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaLicenseReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CampaignCandidate_workspaceId_status_idx" ON "CampaignCandidate"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "CampaignCandidate_workspaceId_productOpportunityId_idx" ON "CampaignCandidate"("workspaceId", "productOpportunityId");

-- CreateIndex
CREATE INDEX "CampaignStrategy_workspaceId_status_idx" ON "CampaignStrategy"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "CampaignStrategy_workspaceId_campaignCandidateId_idx" ON "CampaignStrategy"("workspaceId", "campaignCandidateId");

-- CreateIndex
CREATE INDEX "CampaignAudienceProfile_workspaceId_status_idx" ON "CampaignAudienceProfile"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "CreativeAngle_workspaceId_status_idx" ON "CreativeAngle"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "CreativeAngle_workspaceId_campaignStrategyId_idx" ON "CreativeAngle"("workspaceId", "campaignStrategyId");

-- CreateIndex
CREATE INDEX "CampaignHookPlan_workspaceId_creativeBriefId_idx" ON "CampaignHookPlan"("workspaceId", "creativeBriefId");

-- CreateIndex
CREATE INDEX "CampaignScriptPlan_workspaceId_creativeBriefId_idx" ON "CampaignScriptPlan"("workspaceId", "creativeBriefId");

-- CreateIndex
CREATE INDEX "CampaignCallToActionPlan_workspaceId_creativeBriefId_idx" ON "CampaignCallToActionPlan"("workspaceId", "creativeBriefId");

-- CreateIndex
CREATE INDEX "ContentBatch_workspaceId_status_idx" ON "ContentBatch"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "ContentBatch_workspaceId_campaignId_idx" ON "ContentBatch"("workspaceId", "campaignId");

-- CreateIndex
CREATE INDEX "ContentBatchItem_workspaceId_contentBatchId_idx" ON "ContentBatchItem"("workspaceId", "contentBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentBatchItem_contentBatchId_orderIndex_key" ON "ContentBatchItem"("contentBatchId", "orderIndex");

-- CreateIndex
CREATE INDEX "ProductionTask_workspaceId_status_idx" ON "ProductionTask"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "ProductionTask_workspaceId_contentBatchId_idx" ON "ProductionTask"("workspaceId", "contentBatchId");

-- CreateIndex
CREATE INDEX "ProductionScheduleEntry_workspaceId_productionTaskId_idx" ON "ProductionScheduleEntry"("workspaceId", "productionTaskId");

-- CreateIndex
CREATE INDEX "CampaignFactoryTemplate_workspaceId_status_idx" ON "CampaignFactoryTemplate"("workspaceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignFactoryRun_idempotencyKey_key" ON "CampaignFactoryRun"("idempotencyKey");

-- CreateIndex
CREATE INDEX "CampaignFactoryRun_workspaceId_status_idx" ON "CampaignFactoryRun"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "CampaignFactoryRun_workspaceId_campaignCandidateId_idx" ON "CampaignFactoryRun"("workspaceId", "campaignCandidateId");

-- CreateIndex
CREATE INDEX "CampaignQualityPolicy_workspaceId_scopeType_scopeId_idx" ON "CampaignQualityPolicy"("workspaceId", "scopeType", "scopeId");

-- CreateIndex
CREATE INDEX "CampaignQualityReport_workspaceId_campaignId_idx" ON "CampaignQualityReport"("workspaceId", "campaignId");

-- CreateIndex
CREATE INDEX "CampaignQualityIssue_workspaceId_reportId_idx" ON "CampaignQualityIssue"("workspaceId", "reportId");

-- CreateIndex
CREATE INDEX "ProductionCapacityProfile_workspaceId_scopeType_scopeId_idx" ON "ProductionCapacityProfile"("workspaceId", "scopeType", "scopeId");

-- CreateIndex
CREATE INDEX "CampaignProductionEstimate_workspaceId_campaignId_idx" ON "CampaignProductionEstimate"("workspaceId", "campaignId");

-- CreateIndex
CREATE INDEX "MediaProviderConfiguration_workspaceId_provider_idx" ON "MediaProviderConfiguration"("workspaceId", "provider");

-- CreateIndex
CREATE INDEX "MediaProviderConfiguration_workspaceId_status_idx" ON "MediaProviderConfiguration"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "MediaModelDefinition_workspaceId_capability_idx" ON "MediaModelDefinition"("workspaceId", "capability");

-- CreateIndex
CREATE INDEX "MediaModelDefinition_workspaceId_providerConfigurationId_idx" ON "MediaModelDefinition"("workspaceId", "providerConfigurationId");

-- CreateIndex
CREATE INDEX "MediaProductionProject_workspaceId_status_idx" ON "MediaProductionProject"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "MediaProductionProject_workspaceId_campaignId_idx" ON "MediaProductionProject"("workspaceId", "campaignId");

-- CreateIndex
CREATE INDEX "MediaProductionProject_workspaceId_contentBriefId_idx" ON "MediaProductionProject"("workspaceId", "contentBriefId");

-- CreateIndex
CREATE INDEX "MediaProductionPlan_workspaceId_mediaProductionProjectId_idx" ON "MediaProductionPlan"("workspaceId", "mediaProductionProjectId");

-- CreateIndex
CREATE INDEX "MediaScene_workspaceId_mediaProductionPlanId_idx" ON "MediaScene"("workspaceId", "mediaProductionPlanId");

-- CreateIndex
CREATE INDEX "MediaScene_workspaceId_status_idx" ON "MediaScene"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "MediaPromptTemplate_workspaceId_capability_idx" ON "MediaPromptTemplate"("workspaceId", "capability");

-- CreateIndex
CREATE INDEX "VoiceProfile_workspaceId_status_idx" ON "VoiceProfile"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "AvatarProfile_workspaceId_status_idx" ON "AvatarProfile"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "MediaConsentRecord_workspaceId_status_idx" ON "MediaConsentRecord"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "MediaConsentRecord_workspaceId_subjectReference_idx" ON "MediaConsentRecord"("workspaceId", "subjectReference");

-- CreateIndex
CREATE UNIQUE INDEX "MediaGenerationJob_idempotencyKey_key" ON "MediaGenerationJob"("idempotencyKey");

-- CreateIndex
CREATE INDEX "MediaGenerationJob_workspaceId_status_idx" ON "MediaGenerationJob"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "MediaGenerationJob_workspaceId_mediaProductionProjectId_idx" ON "MediaGenerationJob"("workspaceId", "mediaProductionProjectId");

-- CreateIndex
CREATE INDEX "MediaGenerationJob_workspaceId_mediaSceneId_idx" ON "MediaGenerationJob"("workspaceId", "mediaSceneId");

-- CreateIndex
CREATE INDEX "MediaGenerationJob_workspaceId_idempotencyKey_idx" ON "MediaGenerationJob"("workspaceId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "MediaGenerationAttempt_workspaceId_mediaGenerationJobId_idx" ON "MediaGenerationAttempt"("workspaceId", "mediaGenerationJobId");

-- CreateIndex
CREATE INDEX "MediaAssetMetadata_workspaceId_mediaAssetId_idx" ON "MediaAssetMetadata"("workspaceId", "mediaAssetId");

-- CreateIndex
CREATE INDEX "MediaAssetMetadata_workspaceId_status_idx" ON "MediaAssetMetadata"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "RenderSpecification_workspaceId_mediaProductionProjectId_idx" ON "RenderSpecification"("workspaceId", "mediaProductionProjectId");

-- CreateIndex
CREATE INDEX "MediaTimeline_workspaceId_mediaProductionProjectId_idx" ON "MediaTimeline"("workspaceId", "mediaProductionProjectId");

-- CreateIndex
CREATE INDEX "MediaTimelineTrack_workspaceId_mediaTimelineId_idx" ON "MediaTimelineTrack"("workspaceId", "mediaTimelineId");

-- CreateIndex
CREATE INDEX "MediaTimelineClip_workspaceId_mediaTimelineTrackId_idx" ON "MediaTimelineClip"("workspaceId", "mediaTimelineTrackId");

-- CreateIndex
CREATE UNIQUE INDEX "RenderJob_idempotencyKey_key" ON "RenderJob"("idempotencyKey");

-- CreateIndex
CREATE INDEX "RenderJob_workspaceId_status_idx" ON "RenderJob"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "RenderJob_workspaceId_mediaProductionProjectId_idx" ON "RenderJob"("workspaceId", "mediaProductionProjectId");

-- CreateIndex
CREATE INDEX "RenderJob_workspaceId_idempotencyKey_idx" ON "RenderJob"("workspaceId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "SubtitleTrack_workspaceId_mediaProductionProjectId_idx" ON "SubtitleTrack"("workspaceId", "mediaProductionProjectId");

-- CreateIndex
CREATE INDEX "SubtitleCue_workspaceId_subtitleTrackId_idx" ON "SubtitleCue"("workspaceId", "subtitleTrackId");

-- CreateIndex
CREATE INDEX "MediaVariant_workspaceId_parentAssetId_idx" ON "MediaVariant"("workspaceId", "parentAssetId");

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
