-- RLS policy coverage for remaining workspace-scoped tables.
-- Intentionally does NOT enable or FORCE RLS; activation is a separate gate.

DROP POLICY IF EXISTS "Product_workspace_isolation" ON "Product";
CREATE POLICY "Product_workspace_isolation" ON "Product"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "AffiliateProgram_workspace_isolation" ON "AffiliateProgram";
CREATE POLICY "AffiliateProgram_workspace_isolation" ON "AffiliateProgram"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "AffiliateLink_workspace_isolation" ON "AffiliateLink";
CREATE POLICY "AffiliateLink_workspace_isolation" ON "AffiliateLink"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "LinkClick_workspace_isolation" ON "LinkClick";
CREATE POLICY "LinkClick_workspace_isolation" ON "LinkClick"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "Campaign_workspace_isolation" ON "Campaign";
CREATE POLICY "Campaign_workspace_isolation" ON "Campaign"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "Script_workspace_isolation" ON "Script";
CREATE POLICY "Script_workspace_isolation" ON "Script"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "VideoJob_workspace_isolation" ON "VideoJob";
CREATE POLICY "VideoJob_workspace_isolation" ON "VideoJob"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "MediaAsset_workspace_isolation" ON "MediaAsset";
CREATE POLICY "MediaAsset_workspace_isolation" ON "MediaAsset"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "SocialAccount_workspace_isolation" ON "SocialAccount";
CREATE POLICY "SocialAccount_workspace_isolation" ON "SocialAccount"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "SocialPost_workspace_isolation" ON "SocialPost";
CREATE POLICY "SocialPost_workspace_isolation" ON "SocialPost"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "PublishJob_workspace_isolation" ON "PublishJob";
CREATE POLICY "PublishJob_workspace_isolation" ON "PublishJob"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "Revenue_workspace_isolation" ON "Revenue";
CREATE POLICY "Revenue_workspace_isolation" ON "Revenue"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "Expense_workspace_isolation" ON "Expense";
CREATE POLICY "Expense_workspace_isolation" ON "Expense"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "TaxSetting_workspace_isolation" ON "TaxSetting";
CREATE POLICY "TaxSetting_workspace_isolation" ON "TaxSetting"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "Integration_workspace_isolation" ON "Integration";
CREATE POLICY "Integration_workspace_isolation" ON "Integration"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "EncryptedCredential_workspace_isolation" ON "EncryptedCredential";
CREATE POLICY "EncryptedCredential_workspace_isolation" ON "EncryptedCredential"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "Agent_workspace_isolation" ON "Agent";
CREATE POLICY "Agent_workspace_isolation" ON "Agent"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "AgentRun_workspace_isolation" ON "AgentRun";
CREATE POLICY "AgentRun_workspace_isolation" ON "AgentRun"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "Automation_workspace_isolation" ON "Automation";
CREATE POLICY "Automation_workspace_isolation" ON "Automation"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "AutomationRun_workspace_isolation" ON "AutomationRun";
CREATE POLICY "AutomationRun_workspace_isolation" ON "AutomationRun"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "Notification_workspace_isolation" ON "Notification";
CREATE POLICY "Notification_workspace_isolation" ON "Notification"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "AuditLog_workspace_isolation" ON "AuditLog";
CREATE POLICY "AuditLog_workspace_isolation" ON "AuditLog"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "Approval_workspace_isolation" ON "Approval";
CREATE POLICY "Approval_workspace_isolation" ON "Approval"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "ProductCategory_workspace_isolation" ON "ProductCategory";
CREATE POLICY "ProductCategory_workspace_isolation" ON "ProductCategory"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "AffiliateOffer_workspace_isolation" ON "AffiliateOffer";
CREATE POLICY "AffiliateOffer_workspace_isolation" ON "AffiliateOffer"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "AffiliateOfferSnapshot_workspace_isolation" ON "AffiliateOfferSnapshot";
CREATE POLICY "AffiliateOfferSnapshot_workspace_isolation" ON "AffiliateOfferSnapshot"
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

DROP POLICY IF EXISTS "ProductDiscoveryProviderRun_workspace_isolation" ON "ProductDiscoveryProviderRun";
CREATE POLICY "ProductDiscoveryProviderRun_workspace_isolation" ON "ProductDiscoveryProviderRun"
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

DROP POLICY IF EXISTS "ProductComplianceProfile_workspace_isolation" ON "ProductComplianceProfile";
CREATE POLICY "ProductComplianceProfile_workspace_isolation" ON "ProductComplianceProfile"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "ProductContentFitProfile_workspace_isolation" ON "ProductContentFitProfile";
CREATE POLICY "ProductContentFitProfile_workspace_isolation" ON "ProductContentFitProfile"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "ProductProfitabilityEstimate_workspace_isolation" ON "ProductProfitabilityEstimate";
CREATE POLICY "ProductProfitabilityEstimate_workspace_isolation" ON "ProductProfitabilityEstimate"
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

DROP POLICY IF EXISTS "ProductDataQualityReport_workspace_isolation" ON "ProductDataQualityReport";
CREATE POLICY "ProductDataQualityReport_workspace_isolation" ON "ProductDataQualityReport"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "ProductDataQualityIssue_workspace_isolation" ON "ProductDataQualityIssue";
CREATE POLICY "ProductDataQualityIssue_workspace_isolation" ON "ProductDataQualityIssue"
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

DROP POLICY IF EXISTS "ContentBrief_workspace_isolation" ON "ContentBrief";
CREATE POLICY "ContentBrief_workspace_isolation" ON "ContentBrief"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "ContentHook_workspace_isolation" ON "ContentHook";
CREATE POLICY "ContentHook_workspace_isolation" ON "ContentHook"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "WorkflowDefinition_workspace_isolation" ON "WorkflowDefinition";
CREATE POLICY "WorkflowDefinition_workspace_isolation" ON "WorkflowDefinition"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "WorkflowStepDefinition_workspace_isolation" ON "WorkflowStepDefinition";
CREATE POLICY "WorkflowStepDefinition_workspace_isolation" ON "WorkflowStepDefinition"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "WorkflowRun_workspace_isolation" ON "WorkflowRun";
CREATE POLICY "WorkflowRun_workspace_isolation" ON "WorkflowRun"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "WorkflowStepRun_workspace_isolation" ON "WorkflowStepRun";
CREATE POLICY "WorkflowStepRun_workspace_isolation" ON "WorkflowStepRun"
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

DROP POLICY IF EXISTS "AgentToolCall_workspace_isolation" ON "AgentToolCall";
CREATE POLICY "AgentToolCall_workspace_isolation" ON "AgentToolCall"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "BudgetPolicy_workspace_isolation" ON "BudgetPolicy";
CREATE POLICY "BudgetPolicy_workspace_isolation" ON "BudgetPolicy"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "CostReservation_workspace_isolation" ON "CostReservation";
CREATE POLICY "CostReservation_workspace_isolation" ON "CostReservation"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "AgentMemoryEntry_workspace_isolation" ON "AgentMemoryEntry";
CREATE POLICY "AgentMemoryEntry_workspace_isolation" ON "AgentMemoryEntry"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "CampaignCandidate_workspace_isolation" ON "CampaignCandidate";
CREATE POLICY "CampaignCandidate_workspace_isolation" ON "CampaignCandidate"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "CampaignStrategy_workspace_isolation" ON "CampaignStrategy";
CREATE POLICY "CampaignStrategy_workspace_isolation" ON "CampaignStrategy"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "CampaignAudienceProfile_workspace_isolation" ON "CampaignAudienceProfile";
CREATE POLICY "CampaignAudienceProfile_workspace_isolation" ON "CampaignAudienceProfile"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "CreativeAngle_workspace_isolation" ON "CreativeAngle";
CREATE POLICY "CreativeAngle_workspace_isolation" ON "CreativeAngle"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "CampaignHookPlan_workspace_isolation" ON "CampaignHookPlan";
CREATE POLICY "CampaignHookPlan_workspace_isolation" ON "CampaignHookPlan"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "CampaignScriptPlan_workspace_isolation" ON "CampaignScriptPlan";
CREATE POLICY "CampaignScriptPlan_workspace_isolation" ON "CampaignScriptPlan"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "CampaignCallToActionPlan_workspace_isolation" ON "CampaignCallToActionPlan";
CREATE POLICY "CampaignCallToActionPlan_workspace_isolation" ON "CampaignCallToActionPlan"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "ContentBatch_workspace_isolation" ON "ContentBatch";
CREATE POLICY "ContentBatch_workspace_isolation" ON "ContentBatch"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "ContentBatchItem_workspace_isolation" ON "ContentBatchItem";
CREATE POLICY "ContentBatchItem_workspace_isolation" ON "ContentBatchItem"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "ProductionTask_workspace_isolation" ON "ProductionTask";
CREATE POLICY "ProductionTask_workspace_isolation" ON "ProductionTask"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "ProductionScheduleEntry_workspace_isolation" ON "ProductionScheduleEntry";
CREATE POLICY "ProductionScheduleEntry_workspace_isolation" ON "ProductionScheduleEntry"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "CampaignFactoryTemplate_workspace_isolation" ON "CampaignFactoryTemplate";
CREATE POLICY "CampaignFactoryTemplate_workspace_isolation" ON "CampaignFactoryTemplate"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "CampaignFactoryRun_workspace_isolation" ON "CampaignFactoryRun";
CREATE POLICY "CampaignFactoryRun_workspace_isolation" ON "CampaignFactoryRun"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "CampaignQualityPolicy_workspace_isolation" ON "CampaignQualityPolicy";
CREATE POLICY "CampaignQualityPolicy_workspace_isolation" ON "CampaignQualityPolicy"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "CampaignQualityReport_workspace_isolation" ON "CampaignQualityReport";
CREATE POLICY "CampaignQualityReport_workspace_isolation" ON "CampaignQualityReport"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "CampaignQualityIssue_workspace_isolation" ON "CampaignQualityIssue";
CREATE POLICY "CampaignQualityIssue_workspace_isolation" ON "CampaignQualityIssue"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "ProductionCapacityProfile_workspace_isolation" ON "ProductionCapacityProfile";
CREATE POLICY "ProductionCapacityProfile_workspace_isolation" ON "ProductionCapacityProfile"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "CampaignProductionEstimate_workspace_isolation" ON "CampaignProductionEstimate";
CREATE POLICY "CampaignProductionEstimate_workspace_isolation" ON "CampaignProductionEstimate"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "MediaProviderConfiguration_workspace_isolation" ON "MediaProviderConfiguration";
CREATE POLICY "MediaProviderConfiguration_workspace_isolation" ON "MediaProviderConfiguration"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "MediaModelDefinition_workspace_isolation" ON "MediaModelDefinition";
CREATE POLICY "MediaModelDefinition_workspace_isolation" ON "MediaModelDefinition"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "MediaProductionProject_workspace_isolation" ON "MediaProductionProject";
CREATE POLICY "MediaProductionProject_workspace_isolation" ON "MediaProductionProject"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "MediaProductionPlan_workspace_isolation" ON "MediaProductionPlan";
CREATE POLICY "MediaProductionPlan_workspace_isolation" ON "MediaProductionPlan"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "MediaScene_workspace_isolation" ON "MediaScene";
CREATE POLICY "MediaScene_workspace_isolation" ON "MediaScene"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "MediaPromptTemplate_workspace_isolation" ON "MediaPromptTemplate";
CREATE POLICY "MediaPromptTemplate_workspace_isolation" ON "MediaPromptTemplate"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "VoiceProfile_workspace_isolation" ON "VoiceProfile";
CREATE POLICY "VoiceProfile_workspace_isolation" ON "VoiceProfile"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "AvatarProfile_workspace_isolation" ON "AvatarProfile";
CREATE POLICY "AvatarProfile_workspace_isolation" ON "AvatarProfile"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "MediaConsentRecord_workspace_isolation" ON "MediaConsentRecord";
CREATE POLICY "MediaConsentRecord_workspace_isolation" ON "MediaConsentRecord"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "MediaGenerationJob_workspace_isolation" ON "MediaGenerationJob";
CREATE POLICY "MediaGenerationJob_workspace_isolation" ON "MediaGenerationJob"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "MediaGenerationAttempt_workspace_isolation" ON "MediaGenerationAttempt";
CREATE POLICY "MediaGenerationAttempt_workspace_isolation" ON "MediaGenerationAttempt"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "MediaAssetMetadata_workspace_isolation" ON "MediaAssetMetadata";
CREATE POLICY "MediaAssetMetadata_workspace_isolation" ON "MediaAssetMetadata"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "RenderSpecification_workspace_isolation" ON "RenderSpecification";
CREATE POLICY "RenderSpecification_workspace_isolation" ON "RenderSpecification"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "MediaTimeline_workspace_isolation" ON "MediaTimeline";
CREATE POLICY "MediaTimeline_workspace_isolation" ON "MediaTimeline"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "MediaTimelineTrack_workspace_isolation" ON "MediaTimelineTrack";
CREATE POLICY "MediaTimelineTrack_workspace_isolation" ON "MediaTimelineTrack"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "MediaTimelineClip_workspace_isolation" ON "MediaTimelineClip";
CREATE POLICY "MediaTimelineClip_workspace_isolation" ON "MediaTimelineClip"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "RenderJob_workspace_isolation" ON "RenderJob";
CREATE POLICY "RenderJob_workspace_isolation" ON "RenderJob"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "SubtitleTrack_workspace_isolation" ON "SubtitleTrack";
CREATE POLICY "SubtitleTrack_workspace_isolation" ON "SubtitleTrack"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "SubtitleCue_workspace_isolation" ON "SubtitleCue";
CREATE POLICY "SubtitleCue_workspace_isolation" ON "SubtitleCue"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "MediaVariant_workspace_isolation" ON "MediaVariant";
CREATE POLICY "MediaVariant_workspace_isolation" ON "MediaVariant"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "MediaQualityPolicy_workspace_isolation" ON "MediaQualityPolicy";
CREATE POLICY "MediaQualityPolicy_workspace_isolation" ON "MediaQualityPolicy"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "MediaQualityReport_workspace_isolation" ON "MediaQualityReport";
CREATE POLICY "MediaQualityReport_workspace_isolation" ON "MediaQualityReport"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "MediaQualityIssue_workspace_isolation" ON "MediaQualityIssue";
CREATE POLICY "MediaQualityIssue_workspace_isolation" ON "MediaQualityIssue"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "MediaRoutingDecision_workspace_isolation" ON "MediaRoutingDecision";
CREATE POLICY "MediaRoutingDecision_workspace_isolation" ON "MediaRoutingDecision"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "MediaLicenseReference_workspace_isolation" ON "MediaLicenseReference";
CREATE POLICY "MediaLicenseReference_workspace_isolation" ON "MediaLicenseReference"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

-- Workspace-leading indexes for tenant-filtered access.
CREATE INDEX IF NOT EXISTS "Script_workspaceId_status_idx" ON "Script" ("workspaceId", "status");
CREATE INDEX IF NOT EXISTS "Script_workspaceId_campaignId_idx" ON "Script" ("workspaceId", "campaignId");
CREATE INDEX IF NOT EXISTS "Revenue_workspaceId_date_idx" ON "Revenue" ("workspaceId", "date");
CREATE INDEX IF NOT EXISTS "Revenue_workspaceId_campaignId_idx" ON "Revenue" ("workspaceId", "campaignId");
CREATE INDEX IF NOT EXISTS "Expense_workspaceId_date_idx" ON "Expense" ("workspaceId", "date");
CREATE INDEX IF NOT EXISTS "Expense_workspaceId_campaignId_idx" ON "Expense" ("workspaceId", "campaignId");
CREATE INDEX IF NOT EXISTS "TaxSetting_workspaceId_idx" ON "TaxSetting" ("workspaceId");
CREATE INDEX IF NOT EXISTS "ExperimentVariant_workspaceId_experimentId_idx" ON "ExperimentVariant" ("workspaceId", "experimentId");
