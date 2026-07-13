"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { type ColumnDef } from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatEuro } from "@/lib/finance/format";
import { REVENUE_STATUS_LABELS } from "@/lib/status-labels";
import { RevenueDialog, type RevenueInitial } from "@/components/finance/revenue-dialog";
import { deleteRevenueAction } from "@/server/actions/finance";

export interface RevenueRow extends RevenueInitial {
  productName: string | null;
  campaignName: string | null;
  programLabel: string | null;
}

const STATUS_VARIANT: Record<string, "outline" | "success" | "destructive" | "warning"> = {
  PENDING: "outline",
  CONFIRMED: "warning",
  PAID: "success",
  REVERSED: "destructive",
};

interface Option {
  id: string;
  label: string;
}

export function RevenuesTable({
  revenues,
  programs,
  products,
  campaigns,
}: {
  revenues: RevenueRow[];
  programs: Option[];
  products: Option[];
  campaigns: Option[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteRevenueAction(deleteTarget);
      if (result.success) {
        toast.success("Einnahme gelöscht");
        setDeleteTarget(null);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const columns = useMemo<ColumnDef<RevenueRow, unknown>[]>(
    () => [
      {
        accessorKey: "date",
        header: "Datum",
        cell: ({ row }) => new Date(row.original.date).toLocaleDateString("de-DE"),
      },
      {
        accessorKey: "grossAmount",
        header: "Betrag",
        cell: ({ row }) => <span className="tabular-nums">{formatEuro(row.original.grossAmount)}</span>,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={STATUS_VARIANT[row.original.status] ?? "outline"}>
            {REVENUE_STATUS_LABELS[row.original.status] ?? row.original.status}
          </Badge>
        ),
      },
      {
        id: "context",
        header: "Zuordnung",
        cell: ({ row }) => (
          <span className="text-sm text-[var(--color-foreground-muted)]">
            {[row.original.platform, row.original.productName, row.original.campaignName].filter(Boolean).join(" · ") || "—"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <RevenueDialog initial={row.original} programs={programs} products={products} campaigns={campaigns} />
            <Button variant="ghost" size="sm" className="text-[var(--color-destructive)]" onClick={() => setDeleteTarget(row.original.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [programs, products, campaigns],
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={revenues}
        emptyTitle="Noch keine Einnahmen erfasst"
        emptyDescription="Erfasse eine Einnahme, um Umsatz und Marge im Überblick zu sehen."
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Einnahme löschen?"
        description="Dieser Eintrag wird unwiderruflich gelöscht."
        pending={isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}
