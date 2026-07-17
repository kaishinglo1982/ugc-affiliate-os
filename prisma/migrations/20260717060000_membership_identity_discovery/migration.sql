-- Permit authenticated users to discover only their own active memberships
-- before a workspace transaction is established. This is not an RLS bypass.

CREATE OR REPLACE FUNCTION app_current_user_id()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '');
$$;

DROP POLICY IF EXISTS workspace_member_isolation ON "WorkspaceMember";
CREATE POLICY workspace_member_isolation ON "WorkspaceMember"
  USING (
    app_rls_bypass_enabled()
    OR "workspaceId" = app_current_workspace_id()
    OR "userId" = app_current_user_id()
  )
  WITH CHECK (
    app_rls_bypass_enabled()
    OR "workspaceId" = app_current_workspace_id()
  );
