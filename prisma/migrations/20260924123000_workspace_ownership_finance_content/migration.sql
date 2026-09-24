-- Add authoritative workspace ownership to legacy finance/content models.
-- Existing rows remain in the default workspace until an explicit tenant
-- migration maps them to CarryOS tenant identities.
ALTER TABLE "Revenue"
  ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "Expense"
  ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "TaxSetting"
  ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "Script"
  ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "MediaAsset"
  ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

CREATE INDEX "Revenue_workspaceId_date_idx" ON "Revenue"("workspaceId", "date");
CREATE INDEX "Revenue_workspaceId_campaignId_idx" ON "Revenue"("workspaceId", "campaignId");
CREATE INDEX "Expense_workspaceId_date_idx" ON "Expense"("workspaceId", "date");
CREATE INDEX "Expense_workspaceId_campaignId_idx" ON "Expense"("workspaceId", "campaignId");
CREATE INDEX "Script_workspaceId_status_idx" ON "Script"("workspaceId", "status");
CREATE INDEX "Script_workspaceId_campaignId_idx" ON "Script"("workspaceId", "campaignId");
CREATE INDEX "MediaAsset_workspaceId_kind_idx" ON "MediaAsset"("workspaceId", "kind");
CREATE INDEX "MediaAsset_workspaceId_campaignId_idx" ON "MediaAsset"("workspaceId", "campaignId");

-- RLS is intentionally NOT enabled here. Application access paths must first
-- become transaction-bound to app.current_workspace_id before enforcement.
