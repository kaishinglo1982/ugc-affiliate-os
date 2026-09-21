-- Agent memory is tenant-owned application state. The table already carries a
-- workspaceId; this migration makes that ownership enforceable at the database
-- boundary and aligns new-row defaults with the transaction-local tenant.

ALTER TABLE "AgentMemoryEntry"
  ALTER COLUMN "workspaceId" SET DEFAULT COALESCE(NULLIF(current_setting('app.workspace_id', true), ''), '00000000-0000-0000-0000-000000000001');

CREATE INDEX IF NOT EXISTS "AgentMemoryEntry_workspaceId_idx"
  ON "AgentMemoryEntry"("workspaceId");

ALTER TABLE "AgentMemoryEntry" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "agent_memory_workspace_isolation" ON "AgentMemoryEntry";
CREATE POLICY "agent_memory_workspace_isolation" ON "AgentMemoryEntry" FOR ALL
USING ("workspaceId" = current_setting('app.workspace_id', true))
WITH CHECK ("workspaceId" = current_setting('app.workspace_id', true));
