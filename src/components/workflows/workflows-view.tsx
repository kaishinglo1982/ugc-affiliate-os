"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WORKFLOW_STATUS_LABELS } from "@/lib/status-labels";
import { apiPost, apiPatch } from "@/lib/client/api";

export interface WorkflowRow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  trigger: string;
  stepCount: number;
  lastRunAt: string | null;
}

export function WorkflowsView({ workflows }: { workflows: WorkflowRow[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", trigger: "manual" });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Name ist erforderlich.");
      return;
    }
    setPending(true);
    const res = await apiPost("/api/workflows", { name: form.name, description: form.description || undefined, trigger: form.trigger });
    setPending(false);
    if (res.ok) {
      toast.success("Workflow erstellt");
      setShowForm(false);
      setForm({ name: "", description: "", trigger: "manual" });
      router.refresh();
    } else setError(res.error ?? "Erstellung fehlgeschlagen.");
  }

  async function toggle(id: string, next: "ACTIVE" | "PAUSED") {
    const res = await apiPatch(`/api/workflows/${id}`, { status: next });
    if (res.ok) router.refresh();
    else toast.error(res.error ?? "Aktion fehlgeschlagen.");
  }

  async function run(id: string) {
    const res = await apiPost(`/api/workflows/${id}/run`, {});
    if (res.ok) {
      toast.success("Run gestartet");
      router.refresh();
    } else toast.error(res.error ?? "Start fehlgeschlagen.");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--color-foreground-muted)]">{workflows.length} Workflows</p>
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? "Abbrechen" : "Workflow erstellen"}</Button>
      </div>

      {showForm ? (
        <Card>
          <CardHeader><CardTitle className="text-base">Neuer Workflow</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={create} className="grid gap-4 sm:grid-cols-2">
              <FormField label="Name" htmlFor="name" required>
                <Input id="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </FormField>
              <FormField label="Trigger" htmlFor="trigger">
                <Input id="trigger" value={form.trigger} onChange={(e) => setForm((f) => ({ ...f, trigger: e.target.value }))} />
              </FormField>
              <FormField label="Beschreibung" htmlFor="description" className="sm:col-span-2">
                <Textarea id="description" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </FormField>
              {error ? <p role="alert" className="text-sm text-[var(--color-destructive)] sm:col-span-2">{error}</p> : null}
              <Button type="submit" disabled={pending} className="sm:col-span-2">{pending ? "Speichern…" : "Speichern"}</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="overflow-x-auto rounded-md border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface)] text-left text-[var(--color-foreground-subtle)]">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Trigger</th>
              <th className="px-3 py-2">Schritte</th>
              <th className="px-3 py-2">Letzter Run</th>
              <th className="px-3 py-2 text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {workflows.map((w) => (
              <tr key={w.id} className="border-t border-[var(--color-border)]">
                <td className="px-3 py-2">
                  <button className="text-left font-medium hover:underline" onClick={() => router.push(`/app/workflows/${w.id}`)}>{w.name}</button>
                  {w.description ? <p className="text-xs text-[var(--color-foreground-subtle)]">{w.description}</p> : null}
                </td>
                <td className="px-3 py-2"><Badge variant="outline">{WORKFLOW_STATUS_LABELS[w.status as keyof typeof WORKFLOW_STATUS_LABELS] ?? w.status}</Badge></td>
                <td className="px-3 py-2">{w.trigger}</td>
                <td className="px-3 py-2">{w.stepCount}</td>
                <td className="px-3 py-2">{w.lastRunAt ? new Date(w.lastRunAt).toLocaleDateString("de-DE") : "—"}</td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => run(w.id)}>Run</Button>
                    {w.status === "ACTIVE" ? (
                      <Button size="sm" variant="outline" onClick={() => toggle(w.id, "PAUSED")}>Pausieren</Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => toggle(w.id, "ACTIVE")}>Aktivieren</Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
