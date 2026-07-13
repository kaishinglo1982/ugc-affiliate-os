import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCampaignById } from "@/server/services/campaigns";
import { listProductsForSelect, listAffiliateLinks } from "@/server/services/affiliate";
import { CampaignForm, type CampaignFormInitial } from "@/components/campaigns/campaign-form";
import { CampaignStatusControl } from "@/components/campaigns/campaign-status-control";
import { DeleteCampaignButton } from "@/components/campaigns/delete-campaign-button";
import { saveCampaignAction } from "@/server/actions/campaigns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatEuro } from "@/lib/finance/format";
import {
  SCRIPT_STATUS_LABELS,
  VIDEO_JOB_STATUS_LABELS,
  SOCIAL_POST_STATUS_LABELS,
} from "@/lib/status-labels";

interface CampaignDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: CampaignDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const campaign = await getCampaignById(id);
  return { title: campaign?.name ?? "Kampagne" };
}

export default async function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  const { id } = await params;
  const [campaign, products, links] = await Promise.all([
    getCampaignById(id),
    listProductsForSelect(),
    listAffiliateLinks(),
  ]);

  if (!campaign) notFound();

  const totalRevenue = campaign.revenues.reduce((sum, r) => sum + Number(r.grossAmount), 0);
  const totalExpense = campaign.expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const initialValues: CampaignFormInitial = {
    id: campaign.id,
    name: campaign.name,
    productId: campaign.productId,
    affiliateLinkId: campaign.affiliateLinkId,
    audience: campaign.audience,
    targetPlatforms: campaign.targetPlatforms,
    contentGoal: campaign.contentGoal,
    budget: campaign.budget ? Number(campaign.budget) : null,
    startDate: campaign.startDate ? campaign.startDate.toISOString().slice(0, 10) : null,
    endDate: campaign.endDate ? campaign.endDate.toISOString().slice(0, 10) : null,
    status: campaign.status,
    notes: campaign.notes,
  };

  const boundUpdateAction = saveCampaignAction.bind(null, campaign.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{campaign.name}</h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {campaign.product?.name ?? "Ohne Produkt"} · {campaign.targetPlatforms.join(", ") || "Keine Plattformen"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CampaignStatusControl id={campaign.id} status={campaign.status} />
          <DeleteCampaignButton id={campaign.id} name={campaign.name} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs uppercase text-[var(--color-foreground-subtle)]">Budget</p>
            <p className="mt-1 text-xl font-semibold">{campaign.budget ? formatEuro(Number(campaign.budget)) : "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs uppercase text-[var(--color-foreground-subtle)]">Umsatz</p>
            <p className="mt-1 text-xl font-semibold text-[var(--color-success)]">{formatEuro(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs uppercase text-[var(--color-foreground-subtle)]">Kosten</p>
            <p className="mt-1 text-xl font-semibold text-[var(--color-destructive)]">{formatEuro(totalExpense)}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="edit">Bearbeiten</TabsTrigger>
        </TabsList>

        <TabsContent value="content">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader><CardTitle className="text-base">Skripte ({campaign.scripts.length})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {campaign.scripts.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-md border border-[var(--color-border)] px-3 py-2 text-sm">
                    <span className="truncate">{s.title}</span>
                    <Badge variant="outline">{SCRIPT_STATUS_LABELS[s.status]}</Badge>
                  </div>
                ))}
                {campaign.scripts.length === 0 ? <p className="text-sm text-[var(--color-foreground-muted)]">Noch keine Skripte.</p> : null}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Video-Jobs ({campaign.videoJobs.length})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {campaign.videoJobs.map((v) => (
                  <div key={v.id} className="flex items-center justify-between rounded-md border border-[var(--color-border)] px-3 py-2 text-sm">
                    <span>{v.format}</span>
                    <Badge variant="outline">{VIDEO_JOB_STATUS_LABELS[v.status]}</Badge>
                  </div>
                ))}
                {campaign.videoJobs.length === 0 ? <p className="text-sm text-[var(--color-foreground-muted)]">Noch keine Video-Jobs.</p> : null}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Veröffentlichungen ({campaign.socialPosts.length})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {campaign.socialPosts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-md border border-[var(--color-border)] px-3 py-2 text-sm">
                    <span className="truncate">{p.account.platform}</span>
                    <Badge variant="outline">{SOCIAL_POST_STATUS_LABELS[p.status]}</Badge>
                  </div>
                ))}
                {campaign.socialPosts.length === 0 ? <p className="text-sm text-[var(--color-foreground-muted)]">Noch keine Posts.</p> : null}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="edit">
          <CampaignForm
            action={boundUpdateAction}
            initial={initialValues}
            products={products.map((p) => ({ id: p.id, label: p.name }))}
            links={links.map((l) => ({ id: l.id, label: l.label }))}
            submitLabel="Änderungen speichern"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
