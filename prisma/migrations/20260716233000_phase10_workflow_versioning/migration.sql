-- Phase 10.2 — additive workflow versioning and immutable run snapshots
-- Existing workflow tables are extended; no parallel workflow persistence is introduced.

ALTER TABLE "WorkflowDefinition"
  ADD COLUMN IF NOT EXISTS "key" TEXT,
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "definitionHash" TEXT,
  ADD COLUMN IF NOT EXISTS "activatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "supersededAt" TIMESTAMP(3);

UPDATE "WorkflowDefinition"
SET "key" = COALESCE("key", regexp_replace(lower("name"), '[^a-z0-9]+', '-', 'g'))
WHERE "key" IS NULL;

ALTER TABLE "WorkflowDefinition"
  ALTER COLUMN "key" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "WorkflowDefinition_workspaceId_key_version_key"
  ON "WorkflowDefinition"("workspaceId", "key", "version");

CREATE INDEX IF NOT EXISTS "WorkflowDefinition_workspaceId_key_status_idx"
  ON "WorkflowDefinition"("workspaceId", "key", "status");

ALTER TABLE "WorkflowStepDefinition"
  ADD COLUMN IF NOT EXISTS "key" TEXT,
  ADD COLUMN IF NOT EXISTS "dependsOn" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "WorkflowStepDefinition"
SET "key" = COALESCE("key", 'step-' || "stepOrder"::TEXT)
WHERE "key" IS NULL;

ALTER TABLE "WorkflowStepDefinition"
  ALTER COLUMN "key" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "WorkflowStepDefinition_workflowId_key_key"
  ON "WorkflowStepDefinition"("workflowId", "key");

CREATE UNIQUE INDEX IF NOT EXISTS "WorkflowStepDefinition_workflowId_stepOrder_key"
  ON "WorkflowStepDefinition"("workflowId", "stepOrder");

ALTER TABLE "WorkflowRun"
  ADD COLUMN IF NOT EXISTS "workflowVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "definitionSnapshot" JSONB,
  ADD COLUMN IF NOT EXISTS "definitionHash" TEXT,
  ADD COLUMN IF NOT EXISTS "correlationId" TEXT,
  ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;

UPDATE "WorkflowRun"
SET
  "correlationId" = COALESCE("correlationId", "id"),
  "definitionSnapshot" = COALESCE("definitionSnapshot", '{}'::JSONB)
WHERE "correlationId" IS NULL OR "definitionSnapshot" IS NULL;

ALTER TABLE "WorkflowRun"
  ALTER COLUMN "correlationId" SET NOT NULL,
  ALTER COLUMN "definitionSnapshot" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "WorkflowRun_workspaceId_idempotencyKey_key"
  ON "WorkflowRun"("workspaceId", "idempotencyKey")
  WHERE "idempotencyKey" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "WorkflowRun_workspaceId_correlationId_idx"
  ON "WorkflowRun"("workspaceId", "correlationId");
