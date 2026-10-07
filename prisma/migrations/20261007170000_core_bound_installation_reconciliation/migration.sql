ALTER TABLE "WorkflowStepRun"
  ADD COLUMN IF NOT EXISTS "nextAttemptAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "claimedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "claimToken" TEXT,
  ADD COLUMN IF NOT EXISTS "leaseExpiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "heartbeatAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "attemptCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "state" TEXT NOT NULL DEFAULT 'READY';

CREATE UNIQUE INDEX IF NOT EXISTS "WorkflowStepRun_claimToken_key" ON "WorkflowStepRun"("claimToken") WHERE "claimToken" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "WorkflowStepRun_claimable_idx" ON "WorkflowStepRun"("workspaceId", "state", "nextAttemptAt", "leaseExpiresAt");

CREATE TABLE IF NOT EXISTS "AgentCapabilityRegistration" (
  "id" TEXT PRIMARY KEY, "workspaceId" TEXT NOT NULL, "agentKey" TEXT NOT NULL, "version" INTEGER NOT NULL DEFAULT 1,
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE, "health" TEXT NOT NULL DEFAULT 'ONLINE', "capabilities" JSONB NOT NULL,
  "allowedToolKeys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "providerKeys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "currentLoad" INTEGER NOT NULL DEFAULT 0, "maxConcurrency" INTEGER NOT NULL DEFAULT 1,
  "estimatedCostPerTask" DECIMAL(12,4) NOT NULL DEFAULT 0, "averageLatencyMs" INTEGER NOT NULL DEFAULT 0,
  "successRate" DECIMAL(5,4) NOT NULL DEFAULT 1, "priority" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "AgentCapabilityRegistration_workspace_agent_version_key" ON "AgentCapabilityRegistration"("workspaceId","agentKey","version");
CREATE INDEX IF NOT EXISTS "AgentCapabilityRegistration_workspace_health_idx" ON "AgentCapabilityRegistration"("workspaceId","health","enabled");

CREATE TABLE IF NOT EXISTS "AgentCapacityReservation" (
  "id" TEXT PRIMARY KEY, "workspaceId" TEXT NOT NULL, "agentRegistrationId" TEXT NOT NULL REFERENCES "AgentCapabilityRegistration"("id") ON DELETE CASCADE,
  "workflowStepRunId" TEXT NOT NULL, "reservationToken" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'RESERVED',
  "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "releasedAt" TIMESTAMP(3)
);
CREATE UNIQUE INDEX IF NOT EXISTS "AgentCapacityReservation_workspace_step_key" ON "AgentCapacityReservation"("workspaceId","workflowStepRunId");
CREATE UNIQUE INDEX IF NOT EXISTS "AgentCapacityReservation_reservationToken_key" ON "AgentCapacityReservation"("reservationToken");
CREATE INDEX IF NOT EXISTS "AgentCapacityReservation_workspace_status_expiry_idx" ON "AgentCapacityReservation"("workspaceId","status","expiresAt");

CREATE TABLE IF NOT EXISTS "CarryOsPluginBinding" (
  "id" TEXT PRIMARY KEY, "tenantId" TEXT NOT NULL, "workspaceId" TEXT NOT NULL, "pluginInstallationId" TEXT NOT NULL,
  "servicePrincipalId" TEXT NOT NULL, "contractVersion" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "revokedAt" TIMESTAMP(3)
);
CREATE UNIQUE INDEX IF NOT EXISTS "CarryOsPluginBinding_tenant_installation_key" ON "CarryOsPluginBinding"("tenantId","pluginInstallationId");
CREATE UNIQUE INDEX IF NOT EXISTS "CarryOsPluginBinding_tenant_workspace_key" ON "CarryOsPluginBinding"("tenantId","workspaceId");
CREATE INDEX IF NOT EXISTS "CarryOsPluginBinding_tenant_status_idx" ON "CarryOsPluginBinding"("tenantId","status");
CREATE INDEX IF NOT EXISTS "CarryOsPluginBinding_service_principal_idx" ON "CarryOsPluginBinding"("servicePrincipalId");
