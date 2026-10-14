-- Scope finance exports to the active workspace.
-- Existing rows are assigned to the legacy single-owner workspace by default.
ALTER TABLE "Revenue"
  ADD COLUMN IF NOT EXISTS "workspaceId" TEXT NOT NULL
  DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE "Expense"
  ADD COLUMN IF NOT EXISTS "workspaceId" TEXT NOT NULL
  DEFAULT '00000000-0000-0000-0000-000000000001';

CREATE INDEX IF NOT EXISTS "Revenue_workspaceId_date_idx"
  ON "Revenue" ("workspaceId", "date");

CREATE INDEX IF NOT EXISTS "Expense_workspaceId_date_idx"
  ON "Expense" ("workspaceId", "date");
