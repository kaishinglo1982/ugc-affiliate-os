-- CarryOS 200-test-customer beta: enforce workspace isolation on every
-- persisted table that owns a workspaceId, including tables added by schema-sync
-- migrations after the legacy RLS activation.
--
-- This is intentionally fail-closed: reads/writes without app.current_workspace_id
-- are denied by the canonical policy. It does not grant BYPASSRLS to runtime roles.
DO $$
DECLARE
  target RECORD;
  permissive_policy TEXT;
  restrictive_policy TEXT;
BEGIN
  FOR target IN
    SELECT n.nspname AS schema_name, c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND a.attname = 'workspaceId'
      AND a.attnum > 0
      AND NOT a.attisdropped
    ORDER BY c.relname
  LOOP
    -- Keep generated policy identifiers below PostgreSQL's 63-byte limit.
    permissive_policy := left(target.table_name, 38) || '_' || substr(md5(target.table_name), 1, 8) || '_workspace_guard';
    restrictive_policy := left(target.table_name, 36) || '_' || substr(md5(target.table_name), 1, 8) || '_workspace_restrict';

    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', target.schema_name, target.table_name);
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', target.schema_name, target.table_name);

    -- The permissive policy allows only same-workspace rows. The additional
    -- restrictive policy prevents any other permissive policy from widening
    -- access beyond the current workspace.
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', permissive_policy, target.schema_name, target.table_name);
    EXECUTE format(
      'CREATE POLICY %I ON %I.%I AS PERMISSIVE FOR ALL USING ("workspaceId" = current_workspace_id()) WITH CHECK ("workspaceId" = current_workspace_id())',
      permissive_policy, target.schema_name, target.table_name
    );
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', restrictive_policy, target.schema_name, target.table_name);
    EXECUTE format(
      'CREATE POLICY %I ON %I.%I AS RESTRICTIVE FOR ALL USING ("workspaceId" = current_workspace_id()) WITH CHECK ("workspaceId" = current_workspace_id())',
      restrictive_policy, target.schema_name, target.table_name
    );
  END LOOP;
END $$;
