-- Workspace RLS policy completion.
--
-- Adds workspace-isolation policies for tables that have a direct
-- workspaceId column AND actually exist in the migrated database,
-- completing coverage started in 20260922050000_workspace_rls_policy_groundwork
-- (21 tables) with 33 more (54 total of 97 workspaceId-bearing models in
-- schema.prisma).
--
-- NOT covered here, and why:
-- - 43 workspaceId-bearing models in schema.prisma have NO corresponding
--   table in the migrated database at all (verified: 85 CREATE TABLE
--   statements exist across all migrations vs 126 models in schema.prisma
--   -- 41 models total, unrelated to workspaceId, have never been migrated;
--   43 of those happen to also declare workspaceId). This is a pre-existing
--   schema/migration drift bug, not something this migration can or should
--   paper over -- CREATE POLICY on a non-existent table/column fails
--   immediately. Tracked separately (see docs/audit, CarryOS Universe
--   program, UGC Phase 10 migration-drift finding); needs its own
--   schema-completion migration before RLS can cover them.
-- - ExperimentVariant, ExperimentResult, DataQualityIssue: no workspaceId
--   column, child records scoped via a parent FK -- needs a join-based
--   policy, tracked separately (see groundwork migration's header).
--
-- Same deferral as the groundwork migration: policies only, RLS is NOT
-- enabled/forced here. Most application code paths still use the plain
-- (non-transaction-scoped) Prisma client and have not been migrated to
-- withWorkspaceTransaction() yet -- enabling RLS before that migration
-- would break those paths outright. Enforcement remains gated on that
-- separate, larger application-code migration effort.

DROP POLICY IF EXISTS "AffiliateOffer_workspace_isolation" ON "AffiliateOffer";
CREATE POLICY "AffiliateOffer_workspace_isolation" ON "AffiliateOffer"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "AffiliateOfferSnapshot_workspace_isolation" ON "AffiliateOfferSnapshot";
CREATE POLICY "AffiliateOfferSnapshot_workspace_isolation" ON "AffiliateOfferSnapshot"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "AgentMemoryEntry_workspace_isolation" ON "AgentMemoryEntry";
CREATE POLICY "AgentMemoryEntry_workspace_isolation" ON "AgentMemoryEntry"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "AgentToolCall_workspace_isolation" ON "AgentToolCall";
CREATE POLICY "AgentToolCall_workspace_isolation" ON "AgentToolCall"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "AgentToolDefinition_workspace_isolation" ON "AgentToolDefinition";
CREATE POLICY "AgentToolDefinition_workspace_isolation" ON "AgentToolDefinition"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "AgentToolPolicy_workspace_isolation" ON "AgentToolPolicy";
CREATE POLICY "AgentToolPolicy_workspace_isolation" ON "AgentToolPolicy"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "Approval_workspace_isolation" ON "Approval";
CREATE POLICY "Approval_workspace_isolation" ON "Approval"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "BudgetPolicy_workspace_isolation" ON "BudgetPolicy";
CREATE POLICY "BudgetPolicy_workspace_isolation" ON "BudgetPolicy"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "ContentBrief_workspace_isolation" ON "ContentBrief";
CREATE POLICY "ContentBrief_workspace_isolation" ON "ContentBrief"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "ContentHook_workspace_isolation" ON "ContentHook";
CREATE POLICY "ContentHook_workspace_isolation" ON "ContentHook"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "CostReservation_workspace_isolation" ON "CostReservation";
CREATE POLICY "CostReservation_workspace_isolation" ON "CostReservation"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "Product_workspace_isolation" ON "Product";
CREATE POLICY "Product_workspace_isolation" ON "Product"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "ProductCategory_workspace_isolation" ON "ProductCategory";
CREATE POLICY "ProductCategory_workspace_isolation" ON "ProductCategory"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "ProductComplianceProfile_workspace_isolation" ON "ProductComplianceProfile";
CREATE POLICY "ProductComplianceProfile_workspace_isolation" ON "ProductComplianceProfile"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "ProductContentFitProfile_workspace_isolation" ON "ProductContentFitProfile";
CREATE POLICY "ProductContentFitProfile_workspace_isolation" ON "ProductContentFitProfile"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "ProductDataQualityIssue_workspace_isolation" ON "ProductDataQualityIssue";
CREATE POLICY "ProductDataQualityIssue_workspace_isolation" ON "ProductDataQualityIssue"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "ProductDataQualityReport_workspace_isolation" ON "ProductDataQualityReport";
CREATE POLICY "ProductDataQualityReport_workspace_isolation" ON "ProductDataQualityReport"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "ProductDiscoveryProviderRun_workspace_isolation" ON "ProductDiscoveryProviderRun";
CREATE POLICY "ProductDiscoveryProviderRun_workspace_isolation" ON "ProductDiscoveryProviderRun"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "ProductDiscoveryQuery_workspace_isolation" ON "ProductDiscoveryQuery";
CREATE POLICY "ProductDiscoveryQuery_workspace_isolation" ON "ProductDiscoveryQuery"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "ProductDiscoveryQueryVersion_workspace_isolation" ON "ProductDiscoveryQueryVersion";
CREATE POLICY "ProductDiscoveryQueryVersion_workspace_isolation" ON "ProductDiscoveryQueryVersion"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "ProductDiscoveryRun_workspace_isolation" ON "ProductDiscoveryRun";
CREATE POLICY "ProductDiscoveryRun_workspace_isolation" ON "ProductDiscoveryRun"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "ProductImportBatch_workspace_isolation" ON "ProductImportBatch";
CREATE POLICY "ProductImportBatch_workspace_isolation" ON "ProductImportBatch"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "ProductImportRow_workspace_isolation" ON "ProductImportRow";
CREATE POLICY "ProductImportRow_workspace_isolation" ON "ProductImportRow"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "ProductMatchCandidate_workspace_isolation" ON "ProductMatchCandidate";
CREATE POLICY "ProductMatchCandidate_workspace_isolation" ON "ProductMatchCandidate"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "ProductOpportunity_workspace_isolation" ON "ProductOpportunity";
CREATE POLICY "ProductOpportunity_workspace_isolation" ON "ProductOpportunity"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "ProductOpportunityScoreComponent_workspace_isolation" ON "ProductOpportunityScoreComponent";
CREATE POLICY "ProductOpportunityScoreComponent_workspace_isolation" ON "ProductOpportunityScoreComponent"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "ProductProfitabilityEstimate_workspace_isolation" ON "ProductProfitabilityEstimate";
CREATE POLICY "ProductProfitabilityEstimate_workspace_isolation" ON "ProductProfitabilityEstimate"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "ProductResearchJob_workspace_isolation" ON "ProductResearchJob";
CREATE POLICY "ProductResearchJob_workspace_isolation" ON "ProductResearchJob"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "ProductSourceConfiguration_workspace_isolation" ON "ProductSourceConfiguration";
CREATE POLICY "ProductSourceConfiguration_workspace_isolation" ON "ProductSourceConfiguration"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "WorkflowDefinition_workspace_isolation" ON "WorkflowDefinition";
CREATE POLICY "WorkflowDefinition_workspace_isolation" ON "WorkflowDefinition"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "WorkflowRun_workspace_isolation" ON "WorkflowRun";
CREATE POLICY "WorkflowRun_workspace_isolation" ON "WorkflowRun"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "WorkflowStepDefinition_workspace_isolation" ON "WorkflowStepDefinition";
CREATE POLICY "WorkflowStepDefinition_workspace_isolation" ON "WorkflowStepDefinition"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "WorkflowStepRun_workspace_isolation" ON "WorkflowStepRun";
CREATE POLICY "WorkflowStepRun_workspace_isolation" ON "WorkflowStepRun"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

-- DO NOT ENABLE/FORCE RLS in this migration.
-- See groundwork migration header + docs/audit for the activation gate.
