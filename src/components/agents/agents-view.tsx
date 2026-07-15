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
import { AGENT_STATUS_LABELS } from "@/lib/status-labels";
import { apiPost, apiPatch } from "@/lib/client/api";

export interface AgentRow {
  id: string;
  name: string;
  role: string;
  description: string | null;
  status: string;
  lastRunAt: string | null;
}

export function AgentsView({ agents }: { agents: AgentRow[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ key: "", name: "", role: "", description: "" });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.key.trim() || !form.name.trim() || !form.role.trim()) {
      setError("Key, Name und Rolle sind erforderlich.");
      return;
    }
    setPending(true);
    const res = await apiPost("/api/agents", form);
    setPending(false);
    if (res.ok) {
      toast.success("Agent erstellt");
      setShowForm(false);
      setForm({ key: "", name: "", role: "", description: "" });
      router.refresh();
    } else {
      setError(res.error ?? "Erstellung fehlgeschlagen.");
    }
  }

  async function toggle(id: string, next: "PAUSED" | "IDLE") {
    const res = await apiPatch(`/api/agents/${id}`, { status: next });
    if (res.ok) router.refresh();
    else toast.error(res.error ?? "Aktion fehlgeschlagen.");
  }

  async function run(id: string) {
    const res = await apiPost(`/api/agents/${id}/run`, {});
    if (res.ok) {
      toast.success("Run gestartet");
      router.refresh();
    } else toast.error(res.error ?? "Start fehlgeschlagen.");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--color-foreground-muted)]">{agents.length} Agenten</p>
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? "Abbrechen" : "Agent anlegen"}</Button>
      </div>

      {showForm ? (
        <Card>
          <CardHeader><CardTitle className="text-base">Neuer Agent</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={create} className="grid gap-4 sm:grid-cols-2">
              <FormField label="Key" htmlFor="key" required>
                <Input id="key" value={form.key} onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))} />
              </FormField>
              <FormField label="Name" htmlFor="name" required>
                <Input id="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </FormField>
              <FormField label="Rolle" htmlFor="role" required>
                <Input id="role" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} />
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
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Rolle</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Letzter Run</th>
              <th className="px-3 py-2 font-medium text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((a) => (
              <tr key={a.id} className="border-t border-[var(--color-border)]">
                <td className="px-3 py-2">
                  <button className="text-left font-medium hover:underline" onClick={() => router.push(`/app/agents/${a.id}`)}>
                    {a.name}
                  </button>
                  {a.description ? <p className="text-xs text-[var(--color-foreground-subtle)]">{a.description}</p> : null}
                </td>
                <td className="px-3 py-2">{a.role}</td>
                <td className="px-3 py-2"><Badge variant="outline">{AGENT_STATUS_LABELS[a.status as keyof typeof AGENT_STATUS_LABELS] ?? a.status}</Badge></td>
                <td className="px-3 py-2">{a.lastRunAt ? new Date(a.lastRunAt).toLocaleDateString("de-DE") : "—"}</td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => run(a.id)}>Run</Button>
                    {a.status === "PAUSED" ? (
                      <Button size="sm" variant="outline" onClick={() => toggle(a.id, "IDLE")}>Aktivieren</Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => toggle(a.id, "PAUSED")}>Pausieren</Button>
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
