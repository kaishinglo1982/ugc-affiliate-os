-- Extend workspace ownership to legacy campaign/video/social publishing models.
-- RLS remains intentionally disabled until all productive access paths are
-- transaction-bound and negative cross-tenant tests are in place.

ALTER TABLE "Campaign" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "VideoJob" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "SocialAccount" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "SocialPost" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "PublishJob" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

CREATE INDEX "Campaign_workspaceId_status_idx" ON "Campaign"("workspaceId", "status");
CREATE INDEX "VideoJob_workspaceId_status_idx" ON "VideoJob"("workspaceId", "status");
CREATE INDEX "VideoJob_workspaceId_campaignId_idx" ON "VideoJob"("workspaceId", "campaignId");
CREATE INDEX "SocialAccount_workspaceId_platform_idx" ON "SocialAccount"("workspaceId", "platform");
CREATE INDEX "SocialPost_workspaceId_status_idx" ON "SocialPost"("workspaceId", "status");
CREATE INDEX "SocialPost_workspaceId_scheduledAt_idx" ON "SocialPost"("workspaceId", "scheduledAt");
CREATE INDEX "PublishJob_workspaceId_status_nextAttemptAt_idx" ON "PublishJob"("workspaceId", "status", "nextAttemptAt");
