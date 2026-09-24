-- Extend workspace ownership to agent runtime state. RLS stays disabled until
-- all productive paths are transaction-bound and negative cross-tenant tests pass.

ALTER TABLE "Agent" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "AgentRun" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

CREATE INDEX "Agent_workspaceId_idx" ON "Agent"("workspaceId");
CREATE INDEX "AgentRun_workspaceId_agentId_idx" ON "AgentRun"("workspaceId", "agentId");
