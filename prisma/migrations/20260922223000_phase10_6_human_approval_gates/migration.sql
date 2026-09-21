-- Phase 10.6: durable human approval gates.
ALTER TABLE "Approval"
  ADD COLUMN "escalationAt" TIMESTAMP(3),
  ADD COLUMN "escalatedAt" TIMESTAMP(3),
  ADD COLUMN "requiredApproverCount" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "consumedAt" TIMESTAMP(3),
  ADD COLUMN "consumedBy" TEXT;

CREATE INDEX "Approval_workspaceId_status_expiresAt_idx"
  ON "Approval"("workspaceId","status","expiresAt");

CREATE TYPE "ApprovalDecisionStatus" AS ENUM ('APPROVED','REJECTED');

CREATE TABLE "ApprovalDecision" (
  "id" TEXT NOT NULL,
  "approvalId" TEXT NOT NULL,
  "approverId" TEXT NOT NULL,
  "status" "ApprovalDecisionStatus" NOT NULL,
  "reason" TEXT,
  "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "signatureHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApprovalDecision_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApprovalDecision_approvalId_fkey"
    FOREIGN KEY ("approvalId") REFERENCES "Approval"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ApprovalDecision_approvalId_approverId_key"
  ON "ApprovalDecision"("approvalId","approverId");

CREATE INDEX "ApprovalDecision_approvalId_status_idx"
  ON "ApprovalDecision"("approvalId","status");
