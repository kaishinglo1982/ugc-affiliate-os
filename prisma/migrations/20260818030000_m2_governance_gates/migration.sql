-- Phase 80.1 consolidation — governance gates (additive, no data changes)
-- Adds single-use approval tokens to Approval and the CostEnvelope table.

ALTER TABLE "Approval"
  ADD COLUMN IF NOT EXISTS "approvalTokenHash" TEXT,
  ADD COLUMN IF NOT EXISTS "consumedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "Approval_approvalTokenHash_key"
  ON "Approval"("approvalTokenHash");

CREATE TYPE "CostEnvelopeStatus" AS ENUM ('ACTIVE', 'CONSUMED', 'EXPIRED', 'CANCELLED');

CREATE TABLE IF NOT EXISTS "CostEnvelope" (
  "id"                       TEXT              NOT NULL,
  "workspaceId"              TEXT              NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  "approvalId"               TEXT,
  "category"                 TEXT              NOT NULL,
  "currency"                 TEXT              NOT NULL DEFAULT 'EUR',
  "minimum"                  DECIMAL(12, 2)    NOT NULL,
  "maximum"                  DECIMAL(12, 2)    NOT NULL,
  "freeAlternativeAvailable" BOOLEAN           NOT NULL DEFAULT false,
  "status"                   "CostEnvelopeStatus" NOT NULL DEFAULT 'ACTIVE',
  "expiresAt"                TIMESTAMP(3),
  "consumedAt"               TIMESTAMP(3),
  "createdAt"                TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"                TIMESTAMP(3)      NOT NULL,

  CONSTRAINT "CostEnvelope_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CostEnvelope_workspaceId_status_idx"
  ON "CostEnvelope"("workspaceId", "status");

CREATE INDEX IF NOT EXISTS "CostEnvelope_approvalId_idx"
  ON "CostEnvelope"("approvalId");

ALTER TABLE "CostEnvelope"
  ADD CONSTRAINT "CostEnvelope_approvalId_fkey"
  FOREIGN KEY ("approvalId") REFERENCES "Approval"("id") ON DELETE SET NULL ON UPDATE CASCADE;