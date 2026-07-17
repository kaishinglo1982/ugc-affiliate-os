-- Require tenant context for inserts after removing fixed workspace defaults.
-- Existing application writes may omit workspaceId at the ORM layer, but the
-- database will only derive it from the transaction-local tenant context.

CREATE OR REPLACE FUNCTION app_assign_workspace_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  active_workspace_id TEXT;
BEGIN
  active_workspace_id := app_current_workspace_id();

  IF NEW."workspaceId" IS NULL OR NEW."workspaceId" = '' THEN
    IF active_workspace_id IS NULL THEN
      RAISE EXCEPTION 'workspace context is required for inserts into %', TG_TABLE_NAME
        USING ERRCODE = '42501';
    END IF;
    NEW."workspaceId" := active_workspace_id;
  END IF;

  IF NOT app_rls_bypass_enabled()
     AND (active_workspace_id IS NULL OR NEW."workspaceId" <> active_workspace_id) THEN
    RAISE EXCEPTION 'cross-workspace insert denied for %', TG_TABLE_NAME
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DO $$
DECLARE
  table_record RECORD;
  trigger_name TEXT;
BEGIN
  FOR table_record IN
    SELECT DISTINCT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'workspaceId'
      AND t.table_type = 'BASE TABLE'
  LOOP
    trigger_name := 'assign_workspace_id_before_insert';
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', trigger_name, table_record.table_name);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE INSERT ON %I FOR EACH ROW EXECUTE FUNCTION app_assign_workspace_id()',
      trigger_name,
      table_record.table_name
    );
  END LOOP;
END $$;
