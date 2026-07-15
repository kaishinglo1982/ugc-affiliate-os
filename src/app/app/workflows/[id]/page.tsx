import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getWorkflow } from "@/server/services/workflows";
import { WorkflowDetailView } from "@/components/workflows/workflow-detail-view";

export const metadata: Metadata = { title: "Workflow Detail" };

export default async function WorkflowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workflow = await getWorkflow(id);
  if (!workflow) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{workflow.name}</h1>
        {workflow.description ? <p className="text-sm text-[var(--color-foreground-muted)]">{workflow.description}</p> : null}
      </div>
      <WorkflowDetailView
        id={workflow.id}
        name={workflow.name}
        description={workflow.description ?? null}
        status={workflow.status}
        steps={workflow.steps.map((s) => ({ id: s.id, name: s.name, type: s.type, stepOrder: s.stepOrder }))}
        runs={workflow.runs.map((r) => ({ id: r.id, status: r.status, startedAt: r.startedAt.toISOString(), finishedAt: r.finishedAt ? r.finishedAt.toISOString() : null }))}
      />
    </div>
  );
}
