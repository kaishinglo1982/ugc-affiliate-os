CREATE TYPE "ContactLawfulBasis" AS ENUM ('CONSENT', 'CONTRACT', 'LEGITIMATE_INTEREST');
CREATE TYPE "CreatorProfileStatus" AS ENUM ('DRAFT', 'VERIFIED', 'ACTIVE', 'PAUSED', 'ARCHIVED');
CREATE TYPE "CreatorEngagementStatus" AS ENUM ('DRAFT', 'OFFERED', 'ACCEPTED', 'IN_PRODUCTION', 'IN_REVIEW', 'COMPLETED', 'CANCELLED');
CREATE TYPE "CreatorDeliverableStatus" AS ENUM ('REQUESTED', 'SUBMITTED', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED');
CREATE TYPE "ExecutiveObjectiveStatus" AS ENUM ('DRAFT', 'ACTIVE', 'AT_RISK', 'ACHIEVED', 'PAUSED', 'CANCELLED');
CREATE TYPE "GoLiveGateStatus" AS ENUM ('PENDING', 'PASS', 'FAIL', 'WAIVED');

CREATE TABLE "AudienceContact" (
  "id" TEXT NOT NULL, "workspaceId" TEXT NOT NULL, "pseudonymousKey" TEXT NOT NULL,
  "displayName" TEXT, "email" TEXT, "phone" TEXT, "lawfulBasis" "ContactLawfulBasis" NOT NULL,
  "marketingConsent" BOOLEAN NOT NULL DEFAULT false, "consentEvidenceRef" TEXT,
  "consentedAt" TIMESTAMP(3), "optedOutAt" TIMESTAMP(3), "retentionUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AudienceContact_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AudienceContact_workspaceId_pseudonymousKey_key" ON "AudienceContact"("workspaceId","pseudonymousKey");
CREATE INDEX "AudienceContact_workspaceId_marketingConsent_optedOutAt_idx" ON "AudienceContact"("workspaceId","marketingConsent","optedOutAt");

CREATE TABLE "CreatorProfile" (
  "id" TEXT NOT NULL, "workspaceId" TEXT NOT NULL, "displayName" TEXT NOT NULL,
  "status" "CreatorProfileStatus" NOT NULL DEFAULT 'DRAFT', "countryCode" TEXT,
  "languageCodes" TEXT[] DEFAULT ARRAY[]::TEXT[], "platformHandles" JSONB,
  "capabilityTags" TEXT[] DEFAULT ARRAY[]::TEXT[], "rateCard" JSONB,
  "identityVerifiedAt" TIMESTAMP(3), "rightsVerifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CreatorProfile_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CreatorProfile_workspaceId_status_idx" ON "CreatorProfile"("workspaceId","status");

CREATE TABLE "CreatorEngagement" (
  "id" TEXT NOT NULL, "workspaceId" TEXT NOT NULL, "creatorId" TEXT NOT NULL,
  "campaignId" TEXT, "status" "CreatorEngagementStatus" NOT NULL DEFAULT 'DRAFT',
  "brief" JSONB NOT NULL, "agreedAmount" DECIMAL(12,2), "currency" TEXT NOT NULL DEFAULT 'EUR',
  "dueAt" TIMESTAMP(3), "acceptedAt" TIMESTAMP(3), "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CreatorEngagement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CreatorEngagement_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CreatorEngagement_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "CreatorEngagement_workspaceId_status_dueAt_idx" ON "CreatorEngagement"("workspaceId","status","dueAt");
CREATE INDEX "CreatorEngagement_workspaceId_creatorId_idx" ON "CreatorEngagement"("workspaceId","creatorId");

CREATE TABLE "CreatorDeliverable" (
  "id" TEXT NOT NULL, "workspaceId" TEXT NOT NULL, "engagementId" TEXT NOT NULL,
  "mediaAssetId" TEXT, "status" "CreatorDeliverableStatus" NOT NULL DEFAULT 'REQUESTED',
  "version" INTEGER NOT NULL DEFAULT 1, "notes" TEXT, "rightsApproved" BOOLEAN NOT NULL DEFAULT false,
  "submittedAt" TIMESTAMP(3), "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreatorDeliverable_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CreatorDeliverable_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "CreatorEngagement"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CreatorDeliverable_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CreatorDeliverable_engagementId_version_key" ON "CreatorDeliverable"("engagementId","version");
CREATE INDEX "CreatorDeliverable_workspaceId_status_idx" ON "CreatorDeliverable"("workspaceId","status");

CREATE TABLE "ComplianceEvidence" (
  "id" TEXT NOT NULL, "workspaceId" TEXT NOT NULL, "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL, "evidenceKind" TEXT NOT NULL, "reference" TEXT NOT NULL,
  "checksum" TEXT, "verifiedBy" TEXT, "verifiedAt" TIMESTAMP(3), "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ComplianceEvidence_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ComplianceEvidence_workspaceId_entityType_entityId_idx" ON "ComplianceEvidence"("workspaceId","entityType","entityId");
CREATE INDEX "ComplianceEvidence_workspaceId_expiresAt_idx" ON "ComplianceEvidence"("workspaceId","expiresAt");

CREATE TABLE "ExecutiveObjective" (
  "id" TEXT NOT NULL, "workspaceId" TEXT NOT NULL, "title" TEXT NOT NULL,
  "metricKey" TEXT NOT NULL, "targetValue" DECIMAL(14,4) NOT NULL,
  "currentValue" DECIMAL(14,4), "status" "ExecutiveObjectiveStatus" NOT NULL DEFAULT 'DRAFT',
  "riskTolerance" TEXT NOT NULL DEFAULT 'conservative', "startsAt" TIMESTAMP(3), "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExecutiveObjective_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ExecutiveObjective_workspaceId_status_idx" ON "ExecutiveObjective"("workspaceId","status");

CREATE TABLE "OperationalKillSwitch" (
  "id" TEXT NOT NULL, "workspaceId" TEXT NOT NULL, "scopeType" TEXT NOT NULL,
  "scopeId" TEXT, "reason" TEXT NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true,
  "activatedBy" TEXT NOT NULL, "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "releasedBy" TEXT, "releasedAt" TIMESTAMP(3),
  CONSTRAINT "OperationalKillSwitch_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OperationalKillSwitch_workspaceId_active_scopeType_idx" ON "OperationalKillSwitch"("workspaceId","active","scopeType");

CREATE TABLE "GoLiveGate" (
  "id" TEXT NOT NULL, "workspaceId" TEXT NOT NULL, "gateKey" TEXT NOT NULL,
  "status" "GoLiveGateStatus" NOT NULL DEFAULT 'PENDING', "required" BOOLEAN NOT NULL DEFAULT true,
  "evidenceReference" TEXT, "notes" TEXT, "checkedAt" TIMESTAMP(3), "checkedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GoLiveGate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GoLiveGate_workspaceId_gateKey_key" ON "GoLiveGate"("workspaceId","gateKey");
CREATE INDEX "GoLiveGate_workspaceId_status_required_idx" ON "GoLiveGate"("workspaceId","status","required");
