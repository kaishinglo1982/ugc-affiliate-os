-- Workspace RLS policy groundwork.
-- ExperimentVariant was introduced without workspace ownership in the legacy Phase 6 migration.
-- Backfill the legacy default before creating its workspace isolation policy.
--
-- Policies are created before RLS is enabled so application code can be migrated
-- to transaction-bound workspace context without a partial production cutover.
-- Enforcement is intentionally deferred to the dedicated RLS activation gate.

ALTER TABLE "ExperimentVariant" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "ExperimentVariant" ALTER COLUMN "workspaceId" DROP DEFAULT;
CREATE INDEX "ExperimentVariant_workspaceId_idx" ON "ExperimentVariant"("workspaceId");

CREATE OR REPLACE FUNCTION current_workspace_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_workspace_id', true), '')
$$;

DROP POLICY IF EXISTS "Brand_workspace_isolation" ON "Brand";
CREATE POLICY "Brand_workspace_isolation" ON "Brand"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "Niche_workspace_isolation" ON "Niche";
CREATE POLICY "Niche_workspace_isolation" ON "Niche"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "ContentAsset_workspace_isolation" ON "ContentAsset";
CREATE POLICY "ContentAsset_workspace_isolation" ON "ContentAsset"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "AnalyticsEvent_workspace_isolation" ON "AnalyticsEvent";
CREATE POLICY "AnalyticsEvent_workspace_isolation" ON "AnalyticsEvent"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "PlatformMetricSnapshot_workspace_isolation" ON "PlatformMetricSnapshot";
CREATE POLICY "PlatformMetricSnapshot_workspace_isolation" ON "PlatformMetricSnapshot"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "AnalyticsSyncJob_workspace_isolation" ON "AnalyticsSyncJob";
CREATE POLICY "AnalyticsSyncJob_workspace_isolation" ON "AnalyticsSyncJob"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "AnalyticsProviderMapping_workspace_isolation" ON "AnalyticsProviderMapping";
CREATE POLICY "AnalyticsProviderMapping_workspace_isolation" ON "AnalyticsProviderMapping"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "ContentIntelligenceProfile_workspace_isolation" ON "ContentIntelligenceProfile";
CREATE POLICY "ContentIntelligenceProfile_workspace_isolation" ON "ContentIntelligenceProfile"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "ContentVariant_workspace_isolation" ON "ContentVariant";
CREATE POLICY "ContentVariant_workspace_isolation" ON "ContentVariant"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "ContentPerformanceSnapshot_workspace_isolation" ON "ContentPerformanceSnapshot";
CREATE POLICY "ContentPerformanceSnapshot_workspace_isolation" ON "ContentPerformanceSnapshot"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "ProductPerformanceSnapshot_workspace_isolation" ON "ProductPerformanceSnapshot";
CREATE POLICY "ProductPerformanceSnapshot_workspace_isolation" ON "ProductPerformanceSnapshot"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "PostingTimePerformance_workspace_isolation" ON "PostingTimePerformance";
CREATE POLICY "PostingTimePerformance_workspace_isolation" ON "PostingTimePerformance"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "ContentExperiment_workspace_isolation" ON "ContentExperiment";
CREATE POLICY "ContentExperiment_workspace_isolation" ON "ContentExperiment"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "ExperimentVariant_workspace_isolation" ON "ExperimentVariant";
CREATE POLICY "ExperimentVariant_workspace_isolation" ON "ExperimentVariant"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "ExperimentAssignment_workspace_isolation" ON "ExperimentAssignment";
CREATE POLICY "ExperimentAssignment_workspace_isolation" ON "ExperimentAssignment"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "ExperimentResult_workspace_isolation" ON "ExperimentResult";
CREATE POLICY "ExperimentResult_workspace_isolation" ON "ExperimentResult"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "OptimizationRecommendation_workspace_isolation" ON "OptimizationRecommendation";
CREATE POLICY "OptimizationRecommendation_workspace_isolation" ON "OptimizationRecommendation"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "OptimizationPolicy_workspace_isolation" ON "OptimizationPolicy";
CREATE POLICY "OptimizationPolicy_workspace_isolation" ON "OptimizationPolicy"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "AudienceSegment_workspace_isolation" ON "AudienceSegment";
CREATE POLICY "AudienceSegment_workspace_isolation" ON "AudienceSegment"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "DataQualityReport_workspace_isolation" ON "DataQualityReport";
CREATE POLICY "DataQualityReport_workspace_isolation" ON "DataQualityReport"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "DataQualityIssue_workspace_isolation" ON "DataQualityIssue";
CREATE POLICY "DataQualityIssue_workspace_isolation" ON "DataQualityIssue"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "AnalyticsAnomaly_workspace_isolation" ON "AnalyticsAnomaly";
CREATE POLICY "AnalyticsAnomaly_workspace_isolation" ON "AnalyticsAnomaly"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "OptimizationRule_workspace_isolation" ON "OptimizationRule";
CREATE POLICY "OptimizationRule_workspace_isolation" ON "OptimizationRule"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "OptimizationRuleExecution_workspace_isolation" ON "OptimizationRuleExecution";
CREATE POLICY "OptimizationRuleExecution_workspace_isolation" ON "OptimizationRuleExecution"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

-- DO NOT ENABLE/FORCE RLS in this migration.
-- The activation gate requires every production DB access path to establish
-- app.current_workspace_id inside a transaction first.