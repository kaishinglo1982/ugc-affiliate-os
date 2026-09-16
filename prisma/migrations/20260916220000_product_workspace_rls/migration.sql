-- Product is a primary tenant root referenced by campaigns, finance, media,
-- scripts and affiliate links. Enforce its existing workspaceId at the
-- database boundary and align new rows with transaction-local tenant context.

ALTER TABLE "Product"
  ALTER COLUMN "workspaceId" SET DEFAULT COALESCE(NULLIF(current_setting('app.workspace_id', true), ''), '00000000-0000-0000-0000-000000000001');

CREATE INDEX IF NOT EXISTS "Product_workspaceId_idx"
  ON "Product"("workspaceId");

ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "product_workspace_isolation" ON "Product";
CREATE POLICY "product_workspace_isolation" ON "Product" FOR ALL
USING ("workspaceId" = current_setting('app.workspace_id', true))
WITH CHECK ("workspaceId" = current_setting('app.workspace_id', true));
