"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { CAMPAIGN_STATUS_LABELS } from "@/lib/status-labels";
import { CAMPAIGN_STATUS_FLOW, isValidCampaignTransition, type CampaignStatus } from "@/features/campaigns/status";
import { changeCampaignStatusAction } from "@/server/actions/campaigns";
import type { CampaignRow } from "@/components/campaigns/campaigns-table";

export function CampaignsKanban({ campaigns }: { campaigns: CampaignRow[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);

  function handleDrop(status: CampaignStatus) {
    if (!dragId) return;
    const campaign = campaigns.find((c) => c.id === dragId);
    setDragOverStatus(null);
    if (!campaign || campaign.status === status) {
      setDragId(null);
      return;
    }
    if (!isValidCampaignTransition(campaign.status as CampaignStatus, status)) {
      toast.error(`Statuswechsel von "${CAMPAIGN_STATUS_LABELS[campaign.status]}" zu "${CAMPAIGN_STATUS_LABELS[status]}" ist nicht zulässig.`);
      setDragId(null);
      return;
    }
    startTransition(async () => {
      const result = await changeCampaignStatusAction(dragId, status);
      if (result.success) {
        toast.success(`Status geändert zu "${CAMPAIGN_STATUS_LABELS[status]}"`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
    setDragId(null);
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {CAMPAIGN_STATUS_FLOW.map((status) => {
        const items = campaigns.filter((c) => c.status === status);
        return (
          <div
            key={status}
            className="w-72 shrink-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverStatus(status);
            }}
            onDragLeave={() => setDragOverStatus((s) => (s === status ? null : s))}
            onDrop={() => handleDrop(status)}
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold">{CAMPAIGN_STATUS_LABELS[status]}</h3>
              <Badge variant="outline">{items.length}</Badge>
            </div>
            <div
              className={`min-h-16 space-y-2 rounded-md transition-colors ${dragOverStatus === status ? "bg-[var(--color-primary)]/10 ring-1 ring-[var(--color-primary)]/40" : ""}`}
            >
              {items.map((campaign) => (
                <Link
                  key={campaign.id}
                  href={`/app/campaigns/${campaign.id}`}
                  draggable
                  onDragStart={() => setDragId(campaign.id)}
                  className="block cursor-grab rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3 shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)] active:cursor-grabbing"
                >
                  <p className="text-sm font-medium">{campaign.name}</p>
                  {campaign.productName ? (
                    <p className="mt-0.5 text-xs text-[var(--color-foreground-subtle)]">{campaign.productName}</p>
                  ) : null}
                  <div className="mt-2 flex items-center gap-2 text-xs text-[var(--color-foreground-muted)]">
                    <span>{campaign.scriptCount} Skripte</span>
                    <span>·</span>
                    <span>{campaign.videoJobCount} Videos</span>
                  </div>
                </Link>
              ))}
              {items.length === 0 ? (
                <p className="px-1 py-4 text-center text-xs text-[var(--color-foreground-subtle)]">Keine Kampagnen</p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
