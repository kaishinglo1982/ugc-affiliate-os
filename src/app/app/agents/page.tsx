import type { Metadata } from "next";
import { listAgents } from "@/server/services/agents";
import { AgentsView, type AgentRow } from "@/components/agents/agents-view";

export const metadata: Metadata = { title: "Agenten-Registry" };

export default async function AgentsPage() {
  const agents = await listAgents();

  const rows: AgentRow[] = agents.map((a) => ({
    id: a.id,
    name: a.name,
    role: a.role,
    description: a.description ?? null,
    status: a.status,
    lastRunAt: a.lastRunAt ? a.lastRunAt.toISOString() : null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Agenten-Registry</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Registrierte Agenten, Policies und Laufhistorie.
        </p>
      </div>
      <AgentsView agents={rows} />
    </div>
  );
}
