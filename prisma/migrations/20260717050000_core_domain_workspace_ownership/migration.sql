-- Add explicit tenant ownership to core domain tables that were previously
-- reachable only through indirect relations or were globally scoped.

DO $$
DECLARE
  table_name TEXT;
  tenant_tables TEXT[] := ARRAY[
    'AffiliateProgram',
    'AffiliateLink',
    'LinkClick',
    'Campaign',
    'Script',
    'ScriptVersion',
    'VideoJob',
    'MediaAsset',
    'SocialPost',
    'Revenue',
    'Expense',
    'EncryptedCredential',
    'ContentBrief',
    'WorkflowRun',
    'WorkflowStepRun',
    'Approval',
    'AgentToolCall',
    'AnalyticsEvent'
  ];
BEGIN
  FOREACH table_name IN ARRAY tenant_tables
  LOOP
    IF to_regclass(format('public.%I', table_name)) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format(
      'ALTER TABLE %I ADD COLUMN IF NOT EXISTS "workspaceId" TEXT',
      table_name
    );

    EXECUTE format(
      'UPDATE %I SET "workspaceId" = %L WHERE "workspaceId" IS NULL OR "workspaceId" = ''''',
      table_name,
      '00000000-0000-0000-0000-000000000001'
    );

    EXECUTE format(
      'ALTER TABLE %I ALTER COLUMN "workspaceId" SET NOT NULL',
      table_name
    );

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = lower(table_name) || '_workspace_fk'
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT',
        table_name,
        lower(table_name) || '_workspace_fk'
      );
    END IF;

    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON %I ("workspaceId")',
      lower(table_name) || '_workspace_idx',
      table_name
    );

    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS workspace_isolation ON %I', table_name);
    EXECUTE format(
      'CREATE POLICY workspace_isolation ON %I USING (app_rls_bypass_enabled() OR "workspaceId" = app_current_workspace_id()) WITH CHECK (app_rls_bypass_enabled() OR "workspaceId" = app_current_workspace_id())',
      table_name
    );

    EXECUTE format(
      'DROP TRIGGER IF EXISTS assign_workspace_id_before_insert ON %I',
      table_name
    );
    EXECUTE format(
      'CREATE TRIGGER assign_workspace_id_before_insert BEFORE INSERT ON %I FOR EACH ROW EXECUTE FUNCTION app_assign_workspace_id()',
      table_name
    );
  END LOOP;
END $$;

-- Preserve referential consistency when records already belong to a product or
-- campaign. Any contradictory ownership causes the migration to fail instead
-- of silently assigning cross-tenant data.
DO $$
BEGIN
  IF to_regclass('public."Campaign"') IS NOT NULL AND to_regclass('public."Product"') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM "Campaign" c
      JOIN "Product" p ON p."id" = c."productId"
      WHERE c."workspaceId" <> p."workspaceId"
    ) THEN
      RAISE EXCEPTION 'Campaign/Product workspace ownership mismatch';
    END IF;
  END IF;

  IF to_regclass('public."AffiliateLink"') IS NOT NULL AND to_regclass('public."Product"') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM "AffiliateLink" l
      JOIN "Product" p ON p."id" = l."productId"
      WHERE l."workspaceId" <> p."workspaceId"
    ) THEN
      RAISE EXCEPTION 'AffiliateLink/Product workspace ownership mismatch';
    END IF;
  END IF;
END $$;