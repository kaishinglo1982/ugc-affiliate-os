-- Add explicit tenant ownership to notifications.
ALTER TABLE "Notification"
  ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

CREATE INDEX "Notification_workspaceId_readAt_idx"
  ON "Notification"("workspaceId", "readAt");

CREATE INDEX "Notification_workspaceId_createdAt_idx"
  ON "Notification"("workspaceId", "createdAt");
