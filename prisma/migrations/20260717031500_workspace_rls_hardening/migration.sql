-- Complete workspace isolation rollout.
-- 1. Backfill the existing administrator as owner of the default workspace.
-- 2. Remove database defaults from tenant columns so callers must supply scope.
-- 3. Create a non-superuser role used by RLS integration tests.

INSERT INTO "WorkspaceMember" (
  "id", "workspaceId", "userId", "role", "status", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  '00000000-0000-0000-0000-000000000001',
  u."id",
  'OWNER'::"WorkspaceMemberRole",
  'ACTIVE'::"WorkspaceMemberStatus",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "User" u
WHERE u."email" = COALESCE(NULLIF(current_setting('app.bootstrap_admin_email', true), ''), 'owner@example.com')
ON CONFLICT ("workspaceId", "userId")
DO UPDATE SET
  "role" = 'OWNER'::"WorkspaceMemberRole",
  "status" = 'ACTIVE'::"WorkspaceMemberStatus",
  "updatedAt" = CURRENT_TIMESTAMP;

-- Tenant scope must be explicit for every new row. Existing rows remain intact.
DO $$
DECLARE
  column_record RECORD;
BEGIN
  FOR column_record IN
    SELECT table_schema, table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'workspaceId'
      AND column_default IS NOT NULL
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I ALTER COLUMN %I DROP DEFAULT',
      column_record.table_schema,
      column_record.table_name,
      column_record.column_name
    );
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ugc_affiliate_app') THEN
    CREATE ROLE ugc_affiliate_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO ugc_affiliate_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ugc_affiliate_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ugc_affiliate_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ugc_affiliate_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO ugc_affiliate_app;
