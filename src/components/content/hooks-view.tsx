"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CONTENT_HOOK_STATUS_LABELS } from "@/lib/status-labels";
import { apiPost } from "@/lib/client/api";

export interface HookRow {
  id: string;
  angle: string;
  body: string | null;
  status: string;
  briefObjective: string | null;
  createdAt: string;
}

export function HooksView({ hooks, briefs }: { hooks: HookRow[]; briefs: { id: string; objective: string }[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ briefId: "", angle: "", body: "", status: "IDEA" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.briefId || !form.angle.trim()) {
      setError("Brief und Hook-Winkel sind erforderlich.");
      return;
    }
    setPending(true);
    setError(null);
    const res = await apiPost("/api/content/hooks", {
      briefId: form.briefId,
      angle: form.angle,
      body: form.body || undefined,
      status: form.status,
    });
    setPending(false);
    if (res.ok) {
      toast.success("Hook erstellt");
      setShowForm(false);
      setForm({ briefId: "", angle: "", body: "", status: "IDEA" });
      router.refresh();
    } else {
      setError(res.error ?? "Erstellung fehlgeschlagen.");
    }
  }

  const columns = [
    { accessorKey: "angle", header: "Hook-Winkel", cell: ({ row }: { row: { original: HookRow } }) => <span className="font-medium">{row.original.angle}</span> },
    {
      accessorKey: "body",
      header: "Text",
      cell: ({ row }: { row: { original: HookRow } }) => (
        <span className="line-clamp-2 text-sm text-[var(--color-foreground-subtle)]">{row.original.body ?? "—"}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: { row: { original: HookRow } }) => (
        <Badge variant="outline">{CONTENT_HOOK_STATUS_LABELS[row.original.status] ?? row.original.status}</Badge>
      ),
    },
  ] as ColumnDef<HookRow, unknown>[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--color-foreground-muted)]">{hooks.length} Hooks</p>
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? "Abbrechen" : "Hook erstellen"}</Button>
      </div>

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Neuer Hook</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
              <FormField label="Brief" htmlFor="briefId" required className="sm:col-span-2">
                <Select value={form.briefId} onValueChange={(v) => setForm((f) => ({ ...f, briefId: v }))}>
                  <SelectTrigger id="briefId"><SelectValue placeholder="Brief wählen" /></SelectTrigger>
                  <SelectContent>
                    {briefs.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.objective.slice(0, 60)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Winkel (Angle)" htmlFor="angle" required className="sm:col-span-2">
                <Input id="angle" value={form.angle} onChange={(e) => setForm((f) => ({ ...f, angle: e.target.value }))} />
              </FormField>
              <FormField label="Text" htmlFor="body" className="sm:col-span-2">
                <Textarea id="body" rows={2} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
              </FormField>
              <FormField label="Status" htmlFor="status">
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONTENT_HOOK_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              {error ? <p role="alert" className="text-sm text-[var(--color-destructive)] sm:col-span-2">{error}</p> : null}
              <Button type="submit" disabled={pending} className="sm:col-span-2">{pending ? "Speichern…" : "Speichern"}</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <DataTable
        columns={columns}
        data={hooks}
        emptyTitle="Noch keine Hooks"
        emptyDescription="Erstelle einen Hook und ordne ihn einem Brief zu."
      />
    </div>
  );
}
