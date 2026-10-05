-- Phase 9: explicit CarryOS tenant -> UGC workspace binding.
-- Additive only. Existing standalone workspace data is untouched.

CREATE TABLE "CarryOSTenantBinding" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CarryOSTenantBinding_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CarryOSTenantBinding_tenantId_key"
  ON "CarryOSTenantBinding"("tenantId");

CREATE UNIQUE INDEX "CarryOSTenantBinding_workspaceId_key"
  ON "CarryOSTenantBinding"("workspaceId");

CREATE INDEX "CarryOSTenantBinding_workspaceId_active_idx"
  ON "CarryOSTenantBinding"("workspaceId", "active");
