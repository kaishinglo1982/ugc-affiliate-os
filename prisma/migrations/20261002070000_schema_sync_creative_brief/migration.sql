-- Phase 10 schema synchronization and ContentBrief creative fields
-- These enum types are present in the Prisma schema but were not created by the
-- earlier migration history. Create them idempotently before adding typed columns.
DO $$
BEGIN
  CREATE TYPE "PacingType" AS ENUM ('slow', 'medium', 'fast');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "CallToActionType" AS ENUM (
    'CLICK_LINK',
    'BUY_NOW',
    'LEARN_MORE',
    'SAVE_POST',
    'FOLLOW',
    'COMMENT',
    'SHARE',
    'VISIT_PROFILE',
    'NONE'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

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
