-- Phase 20: additive tenant-key migration for legacy domain tables.
-- The temporary default assigns existing single-tenant rows to the canonical
-- legacy workspace. A later Phase-20 migration removes these defaults after
-- every write path supplies workspaceId explicitly.

ALTER TABLE "ProductScore" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "AffiliateProgram" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "AffiliateLink" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "LinkClick" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "Campaign" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "Script" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "ScriptVersion" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "VideoJob" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "MediaAsset" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "SocialAccount" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "SocialPost" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "PublishJob" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "Revenue" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "Expense" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "TaxSetting" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "Integration" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "EncryptedCredential" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "Agent" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "AgentRun" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "Automation" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "AutomationRun" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "Notification" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "AuditLog" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "ExperimentVariant" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "ExperimentResult" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "DataQualityIssue" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

CREATE INDEX "ProductScore_workspaceId_idx" ON "ProductScore"("workspaceId");
CREATE INDEX "AffiliateProgram_workspaceId_idx" ON "AffiliateProgram"("workspaceId");
CREATE INDEX "AffiliateLink_workspaceId_idx" ON "AffiliateLink"("workspaceId");
CREATE INDEX "LinkClick_workspaceId_idx" ON "LinkClick"("workspaceId");
CREATE INDEX "Campaign_workspaceId_idx" ON "Campaign"("workspaceId");
CREATE INDEX "Script_workspaceId_idx" ON "Script"("workspaceId");
CREATE INDEX "ScriptVersion_workspaceId_idx" ON "ScriptVersion"("workspaceId");
CREATE INDEX "VideoJob_workspaceId_idx" ON "VideoJob"("workspaceId");
CREATE INDEX "MediaAsset_workspaceId_idx" ON "MediaAsset"("workspaceId");
CREATE INDEX "SocialAccount_workspaceId_idx" ON "SocialAccount"("workspaceId");
CREATE INDEX "SocialPost_workspaceId_idx" ON "SocialPost"("workspaceId");
CREATE INDEX "PublishJob_workspaceId_idx" ON "PublishJob"("workspaceId");
CREATE INDEX "Revenue_workspaceId_idx" ON "Revenue"("workspaceId");
CREATE INDEX "Expense_workspaceId_idx" ON "Expense"("workspaceId");
CREATE INDEX "TaxSetting_workspaceId_idx" ON "TaxSetting"("workspaceId");
CREATE INDEX "Integration_workspaceId_idx" ON "Integration"("workspaceId");
CREATE INDEX "EncryptedCredential_workspaceId_idx" ON "EncryptedCredential"("workspaceId");
CREATE INDEX "Agent_workspaceId_idx" ON "Agent"("workspaceId");
CREATE INDEX "AgentRun_workspaceId_idx" ON "AgentRun"("workspaceId");
CREATE INDEX "Automation_workspaceId_idx" ON "Automation"("workspaceId");
CREATE INDEX "AutomationRun_workspaceId_idx" ON "AutomationRun"("workspaceId");
CREATE INDEX "Notification_workspaceId_idx" ON "Notification"("workspaceId");
CREATE INDEX "AuditLog_workspaceId_idx" ON "AuditLog"("workspaceId");
CREATE INDEX "ExperimentVariant_workspaceId_idx" ON "ExperimentVariant"("workspaceId");
CREATE INDEX "ExperimentResult_workspaceId_idx" ON "ExperimentResult"("workspaceId");
CREATE INDEX "DataQualityIssue_workspaceId_idx" ON "DataQualityIssue"("workspaceId");
