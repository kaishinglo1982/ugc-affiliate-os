import type { Metadata } from "next";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
import { listAgentTools } from "@/server/services/agents";
import { ToolsView, type ToolRow } from "@/components/agents/tools-view";

export const metadata: Metadata = { title: "Tool Governance" };

export default async function AgentToolsPage() {
  const workspaceId = await resolveWorkspaceId();
  const tools = await listAgentTools(workspaceId);

  const rows: ToolRow[] = tools.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description ?? null,
    riskLevel: t.riskLevel,
    enabled: t.enabled,
    policyCount: t.policies.length,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tool Governance</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Tool-Registry, Risiken und Policies für Agentenaktionen.
        </p>
      </div>
      <ToolsView tools={rows} />
    </div>
  );
}
