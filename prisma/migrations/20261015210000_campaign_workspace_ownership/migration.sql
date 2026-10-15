-- Explicit workspace ownership for campaigns.
-- Intentionally nullable: legacy campaigns are NOT assigned to a workspace by guesswork.
-- Reconcile legacy ownership before making this column NOT NULL or enabling RLS.
ALTER TABLE "Campaign"
  ADD COLUMN "workspaceId" TEXT;

CREATE INDEX "Campaign_workspaceId_idx"
  ON "Campaign" ("workspaceId");
