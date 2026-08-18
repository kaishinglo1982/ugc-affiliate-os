-- Pre-existing schema/DB drift fix (additive, safe): the ApprovalResourceType
-- enum exists in schema.prisma with 24 values, but only 5 were ever added to
-- PostgreSQL by migrations (phase7_product_intelligence created 4,
-- phase10_tool_execution_gateway added agent_tool_invocation). Any Approval
-- row using one of the 19 missing values failed in production. Additive
-- ALTER TYPE ... ADD VALUE does not rewrite existing rows.

ALTER TYPE "ApprovalResourceType" ADD VALUE IF NOT EXISTS 'avatar_profile';
ALTER TYPE "ApprovalResourceType" ADD VALUE IF NOT EXISTS 'campaign_candidate';
ALTER TYPE "ApprovalResourceType" ADD VALUE IF NOT EXISTS 'campaign_production';
ALTER TYPE "ApprovalResourceType" ADD VALUE IF NOT EXISTS 'campaign_quality_override';
ALTER TYPE "ApprovalResourceType" ADD VALUE IF NOT EXISTS 'campaign_strategy';
ALTER TYPE "ApprovalResourceType" ADD VALUE IF NOT EXISTS 'consent_record';
ALTER TYPE "ApprovalResourceType" ADD VALUE IF NOT EXISTS 'content_batch';
ALTER TYPE "ApprovalResourceType" ADD VALUE IF NOT EXISTS 'creative_angle';
ALTER TYPE "ApprovalResourceType" ADD VALUE IF NOT EXISTS 'creative_brief';
ALTER TYPE "ApprovalResourceType" ADD VALUE IF NOT EXISTS 'media_asset';
ALTER TYPE "ApprovalResourceType" ADD VALUE IF NOT EXISTS 'media_generation_job';
ALTER TYPE "ApprovalResourceType" ADD VALUE IF NOT EXISTS 'media_production_plan';
ALTER TYPE "ApprovalResourceType" ADD VALUE IF NOT EXISTS 'media_timeline';
ALTER TYPE "ApprovalResourceType" ADD VALUE IF NOT EXISTS 'media_variant';
ALTER TYPE "ApprovalResourceType" ADD VALUE IF NOT EXISTS 'production_schedule_override';
ALTER TYPE "ApprovalResourceType" ADD VALUE IF NOT EXISTS 'production_task_override';
ALTER TYPE "ApprovalResourceType" ADD VALUE IF NOT EXISTS 'render_job';
ALTER TYPE "ApprovalResourceType" ADD VALUE IF NOT EXISTS 'render_specification';
ALTER TYPE "ApprovalResourceType" ADD VALUE IF NOT EXISTS 'subtitle_track';
ALTER TYPE "ApprovalResourceType" ADD VALUE IF NOT EXISTS 'voice_profile';