-- CreateEnum
CREATE TYPE "ContentBriefStatus" AS ENUM ('DRAFT', 'APPROVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ContentHookStatus" AS ENUM ('IDEA', 'DRAFT', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WorkflowStepType" AS ENUM ('AGENT', 'TOOL', 'APPROVAL', 'CONDITION');

-- CreateEnum
CREATE TYPE "WorkflowRunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AgentToolRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "CostReservationStatus" AS ENUM ('RESERVED', 'CONSUMED', 'RELEASED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AgentMemoryType" AS ENUM ('FACT', 'PREFERENCE', 'CONTEXT');

-- AlterTable
ALTER TABLE "Approval" ADD COLUMN     "cost" DECIMAL(12,2),
ADD COLUMN     "currency" TEXT,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "payload" JSONB;

-- CreateTable
CREATE TABLE "ContentBrief" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "campaignId" TEXT,
    "objective" TEXT NOT NULL,
    "targetAudience" TEXT,
    "platform" TEXT,
    "hookAngle" TEXT,
    "notes" TEXT,
    "status" "ContentBriefStatus" NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentBrief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentHook" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "briefId" TEXT NOT NULL,
    "angle" TEXT NOT NULL,
    "body" TEXT,
    "score" DECIMAL(3,2),
    "status" "ContentHookStatus" NOT NULL DEFAULT 'IDEA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentHook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowDefinition" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trigger" TEXT NOT NULL DEFAULT 'manual',
    "scheduleCron" TEXT,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'DRAFT',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" TEXT,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowStepDefinition" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "workflowId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "type" "WorkflowStepType" NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB,

    CONSTRAINT "WorkflowStepDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowRun" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "workflowId" TEXT NOT NULL,
    "triggeredBy" TEXT,
    "status" "WorkflowRunStatus" NOT NULL DEFAULT 'RUNNING',
    "context" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "WorkflowRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowStepRun" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "workflowRunId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "status" "WorkflowRunStatus" NOT NULL DEFAULT 'RUNNING',
    "output" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "WorkflowStepRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentToolDefinition" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "provider" TEXT,
    "riskLevel" "AgentToolRiskLevel" NOT NULL DEFAULT 'LOW',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "schema" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentToolDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentToolPolicy" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "toolId" TEXT NOT NULL,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "maxCostPerCall" DECIMAL(12,2),
    "rateLimitPerMin" INTEGER,
    "allowedAgentKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentToolPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentToolCall" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "agentRunId" TEXT,
    "toolId" TEXT NOT NULL,
    "input" JSONB,
    "output" JSONB,
    "cost" DECIMAL(12,2),
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "durationMs" INTEGER,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentToolCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetPolicy" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "name" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'global',
    "limitAmount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "period" TEXT NOT NULL DEFAULT 'monthly',
    "alertThresholdPct" INTEGER NOT NULL DEFAULT 80,
    "action" TEXT NOT NULL DEFAULT 'alert',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostReservation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "policyId" TEXT,
    "ownerType" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" "CostReservationStatus" NOT NULL DEFAULT 'RESERVED',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentMemoryEntry" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "agentKey" TEXT NOT NULL,
    "type" "AgentMemoryType" NOT NULL DEFAULT 'FACT',
    "key" TEXT NOT NULL,
    "value" JSONB,
    "importance" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentMemoryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentBrief_workspaceId_status_idx" ON "ContentBrief"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "ContentBrief_campaignId_idx" ON "ContentBrief"("campaignId");

-- CreateIndex
CREATE INDEX "ContentHook_workspaceId_briefId_idx" ON "ContentHook"("workspaceId", "briefId");

-- CreateIndex
CREATE INDEX "WorkflowDefinition_workspaceId_status_idx" ON "WorkflowDefinition"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "WorkflowStepDefinition_workspaceId_workflowId_idx" ON "WorkflowStepDefinition"("workspaceId", "workflowId");

-- CreateIndex
CREATE INDEX "WorkflowRun_workspaceId_workflowId_status_idx" ON "WorkflowRun"("workspaceId", "workflowId", "status");

-- CreateIndex
CREATE INDEX "WorkflowStepRun_workspaceId_workflowRunId_idx" ON "WorkflowStepRun"("workspaceId", "workflowRunId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentToolDefinition_name_key" ON "AgentToolDefinition"("name");

-- CreateIndex
CREATE INDEX "AgentToolDefinition_workspaceId_enabled_idx" ON "AgentToolDefinition"("workspaceId", "enabled");

-- CreateIndex
CREATE INDEX "AgentToolPolicy_workspaceId_toolId_idx" ON "AgentToolPolicy"("workspaceId", "toolId");

-- CreateIndex
CREATE INDEX "AgentToolCall_workspaceId_agentRunId_idx" ON "AgentToolCall"("workspaceId", "agentRunId");

-- CreateIndex
CREATE INDEX "AgentToolCall_workspaceId_toolId_idx" ON "AgentToolCall"("workspaceId", "toolId");

-- CreateIndex
CREATE INDEX "BudgetPolicy_workspaceId_scope_idx" ON "BudgetPolicy"("workspaceId", "scope");

-- CreateIndex
CREATE INDEX "CostReservation_workspaceId_ownerType_ownerId_idx" ON "CostReservation"("workspaceId", "ownerType", "ownerId");

-- CreateIndex
CREATE INDEX "CostReservation_workspaceId_status_idx" ON "CostReservation"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "AgentMemoryEntry_workspaceId_agentKey_idx" ON "AgentMemoryEntry"("workspaceId", "agentKey");

-- CreateIndex
CREATE INDEX "AgentMemoryEntry_workspaceId_agentKey_key_idx" ON "AgentMemoryEntry"("workspaceId", "agentKey", "key");

-- AddForeignKey
ALTER TABLE "ContentBrief" ADD CONSTRAINT "ContentBrief_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentHook" ADD CONSTRAINT "ContentHook_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "ContentBrief"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStepDefinition" ADD CONSTRAINT "WorkflowStepDefinition_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "WorkflowDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowRun" ADD CONSTRAINT "WorkflowRun_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "WorkflowDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStepRun" ADD CONSTRAINT "WorkflowStepRun_workflowRunId_fkey" FOREIGN KEY ("workflowRunId") REFERENCES "WorkflowRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStepRun" ADD CONSTRAINT "WorkflowStepRun_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "WorkflowStepDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentToolPolicy" ADD CONSTRAINT "AgentToolPolicy_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "AgentToolDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentToolCall" ADD CONSTRAINT "AgentToolCall_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "AgentRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentToolCall" ADD CONSTRAINT "AgentToolCall_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "AgentToolDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostReservation" ADD CONSTRAINT "CostReservation_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "BudgetPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
