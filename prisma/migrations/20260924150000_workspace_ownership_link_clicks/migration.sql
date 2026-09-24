-- Add explicit tenant ownership to link clicks.
ALTER TABLE "LinkClick"
  ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

UPDATE "LinkClick" c SET "workspaceId" = l."workspaceId" FROM "AffiliateLink" l WHERE c."linkId" = l."id";

CREATE INDEX "LinkClick_workspaceId_linkId_idx"
  ON "LinkClick"("workspaceId", "linkId");

CREATE INDEX "LinkClick_workspaceId_occurredAt_idx"
  ON "LinkClick"("workspaceId", "occurredAt");
