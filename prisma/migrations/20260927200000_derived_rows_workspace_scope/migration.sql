-- Backfill derived rows from their authoritative tenant parents.
ALTER TABLE "ProductScore" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
UPDATE "ProductScore" ps
SET "workspaceId" = p."workspaceId"
FROM "Product" p
WHERE ps."productId" = p."id"
  AND ps."workspaceId" IS NULL;
ALTER TABLE "ProductScore" ALTER COLUMN "workspaceId" SET NOT NULL;

ALTER TABLE "ScriptVersion" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
UPDATE "ScriptVersion" sv
SET "workspaceId" = s."workspaceId"
FROM "Script" s
WHERE sv."scriptId" = s."id"
  AND sv."workspaceId" IS NULL;
ALTER TABLE "ScriptVersion" ALTER COLUMN "workspaceId" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "ProductScore_workspaceId_productId_idx"
  ON "ProductScore" ("workspaceId", "productId");
CREATE INDEX IF NOT EXISTS "ScriptVersion_workspaceId_scriptId_idx"
  ON "ScriptVersion" ("workspaceId", "scriptId");

DROP POLICY IF EXISTS "ProductScore_workspace_isolation" ON "ProductScore";
CREATE POLICY "ProductScore_workspace_isolation" ON "ProductScore"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

DROP POLICY IF EXISTS "ScriptVersion_workspace_isolation" ON "ScriptVersion";
CREATE POLICY "ScriptVersion_workspace_isolation" ON "ScriptVersion"
  USING ("workspaceId" = current_workspace_id())
  WITH CHECK ("workspaceId" = current_workspace_id());

-- ProductScore and ScriptVersion are now tenant-bearing and joinable by workspace.

-- Canary activation: Product is covered by a workspace policy and is enforced by RLS.
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
