import type { Metadata } from "next";
import { listAffiliateLinks, listAffiliatePrograms, listProductsForSelect } from "@/server/services/affiliate";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
import { LinksTable, type LinkRow } from "@/components/affiliate/links-table";
import { LinkDialog } from "@/components/affiliate/link-dialog";

export const metadata: Metadata = { title: "Affiliate-Links" };

export default async function AffiliateLinksPage() {
  const workspaceId = await resolveWorkspaceId();
  const [links, programs, products] = await Promise.all([
    listAffiliateLinks(workspaceId),
    listAffiliatePrograms(workspaceId),
    listProductsForSelect(workspaceId),
  ]);

  const programOptions = programs.map((p) => ({
    id: p.id,
    label: p.customName || p.provider,
    provider: p.provider,
  }));
  const productOptions = products.map((p) => ({ id: p.id, label: p.name }));

  const rows: LinkRow[] = links.map((l) => ({
    id: l.id,
    label: l.label,
    destinationUrl: l.destinationUrl,
    deepLink: l.deepLink,
    shortSlug: l.shortSlug,
    platform: l.platform,
    provider: l.program.provider,
    productName: l.product?.name ?? null,
    clickCount: l.clickCount,
    lastCheckStatus: l.lastCheckStatus,
    programId: l.programId,
    productId: l.productId,
    utmSource: l.utmSource,
    utmMedium: l.utmMedium,
    utmCampaign: l.utmCampaign,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Affiliate-Links</h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {rows.length} Link{rows.length === 1 ? "" : "s"} · UTM-Builder inklusive.
          </p>
        </div>
        {programOptions.length > 0 ? (
          <LinkDialog programs={programOptions} products={productOptions} />
        ) : null}
      </div>
      {programOptions.length === 0 ? (
        <p className="rounded-md border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 p-4 text-sm text-[var(--color-warning)]">
          Lege zuerst ein Affiliate-Programm an, bevor du Links erstellst.
        </p>
      ) : null}
      <LinksTable links={rows} programs={programOptions} products={productOptions} />
    </div>
  );
}
