-- Phase 2 completion: enable baseline workspace RLS on every remaining
-- tenant-owned table that carries a direct workspaceId but did not yet have
-- RLS enabled by a more specific migration.
--
-- Existing RLS-enabled tables are intentionally skipped so their stricter
-- parent-consistency policies remain authoritative and are not weakened by an
-- additional permissive policy.

DO $$
DECLARE
  tenant_table RECORD;
BEGIN
  FOR tenant_table IN
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN information_schema.columns col
      ON col.table_schema = n.nspname
     AND col.table_name = c.relname
     AND col.column_name = 'workspaceId'
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND NOT c.relrowsecurity
    ORDER BY c.relname
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tenant_table.table_name);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL USING ("workspaceId" = current_setting(''app.workspace_id'', true)) WITH CHECK ("workspaceId" = current_setting(''app.workspace_id'', true))',
      'workspace_isolation',
      tenant_table.table_name
    );
  END LOOP;
END $$;
