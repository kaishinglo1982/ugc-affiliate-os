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
import { EXPENSE_CATEGORY_LABELS } from "@/lib/status-labels";
import { ExpenseDialog, type ExpenseInitial } from "@/components/finance/expense-dialog";
import { deleteExpenseAction } from "@/server/actions/finance";

export interface ExpenseRow extends ExpenseInitial {
  productName: string | null;
  campaignName: string | null;
}

interface Option {
  id: string;
  label: string;
}

export function ExpensesTable({
  expenses,
  products,
  campaigns,
}: {
  expenses: ExpenseRow[];
  products: Option[];
  campaigns: Option[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteExpenseAction(deleteTarget);
      if (result.success) {
        toast.success("Ausgabe gelöscht");
        setDeleteTarget(null);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const columns = useMemo<ColumnDef<ExpenseRow, unknown>[]>(
    () => [
      {
        accessorKey: "date",
        header: "Datum",
        cell: ({ row }) => new Date(row.original.date).toLocaleDateString("de-DE"),
      },
      {
        accessorKey: "amount",
        header: "Betrag",
        cell: ({ row }) => <span className="tabular-nums">{formatEuro(row.original.amount)}</span>,
      },
      {
        accessorKey: "category",
        header: "Kategorie",
        cell: ({ row }) => <Badge variant="outline">{EXPENSE_CATEGORY_LABELS[row.original.category] ?? row.original.category}</Badge>,
      },
      {
        id: "context",
        header: "Zuordnung",
        cell: ({ row }) => (
          <span className="text-sm text-[var(--color-foreground-muted)]">
            {[row.original.vendor, row.original.productName, row.original.campaignName].filter(Boolean).join(" · ") || "—"}
            {row.original.isRecurring ? " · wiederkehrend" : ""}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <ExpenseDialog initial={row.original} products={products} campaigns={campaigns} />
            <Button variant="ghost" size="sm" className="text-[var(--color-destructive)]" onClick={() => setDeleteTarget(row.original.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [products, campaigns],
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={expenses}
        emptyTitle="Noch keine Ausgaben erfasst"
        emptyDescription="Erfasse eine Ausgabe, um Kosten und Marge im Überblick zu sehen."
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Ausgabe löschen?"
        description="Dieser Eintrag wird unwiderruflich gelöscht."
        pending={isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}
