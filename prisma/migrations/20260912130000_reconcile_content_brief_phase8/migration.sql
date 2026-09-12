-- Reconcile the persisted ContentBrief table with the Phase 8 Prisma model.
-- This is additive only: existing Phase 3/4 content data remains untouched.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PacingType') THEN
    CREATE TYPE "PacingType" AS ENUM ('slow', 'medium', 'fast');
  END IF;
END
$$;

ALTER TABLE "ContentBrief"
  ADD COLUMN IF NOT EXISTS "campaignStrategyId" TEXT,
  ADD COLUMN IF NOT EXISTS "creativeAngleId" TEXT,
  ADD COLUMN IF NOT EXISTS "productId" TEXT,
  ADD COLUMN IF NOT EXISTS "affiliateOfferId" TEXT,
  ADD COLUMN IF NOT EXISTS "affiliateLinkId" TEXT,
  ADD COLUMN IF NOT EXISTS "title" TEXT,
  ADD COLUMN IF NOT EXISTS "targetAudienceSummary" TEXT,
  ADD COLUMN IF NOT EXISTS "keyProblem" TEXT,
  ADD COLUMN IF NOT EXISTS "desiredOutcome" TEXT,
  ADD COLUMN IF NOT EXISTS "coreMessage" TEXT,
  ADD COLUMN IF NOT EXISTS "valueProposition" TEXT,
  ADD COLUMN IF NOT EXISTS "requiredClaims" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "prohibitedClaims" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "approvedProofPoints" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "requiredProductDetails" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "requiredVisualElements" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "prohibitedVisualElements" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "contentFormat" "PublishingFormat",
  ADD COLUMN IF NOT EXISTS "targetPlatforms" "SocialPlatform"[] NOT NULL DEFAULT ARRAY[]::"SocialPlatform"[],
  ADD COLUMN IF NOT EXISTS "desiredDurationSeconds" INTEGER,
  ADD COLUMN IF NOT EXISTS "languageCode" TEXT NOT NULL DEFAULT 'de',
  ADD COLUMN IF NOT EXISTS "targetCountryCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "tone" TEXT,
  ADD COLUMN IF NOT EXISTS "pacing" "PacingType" NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS "callToActionType" "CallToActionType",
  ADD COLUMN IF NOT EXISTS "affiliateDisclosureRequired" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "affiliateDisclosureText" TEXT,
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS "ContentBrief_workspaceId_campaignStrategyId_idx"
  ON "ContentBrief"("workspaceId", "campaignStrategyId");
