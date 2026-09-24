-- Scope tenant-owned unique identifiers by workspace.
DROP INDEX IF EXISTS "AnalyticsEvent_idempotencyKey_key";
CREATE UNIQUE INDEX "AnalyticsEvent_workspaceId_idempotencyKey_key"
  ON "AnalyticsEvent"("workspaceId", "idempotencyKey");

DROP INDEX IF EXISTS "AnalyticsSyncJob_idempotencyKey_key";
CREATE UNIQUE INDEX "AnalyticsSyncJob_workspaceId_idempotencyKey_key"
  ON "AnalyticsSyncJob"("workspaceId", "idempotencyKey");

DROP INDEX IF EXISTS "AnalyticsProviderMapping_platform_version_key";
CREATE UNIQUE INDEX "AnalyticsProviderMapping_workspaceId_platform_version_key"
  ON "AnalyticsProviderMapping"("workspaceId", "platform", "version");

DROP INDEX IF EXISTS "PostingTimePerformance_socialAccountId_weekday_hourOfDay_timezone_key";
CREATE UNIQUE INDEX "PostingTimePerformance_workspaceId_socialAccountId_weekday_hourOfDay_timezone_key"
  ON "PostingTimePerformance"("workspaceId", "socialAccountId", "weekday", "hourOfDay", "timezone");

DROP INDEX IF EXISTS "ExperimentAssignment_experimentId_assignmentKey_key";
CREATE UNIQUE INDEX "ExperimentAssignment_workspaceId_experimentId_assignmentKey_key"
  ON "ExperimentAssignment"("workspaceId", "experimentId", "assignmentKey");

DROP INDEX IF EXISTS "OptimizationRule_code_version_key";
CREATE UNIQUE INDEX "OptimizationRule_workspaceId_code_version_key"
  ON "OptimizationRule"("workspaceId", "code", "version");

DROP INDEX IF EXISTS "ProductDiscoveryRun_idempotencyKey_key";
CREATE UNIQUE INDEX "ProductDiscoveryRun_workspaceId_idempotencyKey_key"
  ON "ProductDiscoveryRun"("workspaceId", "idempotencyKey");

DROP INDEX IF EXISTS "ProductImportBatch_previewToken_key";
CREATE UNIQUE INDEX "ProductImportBatch_workspaceId_previewToken_key"
  ON "ProductImportBatch"("workspaceId", "previewToken");

DROP INDEX IF EXISTS "ProductResearchJob_idempotencyKey_key";
CREATE UNIQUE INDEX "ProductResearchJob_workspaceId_idempotencyKey_key"
  ON "ProductResearchJob"("workspaceId", "idempotencyKey");

DROP INDEX IF EXISTS "ContentBatchItem_contentBatchId_orderIndex_key";
CREATE UNIQUE INDEX "ContentBatchItem_workspaceId_contentBatchId_orderIndex_key"
  ON "ContentBatchItem"("workspaceId", "contentBatchId", "orderIndex");

DROP INDEX IF EXISTS "CampaignFactoryRun_idempotencyKey_key";
CREATE UNIQUE INDEX "CampaignFactoryRun_workspaceId_idempotencyKey_key"
  ON "CampaignFactoryRun"("workspaceId", "idempotencyKey");

DROP INDEX IF EXISTS "MediaGenerationJob_idempotencyKey_key";
CREATE UNIQUE INDEX "MediaGenerationJob_workspaceId_idempotencyKey_key"
  ON "MediaGenerationJob"("workspaceId", "idempotencyKey");

DROP INDEX IF EXISTS "RenderJob_idempotencyKey_key";
CREATE UNIQUE INDEX "RenderJob_workspaceId_idempotencyKey_key"
  ON "RenderJob"("workspaceId", "idempotencyKey");
