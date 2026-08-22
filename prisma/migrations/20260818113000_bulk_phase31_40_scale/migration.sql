-- Bulk phases 31-40: global growth, governed distribution and scale certification.

CREATE TYPE "GrowthExperimentStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'PAUSED', 'COMPLETED', 'STOPPED');
CREATE TYPE "LocalizationStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'REJECTED');
CREATE TYPE "DistributionStatus" AS ENUM ('QUEUED', 'DELIVERING', 'DELIVERED', 'FAILED', 'REVOKED');
CREATE TYPE "ForecastScenario" AS ENUM ('DOWNSIDE', 'BASE', 'UPSIDE', 'STRESS');
CREATE TYPE "BrandAssetStatus" AS ENUM ('DRAFT', 'APPROVED', 'BLOCKED', 'EXPIRED', 'ARCHIVED');
CREATE TYPE "PartnerConnectionStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED');
CREATE TYPE "DataExportStatus" AS ENUM ('REQUESTED', 'APPROVED', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED');
CREATE TYPE "ReliabilitySeverity" AS ENUM ('SEV1', 'SEV2', 'SEV3', 'SEV4');
CREATE TYPE "ReliabilityIncidentStatus" AS ENUM ('OPEN', 'MITIGATING', 'MONITORING', 'RESOLVED', 'CLOSED');
CREATE TYPE "ScaleGateStatus" AS ENUM ('PENDING', 'PASS', 'FAIL', 'WAIVED');

CREATE TABLE "GrowthExperimentPlan" (
  "id" TEXT NOT NULL, "workspaceId" TEXT NOT NULL, "name" TEXT NOT NULL,
  "hypothesis" TEXT NOT NULL, "primaryMetric" TEXT NOT NULL,
  "budgetLimit" DECIMAL(12,2) NOT NULL, "currency" TEXT NOT NULL DEFAULT 'EUR',
  "stopRule" TEXT NOT NULL, "status" "GrowthExperimentStatus" NOT NULL DEFAULT 'DRAFT',
  "approvalId" TEXT, "ownerId" TEXT, "startsAt" TIMESTAMP(3), "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GrowthExperimentPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LocalizationProject" (
  "id" TEXT NOT NULL, "workspaceId" TEXT NOT NULL, "sourceEntityType" TEXT NOT NULL,
  "sourceEntityId" TEXT NOT NULL, "marketCode" TEXT NOT NULL, "languageCode" TEXT NOT NULL,
  "status" "LocalizationStatus" NOT NULL DEFAULT 'DRAFT', "content" JSONB NOT NULL,
  "disclosureSnapshot" JSONB, "culturalQaNotes" TEXT, "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "LocalizationProject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DistributionSyndication" (
  "id" TEXT NOT NULL, "workspaceId" TEXT NOT NULL, "sourceEntityType" TEXT NOT NULL,
  "sourceEntityId" TEXT NOT NULL, "destinationType" TEXT NOT NULL, "destinationId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL, "rightsEvidenceRef" TEXT NOT NULL,
  "status" "DistributionStatus" NOT NULL DEFAULT 'QUEUED', "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "lastErrorCode" TEXT, "deliveredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DistributionSyndication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AttributionTouchpoint" (
  "id" TEXT NOT NULL, "workspaceId" TEXT NOT NULL, "pseudonymousKey" TEXT NOT NULL,
  "source" TEXT NOT NULL, "channel" TEXT NOT NULL, "campaignId" TEXT,
  "eventType" TEXT NOT NULL, "eventValue" DECIMAL(14,4), "currency" TEXT,
  "confidence" DECIMAL(4,3) NOT NULL, "observedAt" TIMESTAMP(3) NOT NULL,
  "metadata" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AttributionTouchpoint_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinancialForecast" (
  "id" TEXT NOT NULL, "workspaceId" TEXT NOT NULL, "name" TEXT NOT NULL,
  "scenario" "ForecastScenario" NOT NULL, "horizonDays" INTEGER NOT NULL,
  "modelVersion" TEXT NOT NULL, "assumptions" JSONB NOT NULL,
  "projectedRevenue" DECIMAL(14,2) NOT NULL, "projectedCost" DECIMAL(14,2) NOT NULL,
  "confidence" DECIMAL(4,3) NOT NULL, "approvedBy" TEXT, "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinancialForecast_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BrandAssetRegistry" (
  "id" TEXT NOT NULL, "workspaceId" TEXT NOT NULL, "name" TEXT NOT NULL,
  "assetType" TEXT NOT NULL, "reference" TEXT NOT NULL, "checksum" TEXT,
  "provenance" TEXT NOT NULL, "licenseEvidenceRef" TEXT NOT NULL,
  "usageConstraints" JSONB, "status" "BrandAssetStatus" NOT NULL DEFAULT 'DRAFT',
  "validFrom" TIMESTAMP(3), "validUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BrandAssetRegistry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PartnerConnection" (
  "id" TEXT NOT NULL, "workspaceId" TEXT NOT NULL, "partnerKey" TEXT NOT NULL,
  "displayName" TEXT NOT NULL, "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status" "PartnerConnectionStatus" NOT NULL DEFAULT 'PENDING', "credentialRef" TEXT,
  "expiresAt" TIMESTAMP(3), "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PartnerConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GovernedDataExport" (
  "id" TEXT NOT NULL, "workspaceId" TEXT NOT NULL, "purpose" TEXT NOT NULL,
  "lawfulBasis" TEXT NOT NULL, "dataClasses" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "retentionDays" INTEGER NOT NULL, "status" "DataExportStatus" NOT NULL DEFAULT 'REQUESTED',
  "requestedBy" TEXT NOT NULL, "approvedBy" TEXT, "outputReference" TEXT,
  "expiresAt" TIMESTAMP(3), "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GovernedDataExport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReliabilityIncident" (
  "id" TEXT NOT NULL, "workspaceId" TEXT NOT NULL, "title" TEXT NOT NULL,
  "severity" "ReliabilitySeverity" NOT NULL,
  "status" "ReliabilityIncidentStatus" NOT NULL DEFAULT 'OPEN',
  "scopeType" TEXT NOT NULL, "scopeId" TEXT, "runbookReference" TEXT NOT NULL,
  "summary" TEXT NOT NULL, "evidenceReference" TEXT,
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReliabilityIncident_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScaleCertificationGate" (
  "id" TEXT NOT NULL, "workspaceId" TEXT NOT NULL, "gateKey" TEXT NOT NULL,
  "regionCode" TEXT NOT NULL, "status" "ScaleGateStatus" NOT NULL DEFAULT 'PENDING',
  "required" BOOLEAN NOT NULL DEFAULT true, "evidenceReference" TEXT, "notes" TEXT,
  "checkedBy" TEXT, "checkedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ScaleCertificationGate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GrowthExperimentPlan_workspaceId_status_idx" ON "GrowthExperimentPlan"("workspaceId", "status");
CREATE UNIQUE INDEX "LocalizationProject_workspaceId_sourceEntityType_sourceEntityId_marketCode_languageCode_key" ON "LocalizationProject"("workspaceId", "sourceEntityType", "sourceEntityId", "marketCode", "languageCode");
CREATE INDEX "LocalizationProject_workspaceId_status_idx" ON "LocalizationProject"("workspaceId", "status");
CREATE UNIQUE INDEX "DistributionSyndication_workspaceId_idempotencyKey_key" ON "DistributionSyndication"("workspaceId", "idempotencyKey");
CREATE INDEX "DistributionSyndication_workspaceId_status_idx" ON "DistributionSyndication"("workspaceId", "status");
CREATE INDEX "AttributionTouchpoint_workspaceId_pseudonymousKey_observedAt_idx" ON "AttributionTouchpoint"("workspaceId", "pseudonymousKey", "observedAt");
CREATE INDEX "AttributionTouchpoint_workspaceId_campaignId_idx" ON "AttributionTouchpoint"("workspaceId", "campaignId");
CREATE INDEX "FinancialForecast_workspaceId_scenario_createdAt_idx" ON "FinancialForecast"("workspaceId", "scenario", "createdAt");
CREATE INDEX "BrandAssetRegistry_workspaceId_status_validUntil_idx" ON "BrandAssetRegistry"("workspaceId", "status", "validUntil");
CREATE UNIQUE INDEX "PartnerConnection_workspaceId_partnerKey_key" ON "PartnerConnection"("workspaceId", "partnerKey");
CREATE INDEX "PartnerConnection_workspaceId_status_idx" ON "PartnerConnection"("workspaceId", "status");
CREATE INDEX "GovernedDataExport_workspaceId_status_idx" ON "GovernedDataExport"("workspaceId", "status");
CREATE INDEX "ReliabilityIncident_workspaceId_status_severity_idx" ON "ReliabilityIncident"("workspaceId", "status", "severity");
CREATE UNIQUE INDEX "ScaleCertificationGate_workspaceId_gateKey_regionCode_key" ON "ScaleCertificationGate"("workspaceId", "gateKey", "regionCode");
CREATE INDEX "ScaleCertificationGate_workspaceId_regionCode_status_required_idx" ON "ScaleCertificationGate"("workspaceId", "regionCode", "status", "required");
