-- Phase 70 consolidation — tenancy fundament (additive, no data changes)
-- Adds TenantMode enum + Tenant table for single_owner / multi_tenant modes.

CREATE TYPE "TenantMode" AS ENUM ('SINGLE_OWNER', 'MULTI_TENANT');

CREATE TABLE IF NOT EXISTS "Tenant" (
  "id"        TEXT        NOT NULL,
  "name"      TEXT        NOT NULL,
  "slug"      TEXT,
  "mode"      "TenantMode" NOT NULL DEFAULT 'SINGLE_OWNER',
  "settings"  JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_slug_key" ON "Tenant"("slug");
CREATE INDEX IF NOT EXISTS "Tenant_mode_idx" ON "Tenant"("mode");