-- Phase 80.2 consolidation — provider runtime & BYOK (additive)
-- New governed provider keys (contract-only until officially documented APIs)
-- and credential health tracking for key rotation.

ALTER TYPE "VideoProviderKey" ADD VALUE IF NOT EXISTS 'PEXELS';
ALTER TYPE "VideoProviderKey" ADD VALUE IF NOT EXISTS 'OMNIROUTE';
ALTER TYPE "VideoProviderKey" ADD VALUE IF NOT EXISTS 'INTERNAL_COMPOSER';
ALTER TYPE "VideoProviderKey" ADD VALUE IF NOT EXISTS 'CREATOR_MANUAL';
ALTER TYPE "VideoProviderKey" ADD VALUE IF NOT EXISTS 'TEST_DOUBLE';

CREATE TYPE "CredentialHealth" AS ENUM ('UNKNOWN', 'HEALTHY', 'UNHEALTHY', 'ROTATION_REQUIRED');

ALTER TABLE "EncryptedCredential"
  ADD COLUMN IF NOT EXISTS "lastUsedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "healthStatus" "CredentialHealth" NOT NULL DEFAULT 'UNKNOWN';

CREATE INDEX IF NOT EXISTS "EncryptedCredential_healthStatus_idx"
  ON "EncryptedCredential"("healthStatus");