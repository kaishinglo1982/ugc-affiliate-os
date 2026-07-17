-- Phase 10.6 — human approval gates: link a WorkflowStepRun to the shared
-- Approval it is waiting on, so a decision can atomically resume the step
-- (and its run) instead of only resolving the Approval row in isolation.

ALTER TABLE "WorkflowStepRun"
  ADD COLUMN IF NOT EXISTS "approvalId" TEXT REFERENCES "Approval"("id");

CREATE INDEX IF NOT EXISTS "WorkflowStepRun_approval_idx"
  ON "WorkflowStepRun"("workspaceId", "approvalId");
