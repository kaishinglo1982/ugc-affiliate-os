import type { Metadata } from "next";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
import { listWorkflows } from "@/server/services/workflows";
import { WorkflowsView, type WorkflowRow } from "@/components/workflows/workflows-view";

export const metadata: Metadata = { title: "Workflows" };

export default async function WorkflowsPage() {
  const workspaceId = await resolveWorkspaceId();
  const workflows = await listWorkflows(workspaceId);

  const rows: WorkflowRow[] = workflows.map((w) => ({
    id: w.id,
    name: w.name,
    description: w.description ?? null,
    status: w.status,
    trigger: w.trigger,
    stepCount: w.steps.length,
    lastRunAt: w.runs[0]?.startedAt ? w.runs[0].startedAt.toISOString() : null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Workflows</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Workflow-Definitionen, Steps und Ausführungen.
        </p>
      </div>
      <WorkflowsView workflows={rows} />
    </div>
  );
}
