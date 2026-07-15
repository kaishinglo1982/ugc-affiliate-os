"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WORKFLOW_STATUS_LABELS, WORKFLOW_RUN_STATUS_LABELS } from "@/lib/status-labels";
import { apiPost } from "@/lib/client/api";

export interface WorkflowStep {
  id: string;
  name: string;
  type: string;
  stepOrder: number;
}
export interface WorkflowRun {
  id: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
}

export function WorkflowDetailView({
  id,
  name,
  description,
  status,
  steps,
  runs,
}: {
  id: string;
  name: string;
  description: string | null;
  status: string;
  steps: WorkflowStep[];
  runs: WorkflowRun[];
}) {
  const router = useRouter();
  const [stepName, setStepName] = useState("");
  const [stepType, setStepType] = useState("task");
  const [pending, setPending] = useState(false);

  async function addStep(e: React.FormEvent) {
    e.preventDefault();
    if (!stepName.trim()) return;
    setPending(true);
    const res = await apiPost(`/api/workflows/${id}/steps`, { name: stepName, type: stepType });
    setPending(false);
    if (res.ok) {
      toast.success("Step hinzugefügt");
      setStepName("");
      router.refresh();
    } else toast.error(res.error ?? "Hinzufügen fehlgeschlagen.");
  }

  async function run() {
    const res = await apiPost(`/api/workflows/${id}/run`, {});
    if (res.ok) {
      toast.success("Run gestartet");
      router.refresh();
    } else toast.error(res.error ?? "Start fehlgeschlagen.");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Steps</CardTitle>
          <Badge variant="outline">{WORKFLOW_STATUS_LABELS[status as keyof typeof WORKFLOW_STATUS_LABELS] ?? status}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="space-y-2">
            {steps.map((s) => (
              <li key={s.id} className="flex items-center justify-between rounded-md border border-[var(--color-border)] px-3 py-2 text-sm">
                <span><span className="text-[var(--color-foreground-subtle)]">{s.stepOrder}.</span> {s.name}</span>
                <Badge variant="outline">{s.type}</Badge>
              </li>
            ))}
          </ol>
          <form onSubmit={addStep} className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <Input placeholder="Step-Name" value={stepName} onChange={(e) => setStepName(e.target.value)} />
            <Input placeholder="Typ" value={stepType} onChange={(e) => setStepType(e.target.value)} className="w-28" />
            <Button type="submit" disabled={pending}>{pending ? "…" : "Add"}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Runs</CardTitle>
          <Button size="sm" onClick={run}>Run starten</Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-[var(--color-border)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-surface)] text-left text-[var(--color-foreground-subtle)]">
                <tr><th className="px-3 py-2">Status</th><th className="px-3 py-2">Start</th><th className="px-3 py-2">Ende</th></tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="border-t border-[var(--color-border)]">
                    <td className="px-3 py-2"><Badge variant="outline">{WORKFLOW_RUN_STATUS_LABELS[r.status as keyof typeof WORKFLOW_RUN_STATUS_LABELS] ?? r.status}</Badge></td>
                    <td className="px-3 py-2">{new Date(r.startedAt).toLocaleString("de-DE")}</td>
                    <td className="px-3 py-2">{r.finishedAt ? new Date(r.finishedAt).toLocaleString("de-DE") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
