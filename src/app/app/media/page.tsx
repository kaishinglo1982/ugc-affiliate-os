import type { Metadata } from "next";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
import { listMediaAssets } from "@/server/services/media";
import { listProductsForSelect } from "@/server/services/affiliate";
import { prisma } from "@/lib/db/client";
import { MediaPageClient } from "@/components/media/media-page-client";
import type { MediaAssetItem } from "@/components/media/media-grid";

export const metadata: Metadata = { title: "Medienbibliothek" };

interface MediaPageProps {
  searchParams: Promise<{ search?: string; kind?: string }>;
}

export default async function MediaPage({ searchParams }: MediaPageProps) {
  const params = await searchParams;
  const workspaceId = await resolveWorkspaceId();
  const [assets, products, campaigns] = await Promise.all([
    listMediaAssets({ search: params.search, kind: params.kind }),
    listProductsForSelect(),
    prisma.campaign.findMany({ where: { workspaceId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const items: MediaAssetItem[] = assets.map((a) => ({
    id: a.id,
    kind: a.kind,
    fileName: a.fileName,
    url: a.url,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    durationSec: a.durationSec,
    tags: a.tags,
    productId: a.productId,
    campaignId: a.campaignId,
    productName: a.product?.name ?? null,
    campaignName: a.campaign?.name ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Medienbibliothek</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {items.length} Datei{items.length === 1 ? "" : "en"} · lokaler Dev-Speicher, S3-kompatibel vorbereitet.
        </p>
      </div>
      <MediaPageClient
        assets={items}
        products={products.map((p) => ({ id: p.id, label: p.name }))}
        campaigns={campaigns.map((c) => ({ id: c.id, label: c.name }))}
      />
    </div>
  );
}
