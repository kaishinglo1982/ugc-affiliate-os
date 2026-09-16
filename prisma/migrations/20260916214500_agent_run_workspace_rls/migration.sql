-- AgentRun is tenant-owned through Agent. Give it a direct workspace key so
-- run ids cannot be queried or mutated cross-tenant and new runs inherit the
-- transaction-local app.workspace_id.

ALTER TABLE "AgentRun" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;

UPDATE "AgentRun" ar
SET "workspaceId" = COALESCE(
  (SELECT a."workspaceId" FROM "Agent" a WHERE a.id = ar."agentId"),
  '00000000-0000-0000-0000-000000000001'
)
WHERE ar."workspaceId" IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "AgentRun" ar
    JOIN "Agent" a ON a.id = ar."agentId"
    WHERE ar."workspaceId" <> a."workspaceId"
  ) THEN
    RAISE EXCEPTION 'AGENT_RUN_PARENT_WORKSPACE_MISMATCH';
  END IF;
END $$;

ALTER TABLE "AgentRun"
  ALTER COLUMN "workspaceId" SET DEFAULT COALESCE(NULLIF(current_setting('app.workspace_id', true), ''), '00000000-0000-0000-0000-000000000001'),
  ALTER COLUMN "workspaceId" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "AgentRun_workspaceId_idx" ON "AgentRun"("workspaceId");

ALTER TABLE "AgentRun" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "agent_run_workspace_isolation" ON "AgentRun";
CREATE POLICY "agent_run_workspace_isolation" ON "AgentRun" FOR ALL
USING ("workspaceId" = current_setting('app.workspace_id', true))
WITH CHECK (
  "workspaceId" = current_setting('app.workspace_id', true)
  AND EXISTS (
    SELECT 1 FROM "Agent" a
    WHERE a.id = "AgentRun"."agentId"
      AND a."workspaceId" = "AgentRun"."workspaceId"
  )
);
