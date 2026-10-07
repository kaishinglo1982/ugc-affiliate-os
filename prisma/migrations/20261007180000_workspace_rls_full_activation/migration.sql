-- UGC workspace RLS activation: enforce every workspace-owned table.
-- The application MUST establish app.current_workspace_id inside a transaction.
-- No destructive operations are used here.

CREATE OR REPLACE FUNCTION current_workspace_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_workspace_id', true), '')
$$;

DO $$
DECLARE
  table_name text;
BEGIN
  FOR table_name IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'workspaceId'
      AND t.table_type = 'BASE TABLE'
      AND c.table_name NOT IN ('_prisma_migrations')
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', table_name || '_workspace_isolation', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON %I USING ("workspaceId" = current_workspace_id()) WITH CHECK ("workspaceId" = current_workspace_id())',
      table_name || '_workspace_isolation',
      table_name
    );
  END LOOP;
END $$;
