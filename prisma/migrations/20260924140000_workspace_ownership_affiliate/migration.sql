-- Workspace ownership for affiliate programs and links.
-- RLS intentionally remains disabled until all productive access paths and
-- negative cross-tenant tests are complete.

ALTER TABLE "AffiliateProgram" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "AffiliateLink" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

UPDATE "AffiliateLink" l SET "workspaceId" = p."workspaceId" FROM "AffiliateProgram" p WHERE l."programId" = p."id";

CREATE INDEX "AffiliateProgram_workspaceId_provider_idx" ON "AffiliateProgram"("workspaceId", "provider");
CREATE INDEX "AffiliateLink_workspaceId_programId_idx" ON "AffiliateLink"("workspaceId", "programId");
CREATE INDEX "AffiliateLink_workspaceId_productId_idx" ON "AffiliateLink"("workspaceId", "productId");
