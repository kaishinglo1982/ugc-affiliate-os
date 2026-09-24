ALTER TABLE "ExperimentResult" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
UPDATE "ExperimentResult" AS r SET "workspaceId" = e."workspaceId" FROM "ContentExperiment" AS e WHERE e."id" = r."experimentId";
CREATE INDEX IF NOT EXISTS "ExperimentResult_workspaceId_experimentId_idx" ON "ExperimentResult"("workspaceId","experimentId");
