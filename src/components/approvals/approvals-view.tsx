"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { APPROVAL_STATUS_LABELS, APPROVAL_RESOURCE_LABELS } from "@/lib/status-labels";
import { apiPost } from "@/lib/client/api";

export interface ApprovalRow {
  id: string;
  resourceType: string;
  resourceId: string;
  status: string;
  cost: number | null;
  currency: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export function ApprovalsView({ approvals }: { approvals: ApprovalRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function decide(id: string, decision: "APPROVED" | "REJECTED") {
    setBusy(id);
    const res = await apiPost(`/api/approvals/${id}/decide`, { decision, decisionReason: decision === "APPROVED" ? "Freigegeben" : "Abgelehnt" });
    setBusy(null);
    if (res.ok) {
      toast.success(decision === "APPROVED" ? "Freigegeben" : "Abgelehnt");
      router.refresh();
    } else toast.error(res.error ?? "Entscheidung fehlgeschlagen.");
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ressource</TableHead>
            <TableHead>Typ</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Kosten</TableHead>
            <TableHead>Läuft ab</TableHead>
            <TableHead className="text-right">Aktion</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {approvals.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="font-medium">{a.resourceId.slice(0, 8)}</TableCell>
              <TableCell><Badge variant="outline">{APPROVAL_RESOURCE_LABELS[a.resourceType as keyof typeof APPROVAL_RESOURCE_LABELS] ?? a.resourceType}</Badge></TableCell>
              <TableCell><Badge variant={a.status === "APPROVED" ? "default" : a.status === "REJECTED" ? "destructive" : "outline"}>{APPROVAL_STATUS_LABELS[a.status as keyof typeof APPROVAL_STATUS_LABELS] ?? a.status}</Badge></TableCell>
              <TableCell>{a.cost != null ? `${a.cost.toFixed(2)} ${a.currency ?? ""}` : "—"}</TableCell>
              <TableCell>{a.expiresAt ? new Date(a.expiresAt).toLocaleDateString("de-DE") : "—"}</TableCell>
              <TableCell className="text-right">
                {a.status === "PENDING" ? (
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" disabled={busy === a.id} onClick={() => decide(a.id, "REJECTED")}>Ablehnen</Button>
                    <Button size="sm" disabled={busy === a.id} onClick={() => decide(a.id, "APPROVED")}>Freigeben</Button>
                  </div>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
