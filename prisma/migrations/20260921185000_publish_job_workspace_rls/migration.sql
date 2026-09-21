-- PublishJob is tenant-owned through SocialPost. Give each job a direct
-- workspace key so queue reads/writes can be enforced by PostgreSQL RLS.

ALTER TABLE "PublishJob" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;

UPDATE "PublishJob" pj
SET "workspaceId" = sp."workspaceId"
FROM "SocialPost" sp
WHERE sp.id = pj."postId"
  AND pj."workspaceId" IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "PublishJob" pj
    LEFT JOIN "SocialPost" sp ON sp.id = pj."postId"
    WHERE pj."workspaceId" IS NULL
       OR sp.id IS NULL
       OR pj."workspaceId" <> sp."workspaceId"
  ) THEN
    RAISE EXCEPTION 'PUBLISH_JOB_WORKSPACE_BACKFILL_FAILED';
  END IF;
END $$;

ALTER TABLE "PublishJob"
  ALTER COLUMN "workspaceId" SET DEFAULT COALESCE(NULLIF(current_setting('app.workspace_id', true), ''), '00000000-0000-0000-0000-000000000001'),
  ALTER COLUMN "workspaceId" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "PublishJob_workspaceId_idx"
  ON "PublishJob"("workspaceId");
CREATE INDEX IF NOT EXISTS "PublishJob_workspaceId_status_nextAttemptAt_idx"
  ON "PublishJob"("workspaceId", status, "nextAttemptAt");

ALTER TABLE "PublishJob" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "publish_job_workspace_isolation" ON "PublishJob";
CREATE POLICY "publish_job_workspace_isolation" ON "PublishJob" FOR ALL
USING ("workspaceId" = current_setting('app.workspace_id', true))
WITH CHECK (
  "workspaceId" = current_setting('app.workspace_id', true)
  AND EXISTS (
    SELECT 1
    FROM "SocialPost" sp
    WHERE sp.id = "PublishJob"."postId"
      AND sp."workspaceId" = "PublishJob"."workspaceId"
  )
);
