"use client";

import { FileText, Music, Video as VideoIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export interface MediaAssetItem {
  id: string;
  kind: "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT";
  fileName: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  durationSec: number | null;
  tags: string[];
  productId: string | null;
  campaignId: string | null;
  productName: string | null;
  campaignName: string | null;
}

export function MediaGrid({
  assets,
  view,
  onSelect,
}: {
  assets: MediaAssetItem[];
  view: "grid" | "list";
  onSelect: (asset: MediaAssetItem) => void;
}) {
  if (assets.length === 0) {
    return (
      <EmptyState
        title="Keine Medien gefunden"
        description="Lade eine Datei hoch oder passe die Filter an."
      />
    );
  }

  if (view === "list") {
    return (
      <div className="divide-y divide-[var(--color-border)] rounded-md border border-[var(--color-border)]">
        {assets.map((asset) => (
          <button
            key={asset.id}
            onClick={() => onSelect(asset)}
            className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left text-sm hover:bg-[var(--color-surface-raised)]"
          >
            <MediaThumb asset={asset} className="h-10 w-10 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{asset.fileName}</p>
              <p className="text-xs text-[var(--color-foreground-subtle)]">
                {(asset.sizeBytes / 1024).toFixed(1)} KB · {asset.productName ?? asset.campaignName ?? "Ohne Zuordnung"}
              </p>
            </div>
            {asset.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="outline">{tag}</Badge>
            ))}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {assets.map((asset) => (
        <button
          key={asset.id}
          onClick={() => onSelect(asset)}
          className="group cursor-pointer overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-left transition-shadow hover:shadow-[var(--shadow-md)]"
        >
          <MediaThumb asset={asset} className="aspect-square w-full" />
          <div className="p-2">
            <p className="truncate text-xs font-medium">{asset.fileName}</p>
            <p className="text-[10px] text-[var(--color-foreground-subtle)]">{(asset.sizeBytes / 1024).toFixed(0)} KB</p>
          </div>
        </button>
      ))}
    </div>
  );
}

function MediaThumb({ asset, className }: { asset: MediaAssetItem; className?: string }) {
  if (asset.kind === "IMAGE") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={asset.url} alt={asset.fileName} className={cn("object-cover", className)} />
    );
  }
  const Icon = asset.kind === "VIDEO" ? VideoIcon : asset.kind === "AUDIO" ? Music : FileText;
  return (
    <div className={cn("flex items-center justify-center bg-[var(--color-surface-raised)] text-[var(--color-foreground-subtle)]", className)}>
      <Icon className="h-6 w-6" />
    </div>
  );
}
