-- Direct workspace ownership for legacy content/publishing roots.
--
-- This is deliberately additive. Existing rows are backfilled from already
-- trusted parent ownership where possible, then the legacy single-workspace id
-- is used only as a compatibility fallback. New rows inherit app.workspace_id
-- from the transaction established by withWorkspaceDb(); standalone/dev falls
-- back to the historical default workspace.
--
-- FORCE RLS remains intentionally deferred until every runtime/worker path has
-- been proven to establish app.workspace_id with a NOBYPASSRLS runtime role.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Campaign' AND column_name = 'workspaceId'
  ) THEN
    ALTER TABLE "Campaign" ADD COLUMN "workspaceId" TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Script' AND column_name = 'workspaceId'
  ) THEN
    ALTER TABLE "Script" ADD COLUMN "workspaceId" TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'VideoJob' AND column_name = 'workspaceId'
  ) THEN
    ALTER TABLE "VideoJob" ADD COLUMN "workspaceId" TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'MediaAsset' AND column_name = 'workspaceId'
  ) THEN
    ALTER TABLE "MediaAsset" ADD COLUMN "workspaceId" TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'SocialPost' AND column_name = 'workspaceId'
  ) THEN
    ALTER TABLE "SocialPost" ADD COLUMN "workspaceId" TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'SocialAccount' AND column_name = 'workspaceId'
  ) THEN
    ALTER TABLE "SocialAccount" ADD COLUMN "workspaceId" TEXT;
  END IF;
END $$;

-- Campaign: prefer direct Product ownership, then AffiliateLink -> Product.
UPDATE "Campaign" c
SET "workspaceId" = COALESCE(
  (SELECT p."workspaceId" FROM "Product" p WHERE p.id = c."productId"),
  (
    SELECT p."workspaceId"
    FROM "AffiliateLink" al
    JOIN "Product" p ON p.id = al."productId"
    WHERE al.id = c."affiliateLinkId"
  ),
  '00000000-0000-0000-0000-000000000001'
)
WHERE c."workspaceId" IS NULL;

-- Script: campaign authority wins, Product is the fallback parent.
UPDATE "Script" s
SET "workspaceId" = COALESCE(
  (SELECT c."workspaceId" FROM "Campaign" c WHERE c.id = s."campaignId"),
  (SELECT p."workspaceId" FROM "Product" p WHERE p.id = s."productId"),
  '00000000-0000-0000-0000-000000000001'
)
WHERE s."workspaceId" IS NULL;

-- VideoJob: inherit from Script/Campaign/Product in that order.
UPDATE "VideoJob" v
SET "workspaceId" = COALESCE(
  (SELECT s."workspaceId" FROM "Script" s WHERE s.id = v."scriptId"),
  (SELECT c."workspaceId" FROM "Campaign" c WHERE c.id = v."campaignId"),
  (SELECT p."workspaceId" FROM "Product" p WHERE p.id = v."productId"),
  '00000000-0000-0000-0000-000000000001'
)
WHERE v."workspaceId" IS NULL;

-- MediaAsset: inherit from VideoJob/Campaign/Product.
UPDATE "MediaAsset" m
SET "workspaceId" = COALESCE(
  (SELECT v."workspaceId" FROM "VideoJob" v WHERE v.id = m."videoJobId"),
  (SELECT c."workspaceId" FROM "Campaign" c WHERE c.id = m."campaignId"),
  (SELECT p."workspaceId" FROM "Product" p WHERE p.id = m."productId"),
  '00000000-0000-0000-0000-000000000001'
)
WHERE m."workspaceId" IS NULL;

-- SocialPost: inherit from Campaign/MediaAsset. Unattached legacy drafts remain
-- in the historical compatibility workspace rather than being guessed.
UPDATE "SocialPost" sp
SET "workspaceId" = COALESCE(
  (SELECT c."workspaceId" FROM "Campaign" c WHERE c.id = sp."campaignId"),
  (SELECT m."workspaceId" FROM "MediaAsset" m WHERE m.id = sp."mediaAssetId"),
  '00000000-0000-0000-0000-000000000001'
)
WHERE sp."workspaceId" IS NULL;

-- One social account may not span multiple workspaces. Stop the migration
-- rather than silently assigning ambiguous credentials/account authority.
DO $$
BEGIN
  IF EXISTS (
    SELECT sp."accountId"
    FROM "SocialPost" sp
    GROUP BY sp."accountId"
    HAVING COUNT(DISTINCT sp."workspaceId") > 1
  ) THEN
    RAISE EXCEPTION 'SOCIAL_ACCOUNT_CROSS_WORKSPACE_HISTORY_DETECTED';
  END IF;
END $$;

UPDATE "SocialAccount" sa
SET "workspaceId" = COALESCE(
  (SELECT MIN(sp."workspaceId") FROM "SocialPost" sp WHERE sp."accountId" = sa.id),
  '00000000-0000-0000-0000-000000000001'
)
WHERE sa."workspaceId" IS NULL;

-- Cross-check references after backfill. Any mismatch is a migration blocker.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Campaign" c
    JOIN "Product" p ON p.id = c."productId"
    WHERE c."workspaceId" <> p."workspaceId"
  ) OR EXISTS (
    SELECT 1
    FROM "Campaign" c
    JOIN "AffiliateLink" al ON al.id = c."affiliateLinkId"
    JOIN "Product" p ON p.id = al."productId"
    WHERE c."workspaceId" <> p."workspaceId"
  ) THEN
    RAISE EXCEPTION 'CAMPAIGN_PARENT_WORKSPACE_MISMATCH';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "Script" s
    JOIN "Campaign" c ON c.id = s."campaignId"
    WHERE s."workspaceId" <> c."workspaceId"
  ) OR EXISTS (
    SELECT 1
    FROM "Script" s
    JOIN "Product" p ON p.id = s."productId"
    WHERE s."workspaceId" <> p."workspaceId"
  ) THEN
    RAISE EXCEPTION 'SCRIPT_PARENT_WORKSPACE_MISMATCH';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "VideoJob" v
    JOIN "Campaign" c ON c.id = v."campaignId"
    WHERE v."workspaceId" <> c."workspaceId"
  ) OR EXISTS (
    SELECT 1
    FROM "VideoJob" v
    JOIN "Script" s ON s.id = v."scriptId"
    WHERE v."workspaceId" <> s."workspaceId"
  ) OR EXISTS (
    SELECT 1
    FROM "VideoJob" v
    JOIN "Product" p ON p.id = v."productId"
    WHERE v."workspaceId" <> p."workspaceId"
  ) THEN
    RAISE EXCEPTION 'VIDEO_JOB_PARENT_WORKSPACE_MISMATCH';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "MediaAsset" m
    JOIN "Campaign" c ON c.id = m."campaignId"
    WHERE m."workspaceId" <> c."workspaceId"
  ) OR EXISTS (
    SELECT 1
    FROM "MediaAsset" m
    JOIN "VideoJob" v ON v.id = m."videoJobId"
    WHERE m."workspaceId" <> v."workspaceId"
  ) OR EXISTS (
    SELECT 1
    FROM "MediaAsset" m
    JOIN "Product" p ON p.id = m."productId"
    WHERE m."workspaceId" <> p."workspaceId"
  ) THEN
    RAISE EXCEPTION 'MEDIA_PARENT_WORKSPACE_MISMATCH';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "SocialPost" sp
    JOIN "Campaign" c ON c.id = sp."campaignId"
    WHERE sp."workspaceId" <> c."workspaceId"
  ) OR EXISTS (
    SELECT 1
    FROM "SocialPost" sp
    JOIN "MediaAsset" m ON m.id = sp."mediaAssetId"
    WHERE sp."workspaceId" <> m."workspaceId"
  ) OR EXISTS (
    SELECT 1
    FROM "SocialPost" sp
    JOIN "SocialAccount" sa ON sa.id = sp."accountId"
    WHERE sp."workspaceId" <> sa."workspaceId"
  ) THEN
    RAISE EXCEPTION 'SOCIAL_POST_PARENT_WORKSPACE_MISMATCH';
  END IF;
END $$;

-- New inserts automatically inherit the transaction-local tenant context.
-- current_setting(..., true) returns NULL when no setting exists; NULLIF also
-- handles an explicitly empty setting. The legacy UUID is standalone fallback.
ALTER TABLE "Campaign"
  ALTER COLUMN "workspaceId" SET DEFAULT COALESCE(NULLIF(current_setting('app.workspace_id', true), ''), '00000000-0000-0000-0000-000000000001'),
  ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "Script"
  ALTER COLUMN "workspaceId" SET DEFAULT COALESCE(NULLIF(current_setting('app.workspace_id', true), ''), '00000000-0000-0000-0000-000000000001'),
  ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "VideoJob"
  ALTER COLUMN "workspaceId" SET DEFAULT COALESCE(NULLIF(current_setting('app.workspace_id', true), ''), '00000000-0000-0000-0000-000000000001'),
  ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "MediaAsset"
  ALTER COLUMN "workspaceId" SET DEFAULT COALESCE(NULLIF(current_setting('app.workspace_id', true), ''), '00000000-0000-0000-0000-000000000001'),
  ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "SocialPost"
  ALTER COLUMN "workspaceId" SET DEFAULT COALESCE(NULLIF(current_setting('app.workspace_id', true), ''), '00000000-0000-0000-0000-000000000001'),
  ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "SocialAccount"
  ALTER COLUMN "workspaceId" SET DEFAULT COALESCE(NULLIF(current_setting('app.workspace_id', true), ''), '00000000-0000-0000-0000-000000000001'),
  ALTER COLUMN "workspaceId" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "Campaign_workspaceId_idx" ON "Campaign"("workspaceId");
CREATE INDEX IF NOT EXISTS "Script_workspaceId_idx" ON "Script"("workspaceId");
CREATE INDEX IF NOT EXISTS "VideoJob_workspaceId_idx" ON "VideoJob"("workspaceId");
CREATE INDEX IF NOT EXISTS "MediaAsset_workspaceId_idx" ON "MediaAsset"("workspaceId");
CREATE INDEX IF NOT EXISTS "SocialPost_workspaceId_idx" ON "SocialPost"("workspaceId");
CREATE INDEX IF NOT EXISTS "SocialAccount_workspaceId_idx" ON "SocialAccount"("workspaceId");

ALTER TABLE "Campaign" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Script" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VideoJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MediaAsset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SocialPost" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SocialAccount" ENABLE ROW LEVEL SECURITY;

-- Each policy checks both direct row ownership and same-workspace parent
-- references. This prevents a tenant-A row from pointing at tenant-B parents.
DROP POLICY IF EXISTS "campaign_workspace_isolation" ON "Campaign";
CREATE POLICY "campaign_workspace_isolation" ON "Campaign" FOR ALL
USING ("workspaceId" = current_setting('app.workspace_id', true))
WITH CHECK (
  "workspaceId" = current_setting('app.workspace_id', true)
  AND (
    "productId" IS NULL OR EXISTS (
      SELECT 1 FROM "Product" p
      WHERE p.id = "Campaign"."productId"
        AND p."workspaceId" = current_setting('app.workspace_id', true)
    )
  )
  AND (
    "affiliateLinkId" IS NULL OR EXISTS (
      SELECT 1
      FROM "AffiliateLink" al
      JOIN "Product" p ON p.id = al."productId"
      WHERE al.id = "Campaign"."affiliateLinkId"
        AND p."workspaceId" = current_setting('app.workspace_id', true)
    )
  )
);

DROP POLICY IF EXISTS "script_workspace_isolation" ON "Script";
CREATE POLICY "script_workspace_isolation" ON "Script" FOR ALL
USING ("workspaceId" = current_setting('app.workspace_id', true))
WITH CHECK (
  "workspaceId" = current_setting('app.workspace_id', true)
  AND (
    "productId" IS NULL OR EXISTS (
      SELECT 1 FROM "Product" p
      WHERE p.id = "Script"."productId"
        AND p."workspaceId" = current_setting('app.workspace_id', true)
    )
  )
  AND (
    "campaignId" IS NULL OR EXISTS (
      SELECT 1 FROM "Campaign" c
      WHERE c.id = "Script"."campaignId"
        AND c."workspaceId" = current_setting('app.workspace_id', true)
    )
  )
);

DROP POLICY IF EXISTS "video_job_workspace_isolation" ON "VideoJob";
CREATE POLICY "video_job_workspace_isolation" ON "VideoJob" FOR ALL
USING ("workspaceId" = current_setting('app.workspace_id', true))
WITH CHECK (
  "workspaceId" = current_setting('app.workspace_id', true)
  AND (
    "productId" IS NULL OR EXISTS (
      SELECT 1 FROM "Product" p
      WHERE p.id = "VideoJob"."productId"
        AND p."workspaceId" = current_setting('app.workspace_id', true)
    )
  )
  AND (
    "campaignId" IS NULL OR EXISTS (
      SELECT 1 FROM "Campaign" c
      WHERE c.id = "VideoJob"."campaignId"
        AND c."workspaceId" = current_setting('app.workspace_id', true)
    )
  )
  AND (
    "scriptId" IS NULL OR EXISTS (
      SELECT 1 FROM "Script" s
      WHERE s.id = "VideoJob"."scriptId"
        AND s."workspaceId" = current_setting('app.workspace_id', true)
    )
  )
);

DROP POLICY IF EXISTS "media_asset_workspace_isolation" ON "MediaAsset";
CREATE POLICY "media_asset_workspace_isolation" ON "MediaAsset" FOR ALL
USING ("workspaceId" = current_setting('app.workspace_id', true))
WITH CHECK (
  "workspaceId" = current_setting('app.workspace_id', true)
  AND (
    "productId" IS NULL OR EXISTS (
      SELECT 1 FROM "Product" p
      WHERE p.id = "MediaAsset"."productId"
        AND p."workspaceId" = current_setting('app.workspace_id', true)
    )
  )
  AND (
    "campaignId" IS NULL OR EXISTS (
      SELECT 1 FROM "Campaign" c
      WHERE c.id = "MediaAsset"."campaignId"
        AND c."workspaceId" = current_setting('app.workspace_id', true)
    )
  )
  AND (
    "videoJobId" IS NULL OR EXISTS (
      SELECT 1 FROM "VideoJob" v
      WHERE v.id = "MediaAsset"."videoJobId"
        AND v."workspaceId" = current_setting('app.workspace_id', true)
    )
  )
);

DROP POLICY IF EXISTS "social_account_workspace_isolation" ON "SocialAccount";
CREATE POLICY "social_account_workspace_isolation" ON "SocialAccount" FOR ALL
USING ("workspaceId" = current_setting('app.workspace_id', true))
WITH CHECK ("workspaceId" = current_setting('app.workspace_id', true));

DROP POLICY IF EXISTS "social_post_workspace_isolation" ON "SocialPost";
CREATE POLICY "social_post_workspace_isolation" ON "SocialPost" FOR ALL
USING ("workspaceId" = current_setting('app.workspace_id', true))
WITH CHECK (
  "workspaceId" = current_setting('app.workspace_id', true)
  AND EXISTS (
    SELECT 1 FROM "SocialAccount" sa
    WHERE sa.id = "SocialPost"."accountId"
      AND sa."workspaceId" = current_setting('app.workspace_id', true)
  )
  AND (
    "campaignId" IS NULL OR EXISTS (
      SELECT 1 FROM "Campaign" c
      WHERE c.id = "SocialPost"."campaignId"
        AND c."workspaceId" = current_setting('app.workspace_id', true)
    )
  )
  AND (
    "mediaAssetId" IS NULL OR EXISTS (
      SELECT 1 FROM "MediaAsset" m
      WHERE m.id = "SocialPost"."mediaAssetId"
        AND m."workspaceId" = current_setting('app.workspace_id', true)
    )
  )
);
