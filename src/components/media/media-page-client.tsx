"use client";

import { useState } from "react";
import { MediaFilters } from "@/components/media/media-filters";
import { MediaGrid, type MediaAssetItem } from "@/components/media/media-grid";
import { MediaDetailDialog } from "@/components/media/media-detail-dialog";
import { MediaUploadZone } from "@/components/media/media-upload-zone";

interface Option {
  id: string;
  label: string;
}

export function MediaPageClient({
  assets,
  products,
  campaigns,
}: {
  assets: MediaAssetItem[];
  products: Option[];
  campaigns: Option[];
}) {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<MediaAssetItem | null>(null);

  return (
    <div className="space-y-6">
      <MediaUploadZone />
      <MediaFilters view={view} onViewChange={setView} />
      <MediaGrid assets={assets} view={view} onSelect={setSelected} />
      <MediaDetailDialog
        asset={selected}
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
        products={products}
        campaigns={campaigns}
      />
    </div>
  );
}
