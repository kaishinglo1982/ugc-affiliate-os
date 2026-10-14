import type { Metadata } from "next";
import Link from "next/link";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
import { listAgentRuns } from "@/server/services/agents";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Agent Runs" };

export default async function AgentRunsPage() {
  const workspaceId = await resolveWorkspaceId();
  const runs = await listAgentRuns(workspaceId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Agent Runs</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">{runs.length} Runs</p>
      </div>
      <div className="overflow-x-auto rounded-md border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface)] text-left text-[var(--color-foreground-subtle)]">
            <tr>
              <th className="px-3 py-2">Agent</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Start</th>
              <th className="px-3 py-2">Ende</th>
              <th className="px-3 py-2">Fehlercode</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id} className="border-t border-[var(--color-border)]">
                <td className="px-3 py-2 font-medium">{r.agent?.name ?? r.agentId}</td>
                <td className="px-3 py-2"><Badge variant="outline">{r.status}</Badge></td>
                <td className="px-3 py-2">{new Date(r.startedAt).toLocaleString("de-DE")}</td>
                <td className="px-3 py-2">{r.finishedAt ? new Date(r.finishedAt).toLocaleString("de-DE") : "—"}</td>
                <td className="px-3 py-2">{r.logs && typeof r.logs === "object" && "errorCode" in r.logs ? String((r.logs as Record<string, unknown>).errorCode) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[var(--color-foreground-subtle)]">
        Detailansicht: <Link href="/app/agent-runs" className="underline">Run-ID in Audit suchen</Link>.
      </p>
    </div>
  );
}
