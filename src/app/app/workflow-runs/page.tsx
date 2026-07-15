import type { Metadata } from "next";
import Link from "next/link";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
import { listWorkflowRuns } from "@/server/services/workflows";
import { Badge } from "@/components/ui/badge";
import { WORKFLOW_RUN_STATUS_LABELS } from "@/lib/status-labels";

export const metadata: Metadata = { title: "Workflow Runs" };

export default async function WorkflowRunsPage() {
  const workspaceId = await resolveWorkspaceId();
  const runs = await listWorkflowRuns(workspaceId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Workflow Runs</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">{runs.length} Ausführungen</p>
      </div>
      <div className="overflow-x-auto rounded-md border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface)] text-left text-[var(--color-foreground-subtle)]">
            <tr>
              <th className="px-3 py-2">Workflow</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Trigger</th>
              <th className="px-3 py-2">Start</th>
              <th className="px-3 py-2">Schritte</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id} className="border-t border-[var(--color-border)]">
                <td className="px-3 py-2 font-medium">{r.workflow?.name ?? r.workflowId}</td>
                <td className="px-3 py-2"><Badge variant="outline">{WORKFLOW_RUN_STATUS_LABELS[r.status as keyof typeof WORKFLOW_RUN_STATUS_LABELS] ?? r.status}</Badge></td>
                <td className="px-3 py-2">{r.triggeredBy ?? "—"}</td>
                <td className="px-3 py-2">{new Date(r.startedAt).toLocaleString("de-DE")}</td>
                <td className="px-3 py-2">{r.steps.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[var(--color-foreground-subtle)]">Run-Details mit Cancel/Retry über <Link href="/app/workflow-runs" className="underline">Audit-Log</Link>.</p>
    </div>
  );
}
