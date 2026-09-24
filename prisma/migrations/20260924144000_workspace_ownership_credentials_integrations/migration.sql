-- Workspace ownership for credentials and integrations.
-- RLS intentionally remains disabled until all productive access paths are migrated.

ALTER TABLE "EncryptedCredential" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "Integration" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

CREATE INDEX "EncryptedCredential_workspaceId_idx" ON "EncryptedCredential"("workspaceId");
CREATE INDEX "Integration_workspaceId_category_idx" ON "Integration"("workspaceId", "category");
