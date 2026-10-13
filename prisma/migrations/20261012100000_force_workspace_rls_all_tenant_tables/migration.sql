-- CarryOS 200-test-customer gate: fail-closed workspace isolation for every Prisma model
-- that declares workspaceId. Additive only: no tables or data are dropped.
-- Runtime queries must use withWorkspaceTransaction(workspaceId, ...), which sets
-- app.current_workspace_id transaction-locally. A missing setting matches no rows.
-- User and Session are intentionally excluded: neither model declares workspaceId.
-- Generated from prisma/schema.prisma at 604157aa69bad6db6d929ba3f31222990bcc378e; table/model inventory count=124.

ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "Product";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "Product"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "ProductScore" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductScore" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "ProductScore";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "ProductScore"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "AffiliateProgram" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AffiliateProgram" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "AffiliateProgram";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "AffiliateProgram"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "AffiliateLink" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AffiliateLink" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "AffiliateLink";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "AffiliateLink"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "LinkClick" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LinkClick" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "LinkClick";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "LinkClick"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "Campaign" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Campaign" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "Campaign";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "Campaign"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "Script" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Script" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "Script";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "Script"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "ScriptVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ScriptVersion" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "ScriptVersion";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "ScriptVersion"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "VideoJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VideoJob" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "VideoJob";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "VideoJob"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "MediaAsset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MediaAsset" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "MediaAsset";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "MediaAsset"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "SocialAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SocialAccount" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "SocialAccount";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "SocialAccount"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "SocialPost" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SocialPost" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "SocialPost";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "SocialPost"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "PublishJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PublishJob" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "PublishJob";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "PublishJob"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "Revenue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Revenue" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "Revenue";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "Revenue"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "Expense" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Expense" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "Expense";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "Expense"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "TaxSetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TaxSetting" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "TaxSetting";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "TaxSetting"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "Integration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Integration" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "Integration";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "Integration"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "EncryptedCredential" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EncryptedCredential" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "EncryptedCredential";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "EncryptedCredential"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "Agent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Agent" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "Agent";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "Agent"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "AgentRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentRun" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "AgentRun";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "AgentRun"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "Automation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Automation" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "Automation";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "Automation"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "AutomationRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AutomationRun" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "AutomationRun";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "AutomationRun"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "Notification";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "Notification"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "ContactRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContactRequest" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "ContactRequest";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "ContactRequest"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "AuditLog";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "AuditLog"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "Approval" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Approval" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "Approval";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "Approval"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "Brand" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Brand" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "Brand";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "Brand"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "Niche" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Niche" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "Niche";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "Niche"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "ContentAsset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContentAsset" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "ContentAsset";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "ContentAsset"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "AnalyticsEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AnalyticsEvent" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "AnalyticsEvent";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "AnalyticsEvent"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "PlatformMetricSnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlatformMetricSnapshot" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "PlatformMetricSnapshot";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "PlatformMetricSnapshot"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "AnalyticsSyncJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AnalyticsSyncJob" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "AnalyticsSyncJob";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "AnalyticsSyncJob"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "AnalyticsProviderMapping" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AnalyticsProviderMapping" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "AnalyticsProviderMapping";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "AnalyticsProviderMapping"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "ContentIntelligenceProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContentIntelligenceProfile" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "ContentIntelligenceProfile";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "ContentIntelligenceProfile"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "ContentVariant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContentVariant" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "ContentVariant";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "ContentVariant"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "ContentPerformanceSnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContentPerformanceSnapshot" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "ContentPerformanceSnapshot";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "ContentPerformanceSnapshot"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "ProductPerformanceSnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductPerformanceSnapshot" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "ProductPerformanceSnapshot";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "ProductPerformanceSnapshot"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "PostingTimePerformance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PostingTimePerformance" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "PostingTimePerformance";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "PostingTimePerformance"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "ContentExperiment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContentExperiment" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "ContentExperiment";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "ContentExperiment"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "ExperimentVariant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExperimentVariant" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "ExperimentVariant";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "ExperimentVariant"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "ExperimentAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExperimentAssignment" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "ExperimentAssignment";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "ExperimentAssignment"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "ExperimentResult" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExperimentResult" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "ExperimentResult";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "ExperimentResult"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "OptimizationRecommendation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OptimizationRecommendation" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "OptimizationRecommendation";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "OptimizationRecommendation"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "OptimizationPolicy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OptimizationPolicy" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "OptimizationPolicy";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "OptimizationPolicy"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "AudienceSegment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AudienceSegment" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "AudienceSegment";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "AudienceSegment"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "DataQualityReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DataQualityReport" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "DataQualityReport";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "DataQualityReport"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "DataQualityIssue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DataQualityIssue" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "DataQualityIssue";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "DataQualityIssue"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "AnalyticsAnomaly" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AnalyticsAnomaly" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "AnalyticsAnomaly";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "AnalyticsAnomaly"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "OptimizationRule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OptimizationRule" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "OptimizationRule";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "OptimizationRule"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "OptimizationRuleExecution" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OptimizationRuleExecution" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "OptimizationRuleExecution";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "OptimizationRuleExecution"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "ProductCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductCategory" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "ProductCategory";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "ProductCategory"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "AffiliateOffer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AffiliateOffer" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "AffiliateOffer";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "AffiliateOffer"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "AffiliateOfferSnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AffiliateOfferSnapshot" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "AffiliateOfferSnapshot";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "AffiliateOfferSnapshot"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "ProductDiscoveryQuery" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductDiscoveryQuery" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "ProductDiscoveryQuery";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "ProductDiscoveryQuery"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "ProductDiscoveryQueryVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductDiscoveryQueryVersion" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "ProductDiscoveryQueryVersion";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "ProductDiscoveryQueryVersion"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "ProductDiscoveryRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductDiscoveryRun" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "ProductDiscoveryRun";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "ProductDiscoveryRun"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "ProductDiscoveryProviderRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductDiscoveryProviderRun" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "ProductDiscoveryProviderRun";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "ProductDiscoveryProviderRun"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "ProductImportBatch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductImportBatch" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "ProductImportBatch";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "ProductImportBatch"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "ProductImportRow" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductImportRow" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "ProductImportRow";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "ProductImportRow"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "ProductMatchCandidate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductMatchCandidate" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "ProductMatchCandidate";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "ProductMatchCandidate"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "ProductComplianceProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductComplianceProfile" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "ProductComplianceProfile";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "ProductComplianceProfile"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "ProductContentFitProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductContentFitProfile" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "ProductContentFitProfile";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "ProductContentFitProfile"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "ProductProfitabilityEstimate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductProfitabilityEstimate" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "ProductProfitabilityEstimate";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "ProductProfitabilityEstimate"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "ProductOpportunity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductOpportunity" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "ProductOpportunity";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "ProductOpportunity"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "ProductOpportunityScoreComponent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductOpportunityScoreComponent" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "ProductOpportunityScoreComponent";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "ProductOpportunityScoreComponent"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "ProductDataQualityReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductDataQualityReport" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "ProductDataQualityReport";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "ProductDataQualityReport"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "ProductDataQualityIssue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductDataQualityIssue" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "ProductDataQualityIssue";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "ProductDataQualityIssue"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "ProductResearchJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductResearchJob" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "ProductResearchJob";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "ProductResearchJob"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "ProductSourceConfiguration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductSourceConfiguration" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "ProductSourceConfiguration";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "ProductSourceConfiguration"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "ContentBrief" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContentBrief" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "ContentBrief";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "ContentBrief"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "ContentHook" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContentHook" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "ContentHook";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "ContentHook"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "WorkflowDefinition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkflowDefinition" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "WorkflowDefinition";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "WorkflowDefinition"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "WorkflowStepDefinition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkflowStepDefinition" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "WorkflowStepDefinition";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "WorkflowStepDefinition"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "WorkflowRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkflowRun" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "WorkflowRun";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "WorkflowRun"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "WorkflowStepRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkflowStepRun" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "WorkflowStepRun";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "WorkflowStepRun"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "AgentToolDefinition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentToolDefinition" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "AgentToolDefinition";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "AgentToolDefinition"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "AgentToolPolicy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentToolPolicy" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "AgentToolPolicy";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "AgentToolPolicy"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "AgentToolCall" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentToolCall" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "AgentToolCall";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "AgentToolCall"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "BudgetPolicy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BudgetPolicy" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "BudgetPolicy";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "BudgetPolicy"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "CostReservation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CostReservation" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "CostReservation";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "CostReservation"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "AgentMemoryEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentMemoryEntry" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "AgentMemoryEntry";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "AgentMemoryEntry"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "CampaignCandidate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CampaignCandidate" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "CampaignCandidate";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "CampaignCandidate"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "CampaignStrategy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CampaignStrategy" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "CampaignStrategy";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "CampaignStrategy"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "CampaignAudienceProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CampaignAudienceProfile" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "CampaignAudienceProfile";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "CampaignAudienceProfile"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "CreativeAngle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CreativeAngle" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "CreativeAngle";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "CreativeAngle"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "CampaignHookPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CampaignHookPlan" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "CampaignHookPlan";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "CampaignHookPlan"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "CampaignScriptPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CampaignScriptPlan" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "CampaignScriptPlan";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "CampaignScriptPlan"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "CampaignCallToActionPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CampaignCallToActionPlan" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "CampaignCallToActionPlan";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "CampaignCallToActionPlan"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "ContentBatch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContentBatch" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "ContentBatch";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "ContentBatch"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "ContentBatchItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContentBatchItem" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "ContentBatchItem";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "ContentBatchItem"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "ProductionTask" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductionTask" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "ProductionTask";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "ProductionTask"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "ProductionScheduleEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductionScheduleEntry" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "ProductionScheduleEntry";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "ProductionScheduleEntry"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "CampaignFactoryTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CampaignFactoryTemplate" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "CampaignFactoryTemplate";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "CampaignFactoryTemplate"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "CampaignFactoryRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CampaignFactoryRun" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "CampaignFactoryRun";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "CampaignFactoryRun"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "CampaignQualityPolicy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CampaignQualityPolicy" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "CampaignQualityPolicy";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "CampaignQualityPolicy"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "CampaignQualityReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CampaignQualityReport" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "CampaignQualityReport";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "CampaignQualityReport"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "CampaignQualityIssue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CampaignQualityIssue" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "CampaignQualityIssue";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "CampaignQualityIssue"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "ProductionCapacityProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductionCapacityProfile" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "ProductionCapacityProfile";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "ProductionCapacityProfile"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "CampaignProductionEstimate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CampaignProductionEstimate" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "CampaignProductionEstimate";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "CampaignProductionEstimate"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "MediaProviderConfiguration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MediaProviderConfiguration" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "MediaProviderConfiguration";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "MediaProviderConfiguration"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "MediaModelDefinition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MediaModelDefinition" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "MediaModelDefinition";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "MediaModelDefinition"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "MediaProductionProject" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MediaProductionProject" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "MediaProductionProject";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "MediaProductionProject"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "MediaProductionPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MediaProductionPlan" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "MediaProductionPlan";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "MediaProductionPlan"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "MediaScene" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MediaScene" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "MediaScene";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "MediaScene"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "MediaPromptTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MediaPromptTemplate" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "MediaPromptTemplate";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "MediaPromptTemplate"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "VoiceProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VoiceProfile" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "VoiceProfile";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "VoiceProfile"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "AvatarProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AvatarProfile" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "AvatarProfile";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "AvatarProfile"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "MediaConsentRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MediaConsentRecord" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "MediaConsentRecord";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "MediaConsentRecord"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "MediaGenerationJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MediaGenerationJob" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "MediaGenerationJob";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "MediaGenerationJob"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "MediaGenerationAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MediaGenerationAttempt" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "MediaGenerationAttempt";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "MediaGenerationAttempt"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "MediaAssetMetadata" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MediaAssetMetadata" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "MediaAssetMetadata";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "MediaAssetMetadata"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "RenderSpecification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RenderSpecification" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "RenderSpecification";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "RenderSpecification"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "MediaTimeline" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MediaTimeline" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "MediaTimeline";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "MediaTimeline"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "MediaTimelineTrack" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MediaTimelineTrack" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "MediaTimelineTrack";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "MediaTimelineTrack"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "MediaTimelineClip" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MediaTimelineClip" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "MediaTimelineClip";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "MediaTimelineClip"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "RenderJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RenderJob" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "RenderJob";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "RenderJob"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "SubtitleTrack" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SubtitleTrack" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "SubtitleTrack";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "SubtitleTrack"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "SubtitleCue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SubtitleCue" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "SubtitleCue";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "SubtitleCue"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "MediaVariant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MediaVariant" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "MediaVariant";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "MediaVariant"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "MediaQualityPolicy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MediaQualityPolicy" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "MediaQualityPolicy";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "MediaQualityPolicy"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "MediaQualityReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MediaQualityReport" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "MediaQualityReport";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "MediaQualityReport"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "MediaQualityIssue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MediaQualityIssue" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "MediaQualityIssue";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "MediaQualityIssue"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "MediaRoutingDecision" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MediaRoutingDecision" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "MediaRoutingDecision";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "MediaRoutingDecision"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

ALTER TABLE "MediaLicenseReference" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MediaLicenseReference" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ugc_workspace_isolation_200_customer" ON "MediaLicenseReference";
CREATE POLICY "ugc_workspace_isolation_200_customer" ON "MediaLicenseReference"
  USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));
