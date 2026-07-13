"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { Archive, ExternalLink, Star } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ScoreBadge } from "@/components/products/score-badge";
import { PRODUCT_STATUS_LABELS, TREND_STATUS_LABELS } from "@/lib/status-labels";
import { toggleFavoriteAction, archiveProductAction } from "@/server/actions/products";

export interface ProductRow {
  id: string;
  name: string;
  category: string | null;
  status: string;
  trend: string;
  price: number | null;
  commissionRate: number | null;
  isFavorite: boolean;
  latestScore: number;
}

export function ProductsTable({ products }: { products: ProductRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [archiveTarget, setArchiveTarget] = useState<ProductRow | null>(null);

  function handleFavorite(product: ProductRow) {
    startTransition(async () => {
      const result = await toggleFavoriteAction(product.id, !product.isFavorite);
      if (result.success) {
        toast.success(product.isFavorite ? "Favorit entfernt" : "Als Favorit markiert");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleArchive() {
    if (!archiveTarget) return;
    startTransition(async () => {
      const result = await archiveProductAction(archiveTarget.id);
      if (result.success) {
        toast.success("Produkt archiviert");
        setArchiveTarget(null);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const columns = useMemo<ColumnDef<ProductRow, unknown>[]>(
    () => [
      {
        id: "favorite",
        header: "",
        cell: ({ row }) => (
          <button
            type="button"
            aria-label={row.original.isFavorite ? "Favorit entfernen" : "Als Favorit markieren"}
            onClick={(e) => {
              e.stopPropagation();
              handleFavorite(row.original);
            }}
            className="cursor-pointer text-[var(--color-foreground-subtle)] hover:text-[var(--color-warning)]"
          >
            <Star className={row.original.isFavorite ? "h-4 w-4 fill-[var(--color-warning)] text-[var(--color-warning)]" : "h-4 w-4"} />
          </button>
        ),
      },
      {
        accessorKey: "name",
        header: "Produkt",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.name}</p>
            {row.original.category ? (
              <p className="text-xs text-[var(--color-foreground-subtle)]">{row.original.category}</p>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <Badge variant="outline">{PRODUCT_STATUS_LABELS[row.original.status] ?? row.original.status}</Badge>,
      },
      {
        accessorKey: "trend",
        header: "Trend",
        cell: ({ row }) => <span className="text-sm">{TREND_STATUS_LABELS[row.original.trend] ?? row.original.trend}</span>,
      },
      {
        accessorKey: "price",
        header: "Preis",
        cell: ({ row }) => (
          <span className="tabular-nums">
            {row.original.price != null ? `${row.original.price.toFixed(2)} €` : "—"}
          </span>
        ),
      },
      {
        accessorKey: "commissionRate",
        header: "Provision",
        cell: ({ row }) => (
          <span className="tabular-nums">
            {row.original.commissionRate != null ? `${row.original.commissionRate}%` : "—"}
          </span>
        ),
      },
      {
        accessorKey: "latestScore",
        header: "Score",
        cell: ({ row }) => <ScoreBadge score={row.original.latestScore} />,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/app/products/${row.original.id}`} aria-label="Öffnen" onClick={(e) => e.stopPropagation()}>
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Archivieren"
              disabled={isPending}
              onClick={(e) => {
                e.stopPropagation();
                setArchiveTarget(row.original);
              }}
            >
              <Archive className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isPending],
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={products}
        emptyTitle="Noch keine Produkte"
        emptyDescription="Füge dein erstes Produkt hinzu oder importiere eine CSV-Datei."
        onRowClick={(row) => router.push(`/app/products/${row.id}`)}
      />
      <ConfirmDialog
        open={Boolean(archiveTarget)}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title="Produkt archivieren?"
        description={`"${archiveTarget?.name}" wird archiviert und aus aktiven Listen ausgeblendet. Die Daten bleiben erhalten.`}
        confirmLabel="Archivieren"
        pending={isPending}
        onConfirm={handleArchive}
      />
    </>
  );
}
