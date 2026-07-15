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
import { AGENT_TOOL_RISK_LABELS } from "@/lib/status-labels";
import { apiPost, apiPatch } from "@/lib/client/api";

export interface ToolRow {
  id: string;
  name: string;
  description: string | null;
  riskLevel: string;
  enabled: boolean;
  policyCount: number;
}

export function ToolsView({ tools }: { tools: ToolRow[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", provider: "", riskLevel: "LOW", maxCostPerCall: "", rateLimitPerMin: "", requiresApproval: false });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Name ist erforderlich.");
      return;
    }
    setPending(true);
    const res = await apiPost("/api/agents/tools", {
      name: form.name,
      description: form.description || undefined,
      provider: form.provider || undefined,
      riskLevel: form.riskLevel,
      policy: {
        requiresApproval: form.requiresApproval,
        maxCostPerCall: form.maxCostPerCall ? Number(form.maxCostPerCall) : undefined,
        rateLimitPerMin: form.rateLimitPerMin ? Number(form.rateLimitPerMin) : undefined,
      },
    });
    setPending(false);
    if (res.ok) {
      toast.success("Tool erstellt");
      setShowForm(false);
      setForm({ name: "", description: "", provider: "", riskLevel: "LOW", maxCostPerCall: "", rateLimitPerMin: "", requiresApproval: false });
      router.refresh();
    } else setError(res.error ?? "Erstellung fehlgeschlagen.");
  }

  async function toggle(id: string, enabled: boolean) {
    const res = await apiPatch(`/api/agents/tools/${id}`, { enabled });
    if (res.ok) router.refresh();
    else toast.error(res.error ?? "Aktion fehlgeschlagen.");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--color-foreground-muted)]">{tools.length} Tools</p>
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? "Abbrechen" : "Tool Definition"}</Button>
      </div>

      {showForm ? (
        <Card>
          <CardHeader><CardTitle className="text-base">Neue Tool Definition</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={create} className="grid gap-4 sm:grid-cols-2">
              <FormField label="Name" htmlFor="name" required>
                <Input id="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </FormField>
              <FormField label="Provider" htmlFor="provider">
                <Input id="provider" value={form.provider} onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))} />
              </FormField>
              <FormField label="Risiko" htmlFor="riskLevel">
                <select id="riskLevel" className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2" value={form.riskLevel} onChange={(e) => setForm((f) => ({ ...f, riskLevel: e.target.value }))}>
                  {Object.entries(AGENT_TOOL_RISK_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </FormField>
              <FormField label="Max. Kosten/Aufruf" htmlFor="maxCost">
                <Input id="maxCost" type="number" step="0.01" value={form.maxCostPerCall} onChange={(e) => setForm((f) => ({ ...f, maxCostPerCall: e.target.value }))} />
              </FormField>
              <FormField label="Beschreibung" htmlFor="description" className="sm:col-span-2">
                <Textarea id="description" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </FormField>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" checked={form.requiresApproval} onChange={(e) => setForm((f) => ({ ...f, requiresApproval: e.target.checked }))} />
                Freigabe erforderlich
              </label>
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
              <th className="px-3 py-2">Risiko</th>
              <th className="px-3 py-2">Policies</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Aktion</th>
            </tr>
          </thead>
          <tbody>
            {tools.map((t) => (
              <tr key={t.id} className="border-t border-[var(--color-border)]">
                <td className="px-3 py-2">
                  <p className="font-medium">{t.name}</p>
                  {t.description ? <p className="text-xs text-[var(--color-foreground-subtle)]">{t.description}</p> : null}
                </td>
                <td className="px-3 py-2"><Badge variant="outline">{AGENT_TOOL_RISK_LABELS[t.riskLevel as keyof typeof AGENT_TOOL_RISK_LABELS] ?? t.riskLevel}</Badge></td>
                <td className="px-3 py-2">{t.policyCount}</td>
                <td className="px-3 py-2"><Badge variant={t.enabled ? "default" : "outline"}>{t.enabled ? "Aktiv" : "Inaktiv"}</Badge></td>
                <td className="px-3 py-2 text-right">
                  <Button size="sm" variant="outline" onClick={() => toggle(t.id, !t.enabled)}>
                    {t.enabled ? "Deaktivieren" : "Aktivieren"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
