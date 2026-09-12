import type { Metadata } from "next";
import { CampaignForm } from "@/components/campaigns/campaign-form";
import { saveCampaignAction } from "@/server/actions/campaigns";
import { listProductsForSelect, listAffiliateLinks } from "@/server/services/affiliate";
import { resolveWorkspaceId } from "@/lib/auth/tenant";

export const metadata: Metadata = { title: "Neue Kampagne" };

export default async function NewCampaignPage() {
  const workspaceId = await resolveWorkspaceId();
  const [products, links] = await Promise.all([
    listProductsForSelect(workspaceId),
    listAffiliateLinks(workspaceId),
  ]);
  const boundAction = saveCampaignAction.bind(null, null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Kampagne erstellen</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Verknüpfe Produkt, Affiliate-Link und Zielplattformen für den gesamten Content-Workflow.
        </p>
      </div>
      <CampaignForm
        action={boundAction}
        products={products.map((p) => ({ id: p.id, label: p.name }))}
        links={links.map((l) => ({ id: l.id, label: l.label }))}
        submitLabel="Kampagne speichern"
      />
    </div>
  );
}
