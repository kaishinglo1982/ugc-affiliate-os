-- Add tenant ownership to legacy automation tables.
ALTER TABLE "Automation"
  ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE "AutomationRun"
  ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

CREATE INDEX "Automation_workspaceId_isActive_idx"
  ON "Automation"("workspaceId", "isActive");

CREATE INDEX "AutomationRun_workspaceId_automationId_idx"
  ON "AutomationRun"("workspaceId", "automationId");

-- Backfill run ownership from its owning automation where possible.
UPDATE "AutomationRun" r
SET "workspaceId" = a."workspaceId"
FROM "Automation" a
WHERE r."automationId" = a."id";
