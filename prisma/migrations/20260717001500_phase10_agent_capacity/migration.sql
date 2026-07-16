-- Phase 10.4 — persistent capability registry and atomic capacity reservations

CREATE TABLE IF NOT EXISTS "AgentCapabilityRegistration" (
  "id" TEXT PRIMARY KEY,
  "workspaceId" TEXT NOT NULL,
  "agentKey" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "health" TEXT NOT NULL DEFAULT 'ONLINE',
  "capabilities" JSONB NOT NULL,
  "allowedToolKeys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "providerKeys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "currentLoad" INTEGER NOT NULL DEFAULT 0,
  "maxConcurrency" INTEGER NOT NULL DEFAULT 1,
  "estimatedCostPerTask" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "averageLatencyMs" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "successRate" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "heartbeatAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentCapabilityRegistration_workspace_agent_version_key"
    UNIQUE ("workspaceId", "agentKey", "version"),
  CONSTRAINT "AgentCapabilityRegistration_capacity_check"
    CHECK ("currentLoad" >= 0 AND "maxConcurrency" > 0 AND "currentLoad" <= "maxConcurrency")
);

CREATE INDEX IF NOT EXISTS "AgentCapabilityRegistration_workspace_health_idx"
  ON "AgentCapabilityRegistration"("workspaceId", "health", "enabled");

CREATE TABLE IF NOT EXISTS "AgentCapacityReservation" (
  "id" TEXT PRIMARY KEY,
  "workspaceId" TEXT NOT NULL,
  "agentRegistrationId" TEXT NOT NULL REFERENCES "AgentCapabilityRegistration"("id") ON DELETE CASCADE,
  "workflowStepRunId" TEXT NOT NULL,
  "reservationToken" TEXT NOT NULL UNIQUE,
  "status" TEXT NOT NULL DEFAULT 'RESERVED',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "releasedAt" TIMESTAMP(3),
  CONSTRAINT "AgentCapacityReservation_workspace_step_key"
    UNIQUE ("workspaceId", "workflowStepRunId")
);

CREATE INDEX IF NOT EXISTS "AgentCapacityReservation_workspace_status_expires_idx"
  ON "AgentCapacityReservation"("workspaceId", "status", "expiresAt");
