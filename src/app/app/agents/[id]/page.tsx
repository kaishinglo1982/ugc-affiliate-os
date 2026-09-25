import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
import { getAgent } from "@/server/services/agents";
import { listAgentMemory } from "@/server/services/agent-memory";
import { prisma } from "@/lib/db/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AGENT_STATUS_LABELS, AGENT_MEMORY_TYPE_LABELS } from "@/lib/status-labels";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const agent = await getAgent(id);
  return { title: agent ? `Agent ${agent.name}` : "Agent" };
}

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workspaceId = await resolveWorkspaceId();
  const agent = await getAgent(id);
  if (!agent) notFound();

  const memory = await listAgentMemory(workspaceId, { agentKey: agent.key });
  const audit = await prisma.auditLog.findMany({
    where: { entityId: agent.id, workspaceId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/app/agents" className="text-sm text-[var(--color-foreground-subtle)] hover:underline">← Agenten</Link>
          <h1 className="text-2xl font-semibold tracking-tight">{agent.name}</h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">{agent.role}</p>
        </div>
        <Badge variant="outline">{AGENT_STATUS_LABELS[agent.status as keyof typeof AGENT_STATUS_LABELS] ?? agent.status}</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Stammdaten</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-[var(--color-foreground-subtle)]">Key:</span> {agent.key}</p>
            <p><span className="text-[var(--color-foreground-subtle)]">Beschreibung:</span> {agent.description ?? "—"}</p>
            <p><span className="text-[var(--color-foreground-subtle)]">Capabilities:</span> {agent.capabilities.join(", ") || "—"}</p>
            <p><span className="text-[var(--color-foreground-subtle)]">Erlaubte Aktionen:</span> {agent.allowedActions.join(", ") || "—"}</p>
            <p><span className="text-[var(--color-foreground-subtle)]">Runs erfolgreich/fehler:</span> {agent.successCount} / {agent.errorCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Letzte Runs</CardTitle></CardHeader>
          <CardContent>
            {agent.runs.length === 0 ? (
              <p className="text-sm text-[var(--color-foreground-subtle)]">Keine Runs.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {agent.runs.map((r) => (
                  <li key={r.id} className="flex justify-between">
                    <Link href={`/app/agent-runs?run=${r.id}`} className="hover:underline">{r.id.slice(0, 8)}</Link>
                    <span>{r.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Memory Entries ({memory.length})</CardTitle></CardHeader>
          <CardContent>
            {memory.length === 0 ? (
              <p className="text-sm text-[var(--color-foreground-subtle)]">Keine Memory-Einträge.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {memory.map((m) => (
                  <li key={m.id} className="flex justify-between">
                    <span>{m.key}</span>
                    <Badge variant="outline">{AGENT_MEMORY_TYPE_LABELS[m.type as keyof typeof AGENT_MEMORY_TYPE_LABELS] ?? m.type}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Audit-Historie</CardTitle></CardHeader>
          <CardContent>
            {audit.length === 0 ? (
              <p className="text-sm text-[var(--color-foreground-subtle)]">Keine Einträge.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {audit.map((a) => (
                  <li key={a.id} className="flex justify-between gap-2">
                    <span>{a.action}</span>
                    <span className="text-[var(--color-foreground-subtle)]">{new Date(a.createdAt).toLocaleDateString("de-DE")}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <Button asChild variant="outline"><Link href={`/app/agent-memory?agentKey=${encodeURIComponent(agent.key)}`}>Memory ansehen</Link></Button>
      </div>
    </div>
  );
}
