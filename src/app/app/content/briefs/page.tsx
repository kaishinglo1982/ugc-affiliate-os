import type { Metadata } from "next";
import { listContentBriefs } from "@/server/services/content";
import { listCampaigns } from "@/server/services/campaigns";
import { BriefsView, type BriefRow } from "@/components/content/briefs-view";

export const metadata: Metadata = { title: "Content Briefs" };

export default async function ContentBriefsPage() {
  const [briefs, campaigns] = await Promise.all([listContentBriefs(), listCampaigns()]);

  const rows: BriefRow[] = briefs.map((b) => ({
    id: b.id,
    objective: b.objective,
    campaignName: b.campaign?.name ?? null,
    platform: b.platform ?? null,
    status: b.status,
    targetAudience: b.targetAudience ?? null,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Content Briefs</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Redaktionelle Briefe für kampagnenübergreifenden Content.
        </p>
      </div>
      <BriefsView briefs={rows} campaigns={campaigns.map((c) => ({ id: c.id, name: c.name }))} />
    </div>
  );
}
