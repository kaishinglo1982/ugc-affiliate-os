-- Workspace context primitive used by UGC CORE_BOUND RLS and transaction-local defaults.
CREATE OR REPLACE FUNCTION current_workspace_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_workspace_id', true), '')
$$;
