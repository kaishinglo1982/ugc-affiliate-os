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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AGENT_MEMORY_TYPE_LABELS } from "@/lib/status-labels";
import { apiPost } from "@/lib/client/api";

export interface MemoryRow {
  id: string;
  agentKey: string | null;
  type: string;
  key: string;
  value: string;
  expiresAt: string | null;
}

export function AgentMemoryView({ entries }: { entries: MemoryRow[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ type: "FACT", key: "", value: "", agentKey: "" });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.key.trim() || !form.value.trim() || !form.agentKey.trim()) {
      setError("Agent-Key, Key und Value sind erforderlich.");
      return;
    }
    setPending(true);
    const res = await apiPost("/api/agent-memory", {
      type: form.type,
      key: form.key,
      value: form.value,
      agentKey: form.agentKey,
    });
    setPending(false);
    if (res.ok) {
      toast.success("Memory-Eintrag erstellt");
      setForm({ type: "FACT", key: "", value: "", agentKey: "" });
      router.refresh();
    } else setError(res.error ?? "Erstellung fehlgeschlagen.");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Neuer Memory-Eintrag</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={create} className="grid gap-4 sm:grid-cols-2">
            <FormField label="Typ" htmlFor="type">
              <select id="type" className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                {Object.entries(AGENT_MEMORY_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </FormField>
            <FormField label="Agent-Key" htmlFor="agentKey" required>
              <Input id="agentKey" value={form.agentKey} onChange={(e) => setForm((f) => ({ ...f, agentKey: e.target.value }))} />
            </FormField>
            <FormField label="Key" htmlFor="key" required>
              <Input id="key" value={form.key} onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))} />
            </FormField>
            <FormField label="Value" htmlFor="value" required className="sm:col-span-2">
              <Textarea id="value" rows={2} value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} />
            </FormField>
            {error ? <p role="alert" className="text-sm text-[var(--color-destructive)] sm:col-span-2">{error}</p> : null}
            <Button type="submit" disabled={pending} className="sm:col-span-2">{pending ? "Speichern…" : "Speichern"}</Button>
          </form>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-md border border-[var(--color-border)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Key</TableHead><TableHead>Typ</TableHead><TableHead>Agent-Key</TableHead><TableHead>Wert</TableHead><TableHead>Läuft ab</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.key}</TableCell>
                <TableCell><Badge variant="outline">{AGENT_MEMORY_TYPE_LABELS[m.type as keyof typeof AGENT_MEMORY_TYPE_LABELS] ?? m.type}</Badge></TableCell>
                <TableCell>{m.agentKey ?? "—"}</TableCell>
                <TableCell className="max-w-[24rem] truncate">{m.value}</TableCell>
                <TableCell>{m.expiresAt ? new Date(m.expiresAt).toLocaleDateString("de-DE") : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
