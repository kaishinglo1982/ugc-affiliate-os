-- Explicit workspace ownership for affiliate programs.
-- Nullable by design: legacy rows are not assigned by inference.
-- Review/reconcile existing programs before tightening this column or enabling RLS.
ALTER TABLE "AffiliateProgram"
  ADD COLUMN "workspaceId" TEXT;

CREATE INDEX "AffiliateProgram_workspaceId_idx"
  ON "AffiliateProgram" ("workspaceId");
