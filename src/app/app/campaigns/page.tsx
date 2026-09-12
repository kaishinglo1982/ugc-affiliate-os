import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { listCampaigns } from "@/server/services/campaigns";
import { CampaignsView } from "@/components/campaigns/campaigns-view";
import { Button } from "@/components/ui/button";
import type { CampaignRow } from "@/components/campaigns/campaigns-table";

export const metadata: Metadata = { title: "Kampagnen" };

export default async function CampaignsPage() {
  const campaigns = await listCampaigns();

  const rows: CampaignRow[] = campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    productName: c.product?.name ?? null,
    budget: c.budget ? Number(c.budget) : null,
    scriptCount: c._count.scripts,
    videoJobCount: c._count.videoJobs,
    postCount: c._count.socialPosts,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kampagnen</h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {rows.length} Kampagne{rows.length === 1 ? "" : "n"} · Statusänderungen werden im Audit-Log erfasst.
          </p>
        </div>
        <Button asChild>
          <Link href="/app/campaigns/create">
            <Plus className="h-4 w-4" /> Kampagne erstellen
          </Link>
        </Button>
      </div>
      <CampaignsView campaigns={rows} />
    </div>
  );
}
