-- CarryOS 200-test-customer tenant persistence activation for legacy UGC models.
-- Existing rows are conservatively backfilled to the legacy workspace; new rows must bind
-- to the transaction-local workspace and cannot rely on a schema default.

ALTER TABLE "ProductScore" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "ProductScore" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "ProductScore" ALTER COLUMN "workspaceId" SET DEFAULT COALESCE(current_workspace_id(), '00000000-0000-0000-0000-000000000001');
CREATE INDEX "ProductScore_workspaceId_idx" ON "ProductScore"("workspaceId");

ALTER TABLE "AffiliateProgram" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "AffiliateProgram" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "AffiliateProgram" ALTER COLUMN "workspaceId" SET DEFAULT COALESCE(current_workspace_id(), '00000000-0000-0000-0000-000000000001');
CREATE INDEX "AffiliateProgram_workspaceId_idx" ON "AffiliateProgram"("workspaceId");

ALTER TABLE "AffiliateLink" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "AffiliateLink" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "AffiliateLink" ALTER COLUMN "workspaceId" SET DEFAULT COALESCE(current_workspace_id(), '00000000-0000-0000-0000-000000000001');
CREATE INDEX "AffiliateLink_workspaceId_idx" ON "AffiliateLink"("workspaceId");

ALTER TABLE "LinkClick" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "LinkClick" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "LinkClick" ALTER COLUMN "workspaceId" SET DEFAULT COALESCE(current_workspace_id(), '00000000-0000-0000-0000-000000000001');
CREATE INDEX "LinkClick_workspaceId_idx" ON "LinkClick"("workspaceId");

ALTER TABLE "Campaign" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "Campaign" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "Campaign" ALTER COLUMN "workspaceId" SET DEFAULT COALESCE(current_workspace_id(), '00000000-0000-0000-0000-000000000001');
CREATE INDEX "Campaign_workspaceId_idx" ON "Campaign"("workspaceId");

ALTER TABLE "Script" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "Script" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "Script" ALTER COLUMN "workspaceId" SET DEFAULT COALESCE(current_workspace_id(), '00000000-0000-0000-0000-000000000001');
CREATE INDEX "Script_workspaceId_idx" ON "Script"("workspaceId");

ALTER TABLE "ScriptVersion" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "ScriptVersion" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "ScriptVersion" ALTER COLUMN "workspaceId" SET DEFAULT COALESCE(current_workspace_id(), '00000000-0000-0000-0000-000000000001');
CREATE INDEX "ScriptVersion_workspaceId_idx" ON "ScriptVersion"("workspaceId");

ALTER TABLE "VideoJob" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "VideoJob" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "VideoJob" ALTER COLUMN "workspaceId" SET DEFAULT COALESCE(current_workspace_id(), '00000000-0000-0000-0000-000000000001');
CREATE INDEX "VideoJob_workspaceId_idx" ON "VideoJob"("workspaceId");

ALTER TABLE "MediaAsset" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "MediaAsset" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "MediaAsset" ALTER COLUMN "workspaceId" SET DEFAULT COALESCE(current_workspace_id(), '00000000-0000-0000-0000-000000000001');
CREATE INDEX "MediaAsset_workspaceId_idx" ON "MediaAsset"("workspaceId");

ALTER TABLE "SocialAccount" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "SocialAccount" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "SocialAccount" ALTER COLUMN "workspaceId" SET DEFAULT COALESCE(current_workspace_id(), '00000000-0000-0000-0000-000000000001');
CREATE INDEX "SocialAccount_workspaceId_idx" ON "SocialAccount"("workspaceId");

ALTER TABLE "SocialPost" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "SocialPost" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "SocialPost" ALTER COLUMN "workspaceId" SET DEFAULT COALESCE(current_workspace_id(), '00000000-0000-0000-0000-000000000001');
CREATE INDEX "SocialPost_workspaceId_idx" ON "SocialPost"("workspaceId");

ALTER TABLE "PublishJob" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "PublishJob" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "PublishJob" ALTER COLUMN "workspaceId" SET DEFAULT COALESCE(current_workspace_id(), '00000000-0000-0000-0000-000000000001');
CREATE INDEX "PublishJob_workspaceId_idx" ON "PublishJob"("workspaceId");

ALTER TABLE "Revenue" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "Revenue" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "Revenue" ALTER COLUMN "workspaceId" SET DEFAULT COALESCE(current_workspace_id(), '00000000-0000-0000-0000-000000000001');
CREATE INDEX "Revenue_workspaceId_idx" ON "Revenue"("workspaceId");

ALTER TABLE "Expense" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "Expense" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "Expense" ALTER COLUMN "workspaceId" SET DEFAULT COALESCE(current_workspace_id(), '00000000-0000-0000-0000-000000000001');
CREATE INDEX "Expense_workspaceId_idx" ON "Expense"("workspaceId");

ALTER TABLE "TaxSetting" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "TaxSetting" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "TaxSetting" ALTER COLUMN "workspaceId" SET DEFAULT COALESCE(current_workspace_id(), '00000000-0000-0000-0000-000000000001');
CREATE INDEX "TaxSetting_workspaceId_idx" ON "TaxSetting"("workspaceId");

ALTER TABLE "Integration" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "Integration" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "Integration" ALTER COLUMN "workspaceId" SET DEFAULT COALESCE(current_workspace_id(), '00000000-0000-0000-0000-000000000001');
CREATE INDEX "Integration_workspaceId_idx" ON "Integration"("workspaceId");

ALTER TABLE "EncryptedCredential" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "EncryptedCredential" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "EncryptedCredential" ALTER COLUMN "workspaceId" SET DEFAULT COALESCE(current_workspace_id(), '00000000-0000-0000-0000-000000000001');
CREATE INDEX "EncryptedCredential_workspaceId_idx" ON "EncryptedCredential"("workspaceId");

ALTER TABLE "Agent" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "Agent" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "Agent" ALTER COLUMN "workspaceId" SET DEFAULT COALESCE(current_workspace_id(), '00000000-0000-0000-0000-000000000001');
CREATE INDEX "Agent_workspaceId_idx" ON "Agent"("workspaceId");

ALTER TABLE "AgentRun" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "AgentRun" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "AgentRun" ALTER COLUMN "workspaceId" SET DEFAULT COALESCE(current_workspace_id(), '00000000-0000-0000-0000-000000000001');
CREATE INDEX "AgentRun_workspaceId_idx" ON "AgentRun"("workspaceId");

ALTER TABLE "Automation" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "Automation" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "Automation" ALTER COLUMN "workspaceId" SET DEFAULT COALESCE(current_workspace_id(), '00000000-0000-0000-0000-000000000001');
CREATE INDEX "Automation_workspaceId_idx" ON "Automation"("workspaceId");

ALTER TABLE "AutomationRun" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "AutomationRun" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "AutomationRun" ALTER COLUMN "workspaceId" SET DEFAULT COALESCE(current_workspace_id(), '00000000-0000-0000-0000-000000000001');
CREATE INDEX "AutomationRun_workspaceId_idx" ON "AutomationRun"("workspaceId");

ALTER TABLE "Notification" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "Notification" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "Notification" ALTER COLUMN "workspaceId" SET DEFAULT COALESCE(current_workspace_id(), '00000000-0000-0000-0000-000000000001');
CREATE INDEX "Notification_workspaceId_idx" ON "Notification"("workspaceId");

ALTER TABLE "ContactRequest" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "ContactRequest" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "ContactRequest" ALTER COLUMN "workspaceId" SET DEFAULT COALESCE(current_workspace_id(), '00000000-0000-0000-0000-000000000001');
CREATE INDEX "ContactRequest_workspaceId_idx" ON "ContactRequest"("workspaceId");

ALTER TABLE "AuditLog" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "AuditLog" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "AuditLog" ALTER COLUMN "workspaceId" SET DEFAULT COALESCE(current_workspace_id(), '00000000-0000-0000-0000-000000000001');
CREATE INDEX "AuditLog_workspaceId_idx" ON "AuditLog"("workspaceId");

-- Transaction-local defaults bind new rows to the authenticated workspace.
-- Enforce workspace isolation at PostgreSQL level for the newly activated models.
ALTER TABLE "ProductScore" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductScore" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ProductScore_workspace_isolation" ON "ProductScore";
CREATE POLICY "ProductScore_workspace_isolation" ON "ProductScore" USING ("workspaceId" = current_workspace_id()) WITH CHECK ("workspaceId" = current_workspace_id());

ALTER TABLE "AffiliateProgram" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AffiliateProgram" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "AffiliateProgram_workspace_isolation" ON "AffiliateProgram";
CREATE POLICY "AffiliateProgram_workspace_isolation" ON "AffiliateProgram" USING ("workspaceId" = current_workspace_id()) WITH CHECK ("workspaceId" = current_workspace_id());

ALTER TABLE "AffiliateLink" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AffiliateLink" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "AffiliateLink_workspace_isolation" ON "AffiliateLink";
CREATE POLICY "AffiliateLink_workspace_isolation" ON "AffiliateLink" USING ("workspaceId" = current_workspace_id()) WITH CHECK ("workspaceId" = current_workspace_id());

ALTER TABLE "LinkClick" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LinkClick" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "LinkClick_workspace_isolation" ON "LinkClick";
CREATE POLICY "LinkClick_workspace_isolation" ON "LinkClick" USING ("workspaceId" = current_workspace_id()) WITH CHECK ("workspaceId" = current_workspace_id());

ALTER TABLE "Campaign" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Campaign" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Campaign_workspace_isolation" ON "Campaign";
CREATE POLICY "Campaign_workspace_isolation" ON "Campaign" USING ("workspaceId" = current_workspace_id()) WITH CHECK ("workspaceId" = current_workspace_id());

ALTER TABLE "Script" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Script" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Script_workspace_isolation" ON "Script";
CREATE POLICY "Script_workspace_isolation" ON "Script" USING ("workspaceId" = current_workspace_id()) WITH CHECK ("workspaceId" = current_workspace_id());

ALTER TABLE "ScriptVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ScriptVersion" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ScriptVersion_workspace_isolation" ON "ScriptVersion";
CREATE POLICY "ScriptVersion_workspace_isolation" ON "ScriptVersion" USING ("workspaceId" = current_workspace_id()) WITH CHECK ("workspaceId" = current_workspace_id());

ALTER TABLE "VideoJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VideoJob" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "VideoJob_workspace_isolation" ON "VideoJob";
CREATE POLICY "VideoJob_workspace_isolation" ON "VideoJob" USING ("workspaceId" = current_workspace_id()) WITH CHECK ("workspaceId" = current_workspace_id());

ALTER TABLE "MediaAsset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MediaAsset" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "MediaAsset_workspace_isolation" ON "MediaAsset";
CREATE POLICY "MediaAsset_workspace_isolation" ON "MediaAsset" USING ("workspaceId" = current_workspace_id()) WITH CHECK ("workspaceId" = current_workspace_id());

ALTER TABLE "SocialAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SocialAccount" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "SocialAccount_workspace_isolation" ON "SocialAccount";
CREATE POLICY "SocialAccount_workspace_isolation" ON "SocialAccount" USING ("workspaceId" = current_workspace_id()) WITH CHECK ("workspaceId" = current_workspace_id());

ALTER TABLE "SocialPost" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SocialPost" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "SocialPost_workspace_isolation" ON "SocialPost";
CREATE POLICY "SocialPost_workspace_isolation" ON "SocialPost" USING ("workspaceId" = current_workspace_id()) WITH CHECK ("workspaceId" = current_workspace_id());

ALTER TABLE "PublishJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PublishJob" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "PublishJob_workspace_isolation" ON "PublishJob";
CREATE POLICY "PublishJob_workspace_isolation" ON "PublishJob" USING ("workspaceId" = current_workspace_id()) WITH CHECK ("workspaceId" = current_workspace_id());

ALTER TABLE "Revenue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Revenue" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Revenue_workspace_isolation" ON "Revenue";
CREATE POLICY "Revenue_workspace_isolation" ON "Revenue" USING ("workspaceId" = current_workspace_id()) WITH CHECK ("workspaceId" = current_workspace_id());

ALTER TABLE "Expense" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Expense" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Expense_workspace_isolation" ON "Expense";
CREATE POLICY "Expense_workspace_isolation" ON "Expense" USING ("workspaceId" = current_workspace_id()) WITH CHECK ("workspaceId" = current_workspace_id());

ALTER TABLE "TaxSetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TaxSetting" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "TaxSetting_workspace_isolation" ON "TaxSetting";
CREATE POLICY "TaxSetting_workspace_isolation" ON "TaxSetting" USING ("workspaceId" = current_workspace_id()) WITH CHECK ("workspaceId" = current_workspace_id());

ALTER TABLE "Integration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Integration" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Integration_workspace_isolation" ON "Integration";
CREATE POLICY "Integration_workspace_isolation" ON "Integration" USING ("workspaceId" = current_workspace_id()) WITH CHECK ("workspaceId" = current_workspace_id());

ALTER TABLE "EncryptedCredential" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EncryptedCredential" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "EncryptedCredential_workspace_isolation" ON "EncryptedCredential";
CREATE POLICY "EncryptedCredential_workspace_isolation" ON "EncryptedCredential" USING ("workspaceId" = current_workspace_id()) WITH CHECK ("workspaceId" = current_workspace_id());

ALTER TABLE "Agent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Agent" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Agent_workspace_isolation" ON "Agent";
CREATE POLICY "Agent_workspace_isolation" ON "Agent" USING ("workspaceId" = current_workspace_id()) WITH CHECK ("workspaceId" = current_workspace_id());

ALTER TABLE "AgentRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentRun" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "AgentRun_workspace_isolation" ON "AgentRun";
CREATE POLICY "AgentRun_workspace_isolation" ON "AgentRun" USING ("workspaceId" = current_workspace_id()) WITH CHECK ("workspaceId" = current_workspace_id());

ALTER TABLE "Automation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Automation" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Automation_workspace_isolation" ON "Automation";
CREATE POLICY "Automation_workspace_isolation" ON "Automation" USING ("workspaceId" = current_workspace_id()) WITH CHECK ("workspaceId" = current_workspace_id());

ALTER TABLE "AutomationRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AutomationRun" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "AutomationRun_workspace_isolation" ON "AutomationRun";
CREATE POLICY "AutomationRun_workspace_isolation" ON "AutomationRun" USING ("workspaceId" = current_workspace_id()) WITH CHECK ("workspaceId" = current_workspace_id());

ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Notification_workspace_isolation" ON "Notification";
CREATE POLICY "Notification_workspace_isolation" ON "Notification" USING ("workspaceId" = current_workspace_id()) WITH CHECK ("workspaceId" = current_workspace_id());

ALTER TABLE "ContactRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContactRequest" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ContactRequest_workspace_isolation" ON "ContactRequest";
CREATE POLICY "ContactRequest_workspace_isolation" ON "ContactRequest" USING ("workspaceId" = current_workspace_id()) WITH CHECK ("workspaceId" = current_workspace_id());

ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "AuditLog_workspace_isolation" ON "AuditLog";
CREATE POLICY "AuditLog_workspace_isolation" ON "AuditLog" USING ("workspaceId" = current_workspace_id()) WITH CHECK ("workspaceId" = current_workspace_id());

-- No application path may depend on the legacy default after this migration.
-- All CORE_BOUND writes/reads must execute inside withWorkspaceTransaction().