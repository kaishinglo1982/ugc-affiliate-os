-- Legacy tenant-owned roots: PostgreSQL RLS foundation.
--
-- Campaign, Script and VideoJob predate the workspace-aware Phase 6/7 models
-- and therefore do not yet carry a direct workspaceId column in Prisma.
-- Their workspace ownership is derived fail-closed from Product/AffiliateLink
-- and parent Campaign/Script relations. Runtime code binds app.workspace_id
-- transaction-locally via src/lib/db/workspace-context.ts.
--
-- FORCE RLS is intentionally deferred until all remaining legacy read-only UI
-- paths are proven to use the transaction-bound workspace context. Production
-- runtime roles must be NOSUPERUSER/NOBYPASSRLS and must not own these tables.

ALTER TABLE "Campaign" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Script" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VideoJob" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaign_workspace_isolation" ON "Campaign";
CREATE POLICY "campaign_workspace_isolation"
ON "Campaign"
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM "Product" p
    WHERE p.id = "Campaign"."productId"
      AND p."workspaceId" = current_setting('app.workspace_id', true)
  )
  OR EXISTS (
    SELECT 1
    FROM "AffiliateLink" al
    JOIN "Product" p ON p.id = al."productId"
    WHERE al.id = "Campaign"."affiliateLinkId"
      AND p."workspaceId" = current_setting('app.workspace_id', true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "Product" p
    WHERE p.id = "Campaign"."productId"
      AND p."workspaceId" = current_setting('app.workspace_id', true)
  )
  OR EXISTS (
    SELECT 1
    FROM "AffiliateLink" al
    JOIN "Product" p ON p.id = al."productId"
    WHERE al.id = "Campaign"."affiliateLinkId"
      AND p."workspaceId" = current_setting('app.workspace_id', true)
  )
);

DROP POLICY IF EXISTS "script_workspace_isolation" ON "Script";
CREATE POLICY "script_workspace_isolation"
ON "Script"
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM "Product" p
    WHERE p.id = "Script"."productId"
      AND p."workspaceId" = current_setting('app.workspace_id', true)
  )
  OR EXISTS (
    SELECT 1
    FROM "Campaign" c
    WHERE c.id = "Script"."campaignId"
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "Product" p
    WHERE p.id = "Script"."productId"
      AND p."workspaceId" = current_setting('app.workspace_id', true)
  )
  OR EXISTS (
    SELECT 1
    FROM "Campaign" c
    WHERE c.id = "Script"."campaignId"
  )
);

DROP POLICY IF EXISTS "video_job_workspace_isolation" ON "VideoJob";
CREATE POLICY "video_job_workspace_isolation"
ON "VideoJob"
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM "Product" p
    WHERE p.id = "VideoJob"."productId"
      AND p."workspaceId" = current_setting('app.workspace_id', true)
  )
  OR EXISTS (
    SELECT 1
    FROM "Campaign" c
    WHERE c.id = "VideoJob"."campaignId"
  )
  OR EXISTS (
    SELECT 1
    FROM "Script" s
    WHERE s.id = "VideoJob"."scriptId"
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "Product" p
    WHERE p.id = "VideoJob"."productId"
      AND p."workspaceId" = current_setting('app.workspace_id', true)
  )
  OR EXISTS (
    SELECT 1
    FROM "Campaign" c
    WHERE c.id = "VideoJob"."campaignId"
  )
  OR EXISTS (
    SELECT 1
    FROM "Script" s
    WHERE s.id = "VideoJob"."scriptId"
  )
);
