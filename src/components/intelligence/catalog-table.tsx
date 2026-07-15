"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PRODUCT_STATUS_LABELS, RISK_LABELS } from "@/lib/status-labels";

export interface CatalogRow {
  id: string;
  name: string;
  brandName: string | null;
  status: string;
  riskLevel: string;
  opportunityScore: number | null;
  complianceStatus: string | null;
}

const COMPLIANCE_LABELS: Record<string, string> = {
  PASSED: "Bestanden",
  FAILED: "Durchgefallen",
  MANUAL_REVIEW: "Manuell prüfen",
  PENDING: "Ausstehend",
};

export function CatalogTable({ products }: { products: CatalogRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(products.map((p) => p.id)) : new Set());
  }

  function bulk(action: "approve" | "reject" | "archive") {
    if (selected.size === 0) {
      toast.error("Keine Produkte ausgewählt.");
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/products/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: Array.from(selected) }),
      });
      if (res.ok) {
        toast.success(
          action === "approve"
            ? "Freigegeben."
            : action === "reject"
              ? "Verworfen."
              : "Archiviert.",
        );
        setSelected(new Set());
        router.refresh();
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(data.error ?? "Aktion fehlgeschlagen.");
      }
    });
  }

  const allChecked = products.length > 0 && selected.size === products.length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
        <span className="text-sm text-[var(--color-foreground-muted)]">
          {selected.size} ausgewählt
        </span>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="secondary" disabled={isPending || selected.size === 0} onClick={() => bulk("approve")}>
            Freigeben
          </Button>
          <Button size="sm" variant="secondary" disabled={isPending || selected.size === 0} onClick={() => bulk("reject")}>
            Verwerfen
          </Button>
          <Button size="sm" variant="outline" disabled={isPending || selected.size === 0} onClick={() => bulk("archive")}>
            Archivieren
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox checked={allChecked} onCheckedChange={(v) => toggleAll(Boolean(v))} aria-label="Alle auswählen" />
            </TableHead>
            <TableHead>Produkt</TableHead>
            <TableHead>Marke</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Risiko</TableHead>
            <TableHead>Opportunity</TableHead>
            <TableHead>Compliance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((p) => (
            <TableRow key={p.id}>
              <TableCell>
                <Checkbox
                  checked={selected.has(p.id)}
                  onCheckedChange={(v) => toggle(p.id, Boolean(v))}
                  aria-label={`${p.name} auswählen`}
                />
              </TableCell>
              <TableCell className="font-medium">{p.name}</TableCell>
              <TableCell className="text-[var(--color-foreground-muted)]">{p.brandName ?? "—"}</TableCell>
              <TableCell>
                <Badge variant="outline">{PRODUCT_STATUS_LABELS[p.status] ?? p.status}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={p.riskLevel === "HIGH" || p.riskLevel === "CRITICAL" ? "destructive" : "warning"}>
                  {RISK_LABELS[p.riskLevel] ?? p.riskLevel}
                </Badge>
              </TableCell>
              <TableCell className="tabular-nums">{p.opportunityScore ?? "—"}</TableCell>
              <TableCell>
                {p.complianceStatus ? (
                  <Badge variant={p.complianceStatus === "PASSED" ? "success" : p.complianceStatus === "FAILED" ? "destructive" : "warning"}>
                    {COMPLIANCE_LABELS[p.complianceStatus] ?? p.complianceStatus}
                  </Badge>
                ) : (
                  "—"
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
