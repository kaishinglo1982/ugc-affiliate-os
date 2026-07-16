-- Phase 10.3 — durable run/step states and atomic worker leases

ALTER TYPE "WorkflowRunStatus" ADD VALUE IF NOT EXISTS 'QUEUED';
ALTER TYPE "WorkflowRunStatus" ADD VALUE IF NOT EXISTS 'WAITING_FOR_APPROVAL';
ALTER TYPE "WorkflowRunStatus" ADD VALUE IF NOT EXISTS 'PAUSED';
ALTER TYPE "WorkflowRunStatus" ADD VALUE IF NOT EXISTS 'RETRYING';
ALTER TYPE "WorkflowRunStatus" ADD VALUE IF NOT EXISTS 'COMPENSATING';

ALTER TABLE "WorkflowStepRun"
  ADD COLUMN IF NOT EXISTS "state" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "attemptCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS "nextAttemptAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "claimedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "claimToken" TEXT,
  ADD COLUMN IF NOT EXISTS "leaseExpiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "heartbeatAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX IF NOT EXISTS "WorkflowStepRun_claimToken_key"
  ON "WorkflowStepRun"("claimToken")
  WHERE "claimToken" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "WorkflowStepRun_claimable_idx"
  ON "WorkflowStepRun"("workspaceId", "state", "nextAttemptAt", "leaseExpiresAt");

CREATE INDEX IF NOT EXISTS "WorkflowStepRun_run_state_idx"
  ON "WorkflowStepRun"("workspaceId", "workflowRunId", "state");
