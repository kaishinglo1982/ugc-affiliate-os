CREATE TYPE "ProviderCapability" AS ENUM ('LLM_TEXT', 'IMAGE', 'VIDEO', 'VOICE', 'AVATAR', 'SEARCH', 'AUTOMATION');
CREATE TYPE "ProviderRoutingStrategy" AS ENUM ('FREE_FIRST', 'COST_FIRST', 'QUALITY_FIRST', 'MANUAL');
CREATE TYPE "ProviderHealthStatus" AS ENUM ('HEALTHY', 'DEGRADED', 'UNAVAILABLE', 'DISABLED');

CREATE TABLE "ProviderRoutingPolicy" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "capability" "ProviderCapability" NOT NULL,
  "strategy" "ProviderRoutingStrategy" NOT NULL DEFAULT 'FREE_FIRST',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "allowedProviderKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "deniedProviderKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "fallbackProviderKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "premiumRequiresApproval" BOOLEAN NOT NULL DEFAULT true,
  "maxCostPerCall" DECIMAL(12,6),
  "dailyBudget" DECIMAL(12,2),
  "regionAllowList" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProviderRoutingPolicy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProviderUsageRecord" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "providerKey" TEXT NOT NULL,
  "capability" "ProviderCapability" NOT NULL,
  "modelKey" TEXT,
  "requestId" TEXT,
  "inputUnits" INTEGER NOT NULL DEFAULT 0,
  "outputUnits" INTEGER NOT NULL DEFAULT 0,
  "estimatedCost" DECIMAL(12,6) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "success" BOOLEAN NOT NULL,
  "latencyMs" INTEGER,
  "errorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProviderUsageRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProviderHealthCheck" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "providerKey" TEXT NOT NULL,
  "status" "ProviderHealthStatus" NOT NULL,
  "latencyMs" INTEGER,
  "errorCode" TEXT,
  "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProviderHealthCheck_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProviderRoutingPolicy_workspaceId_capability_name_key"
  ON "ProviderRoutingPolicy"("workspaceId", "capability", "name");
CREATE INDEX "ProviderRoutingPolicy_workspaceId_capability_enabled_idx"
  ON "ProviderRoutingPolicy"("workspaceId", "capability", "enabled");
CREATE INDEX "ProviderUsageRecord_workspaceId_createdAt_idx"
  ON "ProviderUsageRecord"("workspaceId", "createdAt");
CREATE INDEX "ProviderUsageRecord_workspaceId_providerKey_capability_idx"
  ON "ProviderUsageRecord"("workspaceId", "providerKey", "capability");
CREATE INDEX "ProviderUsageRecord_requestId_idx"
  ON "ProviderUsageRecord"("requestId");
CREATE INDEX "ProviderHealthCheck_workspaceId_providerKey_checkedAt_idx"
  ON "ProviderHealthCheck"("workspaceId", "providerKey", "checkedAt");
