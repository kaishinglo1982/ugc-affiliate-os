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
import { CONTENT_BRIEF_STATUS_LABELS } from "@/lib/status-labels";
import { apiPost } from "@/lib/client/api";

export interface BriefRow {
  id: string;
  objective: string;
  campaignName: string | null;
  platform: string | null;
  status: string;
  targetAudience: string | null;
  createdAt: string;
  updatedAt: string;
}

export function BriefsView({ briefs, campaigns }: { briefs: BriefRow[]; campaigns: { id: string; name: string }[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ campaignId: "", objective: "", targetAudience: "", platform: "", notes: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.objective.trim()) {
      setError("Ziel (Objective) ist erforderlich.");
      return;
    }
    setPending(true);
    setError(null);
    const res = await apiPost("/api/content/briefs", {
      campaignId: form.campaignId || undefined,
      objective: form.objective,
      targetAudience: form.targetAudience || undefined,
      platform: form.platform || undefined,
      notes: form.notes || undefined,
    });
    setPending(false);
    if (res.ok) {
      toast.success("Brief erstellt");
      setShowForm(false);
      setForm({ campaignId: "", objective: "", targetAudience: "", platform: "", notes: "" });
      router.refresh();
    } else {
      setError(res.error ?? "Erstellung fehlgeschlagen.");
    }
  }

  const columns = [
    {
      accessorKey: "objective",
      header: "Ziel",
      cell: ({ row }: { row: { original: BriefRow } }) => (
        <div>
          <p className="font-medium">{row.original.objective}</p>
          {row.original.campaignName ? (
            <p className="text-xs text-[var(--color-foreground-subtle)]">{row.original.campaignName}</p>
          ) : null}
        </div>
      ),
    },
    { accessorKey: "platform", header: "Format", cell: ({ row }: { row: { original: BriefRow } }) => row.original.platform ?? "—" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: { row: { original: BriefRow } }) => (
        <Badge variant="outline">{CONTENT_BRIEF_STATUS_LABELS[row.original.status] ?? row.original.status}</Badge>
      ),
    },
    {
      accessorKey: "updatedAt",
      header: "Geändert",
      cell: ({ row }: { row: { original: BriefRow } }) => new Date(row.original.updatedAt).toLocaleDateString("de-DE"),
    },
  ] as ColumnDef<BriefRow, unknown>[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--color-foreground-muted)]">{briefs.length} Briefe</p>
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? "Abbrechen" : "Brief erstellen"}</Button>
      </div>

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Neuer Content Brief</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
              <FormField label="Kampagne" htmlFor="campaignId" className="sm:col-span-2">
                <Select value={form.campaignId} onValueChange={(v) => setForm((f) => ({ ...f, campaignId: v }))}>
                  <SelectTrigger id="campaignId"><SelectValue placeholder="Keine Kampagne" /></SelectTrigger>
                  <SelectContent>
                    {campaigns.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Ziel (Objective)" htmlFor="objective" required error={error && !form.objective.trim() ? "Erforderlich" : undefined} className="sm:col-span-2">
                <Textarea id="objective" rows={2} value={form.objective} onChange={(e) => setForm((f) => ({ ...f, objective: e.target.value }))} />
              </FormField>
              <FormField label="Zielgruppe" htmlFor="targetAudience">
                <Input id="targetAudience" value={form.targetAudience} onChange={(e) => setForm((f) => ({ ...f, targetAudience: e.target.value }))} />
              </FormField>
              <FormField label="Format/Plattform" htmlFor="platform">
                <Input id="platform" value={form.platform} onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))} />
              </FormField>
              <FormField label="Notizen" htmlFor="notes" className="sm:col-span-2">
                <Textarea id="notes" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </FormField>
              {error ? <p role="alert" className="text-sm text-[var(--color-destructive)] sm:col-span-2">{error}</p> : null}
              <Button type="submit" disabled={pending} className="sm:col-span-2">{pending ? "Speichern…" : "Speichern"}</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <DataTable
        columns={columns}
        data={briefs}
        emptyTitle="Noch keine Briefe"
        emptyDescription="Erstelle einen Brief, um Content-Ziele zu bündeln."
        onRowClick={(row) => router.push(`/app/content/briefs?brief=${row.id}`)}
      />
    </div>
  );
}
