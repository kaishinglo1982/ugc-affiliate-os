-- Additive ownership fields for tenant-scoped publishing resources.
-- Existing rows intentionally remain NULL until an operator reconciles ownership.
ALTER TABLE "SocialAccount" ADD COLUMN "workspaceId" TEXT;
CREATE INDEX "SocialAccount_workspaceId_platform_idx" ON "SocialAccount"("workspaceId", "platform");

ALTER TABLE "MediaAsset" ADD COLUMN "workspaceId" TEXT;
CREATE INDEX "MediaAsset_workspaceId_kind_idx" ON "MediaAsset"("workspaceId", "kind");
