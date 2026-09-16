-- Workspace ownership for the remaining finance/affiliate/dashboard roots used
-- by tenant-facing runtime pages. This migration is additive and fails closed
-- when historical parent relationships span more than one workspace.
--
-- New rows inherit the transaction-local app.workspace_id established by
-- withWorkspaceDb(). The historical UUID remains a compatibility fallback for
-- standalone legacy data only. FORCE RLS stays deferred until every worker and
-- mutation path is proven to bind app.workspace_id under a NOBYPASSRLS role.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='AffiliateProgram' AND column_name='workspaceId') THEN
    ALTER TABLE "AffiliateProgram" ADD COLUMN "workspaceId" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='AffiliateLink' AND column_name='workspaceId') THEN
    ALTER TABLE "AffiliateLink" ADD COLUMN "workspaceId" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='LinkClick' AND column_name='workspaceId') THEN
    ALTER TABLE "LinkClick" ADD COLUMN "workspaceId" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Revenue' AND column_name='workspaceId') THEN
    ALTER TABLE "Revenue" ADD COLUMN "workspaceId" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Expense' AND column_name='workspaceId') THEN
    ALTER TABLE "Expense" ADD COLUMN "workspaceId" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='TaxSetting' AND column_name='workspaceId') THEN
    ALTER TABLE "TaxSetting" ADD COLUMN "workspaceId" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Integration' AND column_name='workspaceId') THEN
    ALTER TABLE "Integration" ADD COLUMN "workspaceId" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Agent' AND column_name='workspaceId') THEN
    ALTER TABLE "Agent" ADD COLUMN "workspaceId" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='AuditLog' AND column_name='workspaceId') THEN
    ALTER TABLE "AuditLog" ADD COLUMN "workspaceId" TEXT;
  END IF;
END $$;

-- An affiliate program cannot become tenant-owned safely when product-bound
-- links already prove that it historically served multiple workspaces.
DO $$
BEGIN
  IF EXISTS (
    SELECT al."programId"
    FROM "AffiliateLink" al
    JOIN "Product" p ON p.id = al."productId"
    WHERE al."productId" IS NOT NULL
    GROUP BY al."programId"
    HAVING COUNT(DISTINCT p."workspaceId") > 1
  ) THEN
    RAISE EXCEPTION 'AFFILIATE_PROGRAM_CROSS_WORKSPACE_HISTORY_DETECTED';
  END IF;
END $$;

UPDATE "AffiliateProgram" ap
SET "workspaceId" = COALESCE(
  (
    SELECT MIN(p."workspaceId")
    FROM "AffiliateLink" al
    JOIN "Product" p ON p.id = al."productId"
    WHERE al."programId" = ap.id
  ),
  '00000000-0000-0000-0000-000000000001'
)
WHERE ap."workspaceId" IS NULL;

UPDATE "AffiliateLink" al
SET "workspaceId" = COALESCE(
  (SELECT p."workspaceId" FROM "Product" p WHERE p.id = al."productId"),
  (SELECT ap."workspaceId" FROM "AffiliateProgram" ap WHERE ap.id = al."programId"),
  '00000000-0000-0000-0000-000000000001'
)
WHERE al."workspaceId" IS NULL;

UPDATE "LinkClick" lc
SET "workspaceId" = COALESCE(
  (SELECT al."workspaceId" FROM "AffiliateLink" al WHERE al.id = lc."linkId"),
  '00000000-0000-0000-0000-000000000001'
)
WHERE lc."workspaceId" IS NULL;

UPDATE "Revenue" r
SET "workspaceId" = COALESCE(
  (SELECT c."workspaceId" FROM "Campaign" c WHERE c.id = r."campaignId"),
  (SELECT p."workspaceId" FROM "Product" p WHERE p.id = r."productId"),
  (SELECT ap."workspaceId" FROM "AffiliateProgram" ap WHERE ap.id = r."programId"),
  '00000000-0000-0000-0000-000000000001'
)
WHERE r."workspaceId" IS NULL;

UPDATE "Expense" e
SET "workspaceId" = COALESCE(
  (SELECT c."workspaceId" FROM "Campaign" c WHERE c.id = e."campaignId"),
  (SELECT p."workspaceId" FROM "Product" p WHERE p.id = e."productId"),
  '00000000-0000-0000-0000-000000000001'
)
WHERE e."workspaceId" IS NULL;

UPDATE "TaxSetting" SET "workspaceId" = '00000000-0000-0000-0000-000000000001' WHERE "workspaceId" IS NULL;
UPDATE "Integration" SET "workspaceId" = '00000000-0000-0000-0000-000000000001' WHERE "workspaceId" IS NULL;
UPDATE "Agent" SET "workspaceId" = '00000000-0000-0000-0000-000000000001' WHERE "workspaceId" IS NULL;
UPDATE "AuditLog" SET "workspaceId" = '00000000-0000-0000-0000-000000000001' WHERE "workspaceId" IS NULL;

-- Parent consistency is a hard migration gate. No record may carry a tenant
-- different from any non-null tenant-owned parent it references.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "AffiliateLink" al
    JOIN "AffiliateProgram" ap ON ap.id = al."programId"
    WHERE al."workspaceId" <> ap."workspaceId"
  ) OR EXISTS (
    SELECT 1 FROM "AffiliateLink" al
    JOIN "Product" p ON p.id = al."productId"
    WHERE al."workspaceId" <> p."workspaceId"
  ) THEN
    RAISE EXCEPTION 'AFFILIATE_LINK_PARENT_WORKSPACE_MISMATCH';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "LinkClick" lc
    JOIN "AffiliateLink" al ON al.id = lc."linkId"
    WHERE lc."workspaceId" <> al."workspaceId"
  ) THEN
    RAISE EXCEPTION 'LINK_CLICK_PARENT_WORKSPACE_MISMATCH';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "Revenue" r JOIN "Campaign" c ON c.id = r."campaignId"
    WHERE r."workspaceId" <> c."workspaceId"
  ) OR EXISTS (
    SELECT 1 FROM "Revenue" r JOIN "Product" p ON p.id = r."productId"
    WHERE r."workspaceId" <> p."workspaceId"
  ) OR EXISTS (
    SELECT 1 FROM "Revenue" r JOIN "AffiliateProgram" ap ON ap.id = r."programId"
    WHERE r."workspaceId" <> ap."workspaceId"
  ) THEN
    RAISE EXCEPTION 'REVENUE_PARENT_WORKSPACE_MISMATCH';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "Expense" e JOIN "Campaign" c ON c.id = e."campaignId"
    WHERE e."workspaceId" <> c."workspaceId"
  ) OR EXISTS (
    SELECT 1 FROM "Expense" e JOIN "Product" p ON p.id = e."productId"
    WHERE e."workspaceId" <> p."workspaceId"
  ) THEN
    RAISE EXCEPTION 'EXPENSE_PARENT_WORKSPACE_MISMATCH';
  END IF;
END $$;

-- Prevent duplicate singleton tax settings after moving from global to tenant scope.
DO $$
BEGIN
  IF EXISTS (
    SELECT "workspaceId" FROM "TaxSetting"
    GROUP BY "workspaceId" HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'MULTIPLE_TAX_SETTINGS_FOR_WORKSPACE';
  END IF;
END $$;

-- Transaction-local defaults for all new tenant rows.
ALTER TABLE "AffiliateProgram" ALTER COLUMN "workspaceId" SET DEFAULT COALESCE(NULLIF(current_setting('app.workspace_id', true), ''), '00000000-0000-0000-0000-000000000001'), ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "AffiliateLink" ALTER COLUMN "workspaceId" SET DEFAULT COALESCE(NULLIF(current_setting('app.workspace_id', true), ''), '00000000-0000-0000-0000-000000000001'), ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "LinkClick" ALTER COLUMN "workspaceId" SET DEFAULT COALESCE(NULLIF(current_setting('app.workspace_id', true), ''), '00000000-0000-0000-0000-000000000001'), ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "Revenue" ALTER COLUMN "workspaceId" SET DEFAULT COALESCE(NULLIF(current_setting('app.workspace_id', true), ''), '00000000-0000-0000-0000-000000000001'), ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "Expense" ALTER COLUMN "workspaceId" SET DEFAULT COALESCE(NULLIF(current_setting('app.workspace_id', true), ''), '00000000-0000-0000-0000-000000000001'), ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "TaxSetting" ALTER COLUMN "workspaceId" SET DEFAULT COALESCE(NULLIF(current_setting('app.workspace_id', true), ''), '00000000-0000-0000-0000-000000000001'), ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "Integration" ALTER COLUMN "workspaceId" SET DEFAULT COALESCE(NULLIF(current_setting('app.workspace_id', true), ''), '00000000-0000-0000-0000-000000000001'), ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "Agent" ALTER COLUMN "workspaceId" SET DEFAULT COALESCE(NULLIF(current_setting('app.workspace_id', true), ''), '00000000-0000-0000-0000-000000000001'), ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "AuditLog" ALTER COLUMN "workspaceId" SET DEFAULT COALESCE(NULLIF(current_setting('app.workspace_id', true), ''), '00000000-0000-0000-0000-000000000001'), ALTER COLUMN "workspaceId" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "AffiliateProgram_workspaceId_idx" ON "AffiliateProgram"("workspaceId");
CREATE INDEX IF NOT EXISTS "AffiliateLink_workspaceId_idx" ON "AffiliateLink"("workspaceId");
CREATE INDEX IF NOT EXISTS "LinkClick_workspaceId_idx" ON "LinkClick"("workspaceId");
CREATE INDEX IF NOT EXISTS "Revenue_workspaceId_idx" ON "Revenue"("workspaceId");
CREATE INDEX IF NOT EXISTS "Expense_workspaceId_idx" ON "Expense"("workspaceId");
CREATE UNIQUE INDEX IF NOT EXISTS "TaxSetting_workspaceId_key" ON "TaxSetting"("workspaceId");
CREATE INDEX IF NOT EXISTS "Integration_workspaceId_idx" ON "Integration"("workspaceId");
CREATE INDEX IF NOT EXISTS "Agent_workspaceId_idx" ON "Agent"("workspaceId");
CREATE INDEX IF NOT EXISTS "AuditLog_workspaceId_idx" ON "AuditLog"("workspaceId");

ALTER TABLE "AffiliateProgram" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AffiliateLink" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LinkClick" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Revenue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Expense" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TaxSetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Integration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Agent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "affiliate_program_workspace_isolation" ON "AffiliateProgram";
CREATE POLICY "affiliate_program_workspace_isolation" ON "AffiliateProgram" FOR ALL
USING ("workspaceId" = current_setting('app.workspace_id', true))
WITH CHECK ("workspaceId" = current_setting('app.workspace_id', true));

DROP POLICY IF EXISTS "affiliate_link_workspace_isolation" ON "AffiliateLink";
CREATE POLICY "affiliate_link_workspace_isolation" ON "AffiliateLink" FOR ALL
USING ("workspaceId" = current_setting('app.workspace_id', true))
WITH CHECK (
  "workspaceId" = current_setting('app.workspace_id', true)
  AND EXISTS (SELECT 1 FROM "AffiliateProgram" ap WHERE ap.id = "AffiliateLink"."programId" AND ap."workspaceId" = "AffiliateLink"."workspaceId")
  AND ("productId" IS NULL OR EXISTS (SELECT 1 FROM "Product" p WHERE p.id = "AffiliateLink"."productId" AND p."workspaceId" = "AffiliateLink"."workspaceId"))
);

DROP POLICY IF EXISTS "link_click_workspace_isolation" ON "LinkClick";
CREATE POLICY "link_click_workspace_isolation" ON "LinkClick" FOR ALL
USING ("workspaceId" = current_setting('app.workspace_id', true))
WITH CHECK (
  "workspaceId" = current_setting('app.workspace_id', true)
  AND EXISTS (SELECT 1 FROM "AffiliateLink" al WHERE al.id = "LinkClick"."linkId" AND al."workspaceId" = "LinkClick"."workspaceId")
);

DROP POLICY IF EXISTS "revenue_workspace_isolation" ON "Revenue";
CREATE POLICY "revenue_workspace_isolation" ON "Revenue" FOR ALL
USING ("workspaceId" = current_setting('app.workspace_id', true))
WITH CHECK (
  "workspaceId" = current_setting('app.workspace_id', true)
  AND ("programId" IS NULL OR EXISTS (SELECT 1 FROM "AffiliateProgram" ap WHERE ap.id = "Revenue"."programId" AND ap."workspaceId" = "Revenue"."workspaceId"))
  AND ("productId" IS NULL OR EXISTS (SELECT 1 FROM "Product" p WHERE p.id = "Revenue"."productId" AND p."workspaceId" = "Revenue"."workspaceId"))
  AND ("campaignId" IS NULL OR EXISTS (SELECT 1 FROM "Campaign" c WHERE c.id = "Revenue"."campaignId" AND c."workspaceId" = "Revenue"."workspaceId"))
);

DROP POLICY IF EXISTS "expense_workspace_isolation" ON "Expense";
CREATE POLICY "expense_workspace_isolation" ON "Expense" FOR ALL
USING ("workspaceId" = current_setting('app.workspace_id', true))
WITH CHECK (
  "workspaceId" = current_setting('app.workspace_id', true)
  AND ("productId" IS NULL OR EXISTS (SELECT 1 FROM "Product" p WHERE p.id = "Expense"."productId" AND p."workspaceId" = "Expense"."workspaceId"))
  AND ("campaignId" IS NULL OR EXISTS (SELECT 1 FROM "Campaign" c WHERE c.id = "Expense"."campaignId" AND c."workspaceId" = "Expense"."workspaceId"))
);

DROP POLICY IF EXISTS "tax_setting_workspace_isolation" ON "TaxSetting";
CREATE POLICY "tax_setting_workspace_isolation" ON "TaxSetting" FOR ALL
USING ("workspaceId" = current_setting('app.workspace_id', true))
WITH CHECK ("workspaceId" = current_setting('app.workspace_id', true));

DROP POLICY IF EXISTS "integration_workspace_isolation" ON "Integration";
CREATE POLICY "integration_workspace_isolation" ON "Integration" FOR ALL
USING ("workspaceId" = current_setting('app.workspace_id', true))
WITH CHECK ("workspaceId" = current_setting('app.workspace_id', true));

DROP POLICY IF EXISTS "agent_workspace_isolation" ON "Agent";
CREATE POLICY "agent_workspace_isolation" ON "Agent" FOR ALL
USING ("workspaceId" = current_setting('app.workspace_id', true))
WITH CHECK ("workspaceId" = current_setting('app.workspace_id', true));

DROP POLICY IF EXISTS "audit_log_workspace_isolation" ON "AuditLog";
CREATE POLICY "audit_log_workspace_isolation" ON "AuditLog" FOR ALL
USING ("workspaceId" = current_setting('app.workspace_id', true))
WITH CHECK ("workspaceId" = current_setting('app.workspace_id', true));
