"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CAMPAIGN_STATUS_LABELS } from "@/lib/status-labels";
import { deleteCampaignAction } from "@/server/actions/campaigns";

export interface CampaignRow {
  id: string;
  name: string;
  status: string;
  productName: string | null;
  budget: number | null;
  scriptCount: number;
  videoJobCount: number;
  postCount: number;
}

export function CampaignsTable({ campaigns }: { campaigns: CampaignRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<CampaignRow | null>(null);

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteCampaignAction(deleteTarget.id);
      if (result.success) {
        toast.success("Kampagne gelöscht");
        setDeleteTarget(null);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const columns = useMemo<ColumnDef<CampaignRow, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Kampagne",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.name}</p>
            {row.original.productName ? (
              <p className="text-xs text-[var(--color-foreground-subtle)]">{row.original.productName}</p>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <Badge variant="outline">{CAMPAIGN_STATUS_LABELS[row.original.status]}</Badge>,
      },
      {
        accessorKey: "budget",
        header: "Budget",
        cell: ({ row }) => (row.original.budget != null ? `${row.original.budget.toFixed(2)} €` : "—"),
      },
      { accessorKey: "scriptCount", header: "Skripte" },
      { accessorKey: "videoJobCount", header: "Videos" },
      { accessorKey: "postCount", header: "Posts" },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            className="text-[var(--color-destructive)]"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(row.original);
            }}
          >
            Löschen
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={campaigns}
        emptyTitle="Noch keine Kampagnen"
        emptyDescription="Erstelle deine erste Kampagne, um Content zu bündeln."
        onRowClick={(row) => router.push(`/app/campaigns/${row.id}`)}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Kampagne löschen?"
        description={`"${deleteTarget?.name}" wird endgültig gelöscht. Verknüpfte Skripte, Videos und Posts bleiben erhalten, verlieren aber die Zuordnung.`}
        pending={isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}
