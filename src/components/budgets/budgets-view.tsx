"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BUDGET_PERIOD_LABELS } from "@/lib/status-labels";
import { apiPost } from "@/lib/client/api";

export interface PolicyRow {
  id: string;
  name: string;
  scope: string;
  currency: string;
  limitAmount: number;
  period: string;
  action: string;
  enabled: boolean;
  reservationCount: number;
  reservedAmount: number;
}

export function BudgetsView({ policies }: { policies: PolicyRow[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", scope: "GLOBAL", currency: "EUR", limitAmount: "", period: "monthly" });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.limitAmount) {
      setError("Name und Limit sind erforderlich.");
      return;
    }
    setPending(true);
    const res = await apiPost("/api/budgets", {
      name: form.name,
      scope: form.scope,
      currency: form.currency,
      limitAmount: Number(form.limitAmount),
      period: form.period,
      action: "block",
      enabled: true,
    });
    setPending(false);
    if (res.ok) {
      toast.success("Budget-Policy erstellt");
      setForm({ name: "", scope: "GLOBAL", currency: "EUR", limitAmount: "", period: "MONTHLY" });
      router.refresh();
    } else setError(res.error ?? "Erstellung fehlgeschlagen.");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Budget-Policy</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={create} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <FormField label="Name" htmlFor="name" required>
              <Input id="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </FormField>
            <FormField label="Scope" htmlFor="scope">
              <Input id="scope" value={form.scope} onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value }))} />
            </FormField>
            <FormField label="Währung" htmlFor="currency">
              <Input id="currency" value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} />
            </FormField>
            <FormField label="Limit" htmlFor="limit" required>
              <Input id="limit" type="number" step="0.01" value={form.limitAmount} onChange={(e) => setForm((f) => ({ ...f, limitAmount: e.target.value }))} />
            </FormField>
            <FormField label="Periode" htmlFor="period">
              <select id="period" className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2" value={form.period} onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}>
                {Object.entries(BUDGET_PERIOD_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </FormField>
            <div className="flex items-end lg:col-span-5">
              <Button type="submit" disabled={pending}>{pending ? "Speichern…" : "Speichern"}</Button>
            </div>
            {error ? <p role="alert" className="text-sm text-[var(--color-destructive)] lg:col-span-5">{error}</p> : null}
          </form>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-md border border-[var(--color-border)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead><TableHead>Scope</TableHead><TableHead>Währung</TableHead>
              <TableHead>Limit</TableHead><TableHead>Periode</TableHead><TableHead>Aktion</TableHead><TableHead>Reserviert</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {policies.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{p.scope}</TableCell>
                <TableCell>{p.currency}</TableCell>
                <TableCell>{p.limitAmount.toFixed(2)}</TableCell>
                <TableCell><Badge variant="outline">{BUDGET_PERIOD_LABELS[p.period as keyof typeof BUDGET_PERIOD_LABELS] ?? p.period}</Badge></TableCell>
                <TableCell><Badge variant={p.action === "block" ? "destructive" : "outline"}>{p.action === "block" ? "Block" : "Alert"}</Badge></TableCell>
                <TableCell>{p.reservedAmount.toFixed(2)} ({p.reservationCount})</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
