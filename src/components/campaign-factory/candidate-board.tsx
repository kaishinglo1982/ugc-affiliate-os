"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CAMPAIGN_CANDIDATE_STATUS_LABELS } from "@/lib/status-labels";
import { apiPost } from "@/lib/client/api";

const COLUMNS = ["new", "under_review", "approved", "rejected", "expired", "converted"] as const;

export interface CandidateRow {
  id: string;
  productId: string;
  affiliateOfferId: string;
  brandId: string | null;
  nicheId: string | null;
  status: string;
  opportunityScore: number;
  opportunityConfidence: number | null;
  targetPlatformCandidates: string[];
  estimatedRevenuePerPost: number | null;
  estimatedCampaignCost: number | null;
  currency: string | null;
  expiresAt: string | null;
}

export function CandidateBoard({ candidates }: { candidates: CandidateRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function act(id: string, path: string, body?: Record<string, unknown>) {
    setBusy(id + path);
    const res = await apiPost(`/api/campaign-candidates/${id}/${path}`, body ?? {});
    setBusy(null);
    if (res.ok) {
      toast.success("Aktualisiert");
      router.refresh();
    } else toast.error(res.error ?? "Aktion fehlgeschlagen.");
  }

  function convert(c: CandidateRow) {
    const name = window.prompt("Kampagnenname", `Kampagne ${c.id.slice(0, 6)}`);
    if (name) act(c.id, "convert", { name });
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {COLUMNS.map((col) => (
        <div key={col} className="rounded-md border border-[var(--color-border)] p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">{CAMPAIGN_CANDIDATE_STATUS_LABELS[col]}</h3>
            <Badge variant="outline">{candidates.filter((c) => c.status === col).length}</Badge>
          </div>
          <ul className="space-y-2">
            {candidates.filter((c) => c.status === col).map((c) => (
              <li key={c.id} className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-xs">
                <p className="font-medium">Product {c.productId.slice(0, 8)}</p>
                <p className="text-[var(--color-foreground-subtle)]">Score {c.opportunityScore} · Conf {c.opportunityConfidence ?? "—"}</p>
                <p className="text-[var(--color-foreground-subtle)]">{(c.targetPlatformCandidates ?? []).join(", ") || "—"}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {col === "new" ? (
                    <Button size="sm" variant="outline" disabled={busy === c.id + "request-approval"} onClick={() => act(c.id, "request-approval")}>Prüfen</Button>
                  ) : null}
                  {col === "under_review" ? (
                    <>
                      <Button size="sm" disabled={busy === c.id + "approve"} onClick={() => act(c.id, "approve")}>Freigeben</Button>
                      <Button size="sm" variant="outline" disabled={busy === c.id + "reject"} onClick={() => act(c.id, "reject")}>Ablehnen</Button>
                    </>
                  ) : null}
                  {col === "approved" ? (
                    <Button size="sm" disabled={busy === c.id + "convert"} onClick={() => convert(c)}>Konvertieren</Button>
                  ) : null}
                  <Button size="sm" variant="ghost" disabled={busy === c.id + "recalculate"} onClick={() => act(c.id, "recalculate")}>Neu berechnen</Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
