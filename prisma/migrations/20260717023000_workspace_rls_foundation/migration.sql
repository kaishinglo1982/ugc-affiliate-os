-- Workspace and PostgreSQL RLS foundation.
-- Additive migration: existing fixed single-user workspace remains valid.

CREATE TYPE "WorkspaceStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');
CREATE TYPE "WorkspaceMemberRole" AS ENUM ('OWNER', 'ADMIN', 'OPERATOR', 'VIEWER');
CREATE TYPE "WorkspaceMemberStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'REMOVED');

CREATE TABLE "Workspace" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "status" "WorkspaceStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "WorkspaceMember" (
  "id" TEXT PRIMARY KEY,
  "workspaceId" TEXT NOT NULL REFERENCES "Workspace"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "role" "WorkspaceMemberRole" NOT NULL DEFAULT 'VIEWER',
  "status" "WorkspaceMemberStatus" NOT NULL DEFAULT 'INVITED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkspaceMember_workspace_user_key" UNIQUE ("workspaceId", "userId")
);

CREATE INDEX "WorkspaceMember_user_status_idx"
  ON "WorkspaceMember"("userId", "status");
CREATE INDEX "WorkspaceMember_workspace_status_idx"
  ON "WorkspaceMember"("workspaceId", "status");

-- Preserve the existing single-user workspace while making it explicit.
INSERT INTO "Workspace" ("id", "name", "slug")
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Workspace', 'default')
ON CONFLICT ("id") DO NOTHING;

-- Current tenant helper. Missing/invalid context returns NULL and therefore
-- fails all tenant policies closed.
CREATE OR REPLACE FUNCTION app_current_workspace_id()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_workspace_id', true), '');
$$;

CREATE OR REPLACE FUNCTION app_rls_bypass_enabled()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(NULLIF(current_setting('app.bypass_rls', true), ''), 'off') = 'on';
$$;

-- Apply a canonical policy to every existing workspace-scoped table. The
-- migration intentionally discovers tables from the catalog so future schema
-- additions can reuse the same policy template without hard-coded duplication.
DO $$
DECLARE
  table_record RECORD;
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
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_record.table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_record.table_name);
    EXECUTE format('DROP POLICY IF EXISTS workspace_isolation ON %I', table_record.table_name);
    EXECUTE format(
      'CREATE POLICY workspace_isolation ON %I USING (app_rls_bypass_enabled() OR "workspaceId" = app_current_workspace_id()) WITH CHECK (app_rls_bypass_enabled() OR "workspaceId" = app_current_workspace_id())',
      table_record.table_name
    );
  END LOOP;
END $$;

-- Membership tables are protected using the same request tenant context.
ALTER TABLE "WorkspaceMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkspaceMember" FORCE ROW LEVEL SECURITY;
CREATE POLICY workspace_member_isolation ON "WorkspaceMember"
  USING (app_rls_bypass_enabled() OR "workspaceId" = app_current_workspace_id())
  WITH CHECK (app_rls_bypass_enabled() OR "workspaceId" = app_current_workspace_id());

ALTER TABLE "Workspace" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Workspace" FORCE ROW LEVEL SECURITY;
CREATE POLICY workspace_record_isolation ON "Workspace"
  USING (app_rls_bypass_enabled() OR "id" = app_current_workspace_id())
  WITH CHECK (app_rls_bypass_enabled() OR "id" = app_current_workspace_id());
