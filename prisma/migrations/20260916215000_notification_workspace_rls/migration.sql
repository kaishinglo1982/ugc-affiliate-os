-- Notifications are tenant-facing application state and must not be shared
-- between workspaces. Existing single-workspace rows are assigned to the
-- historical standalone workspace; new rows inherit transaction-local scope.

ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;

UPDATE "Notification"
SET "workspaceId" = '00000000-0000-0000-0000-000000000001'
WHERE "workspaceId" IS NULL;

ALTER TABLE "Notification"
  ALTER COLUMN "workspaceId" SET DEFAULT COALESCE(NULLIF(current_setting('app.workspace_id', true), ''), '00000000-0000-0000-0000-000000000001'),
  ALTER COLUMN "workspaceId" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "Notification_workspaceId_createdAt_idx"
  ON "Notification"("workspaceId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Notification_workspaceId_readAt_idx"
  ON "Notification"("workspaceId", "readAt");

ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notification_workspace_isolation" ON "Notification";
CREATE POLICY "notification_workspace_isolation" ON "Notification" FOR ALL
USING ("workspaceId" = current_setting('app.workspace_id', true))
WITH CHECK ("workspaceId" = current_setting('app.workspace_id', true));
