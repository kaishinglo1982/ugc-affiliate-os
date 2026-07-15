import type { Metadata } from "next";
import { listAgentMemory } from "@/server/services/agent-memory";
import { AgentMemoryView, type MemoryRow } from "@/components/agent-memory/agent-memory-view";

export const metadata: Metadata = { title: "Agent Memory" };

export default async function AgentMemoryPage() {
  const entries = await listAgentMemory();

  const rows: MemoryRow[] = entries.map((m) => ({
    id: m.id,
    agentKey: m.agentKey ?? null,
    type: m.type,
    key: m.key,
    value: typeof m.value === "string" ? m.value : JSON.stringify(m.value),
    expiresAt: m.expiresAt ? m.expiresAt.toISOString() : null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Agent Memory</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Persistente Agenten-Memory-Einträge (keine Secrets).
        </p>
      </div>
      <AgentMemoryView entries={rows} />
    </div>
  );
}
