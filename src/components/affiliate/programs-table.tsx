"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { KeyRound, Unlink } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ProgramDialog, type ProgramDialogInitial } from "@/components/affiliate/program-dialog";
import { AFFILIATE_PROVIDER_LABELS, INTEGRATION_MODE_LABELS } from "@/lib/status-labels";
import { disconnectAffiliateProgramAction, deleteAffiliateProgramAction } from "@/server/actions/affiliate-programs";

export interface ProgramRow {
  id: string;
  provider: string;
  customName: string | null;
  trackingId: string | null;
  notes: string | null;
  mode: string;
  status: string;
  hasCredential: boolean;
  linkCount: number;
}

export function ProgramsTable({ programs }: { programs: ProgramRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<ProgramRow | null>(null);

  function handleDisconnect(program: ProgramRow) {
    startTransition(async () => {
      const result = await disconnectAffiliateProgramAction(program.id);
      if (result.success) {
        toast.success("Programm getrennt");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteAffiliateProgramAction(deleteTarget.id);
      if (result.success) {
        toast.success("Programm gelöscht");
        setDeleteTarget(null);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const columns = useMemo<ColumnDef<ProgramRow, unknown>[]>(
    () => [
      {
        accessorKey: "provider",
        header: "Programm",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">
              {row.original.customName || AFFILIATE_PROVIDER_LABELS[row.original.provider]}
            </p>
            <p className="text-xs text-[var(--color-foreground-subtle)]">
              {AFFILIATE_PROVIDER_LABELS[row.original.provider]}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "trackingId",
        header: "Tracking-ID",
        cell: ({ row }) => row.original.trackingId || "—",
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={row.original.status === "CONNECTED" ? "success" : "outline"}>
            {row.original.status === "CONNECTED" ? "Verbunden" : "Getrennt"}
          </Badge>
        ),
      },
      {
        accessorKey: "mode",
        header: "Modus",
        cell: ({ row }) => <Badge variant="outline">{INTEGRATION_MODE_LABELS[row.original.mode]}</Badge>,
      },
      {
        accessorKey: "hasCredential",
        header: "Zugangsdaten",
        cell: ({ row }) =>
          row.original.hasCredential ? (
            <span className="inline-flex items-center gap-1 text-xs text-[var(--color-success)]">
              <KeyRound className="h-3.5 w-3.5" /> Hinterlegt
            </span>
          ) : (
            <span className="text-xs text-[var(--color-foreground-subtle)]">Keine</span>
          ),
      },
      {
        accessorKey: "linkCount",
        header: "Links",
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <ProgramDialog initial={row.original as ProgramDialogInitial} />
            {row.original.status === "CONNECTED" ? (
              <Button variant="ghost" size="icon" aria-label="Trennen" onClick={() => handleDisconnect(row.original)} disabled={isPending}>
                <Unlink className="h-4 w-4" />
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" className="text-[var(--color-destructive)]" onClick={() => setDeleteTarget(row.original)}>
              Löschen
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
        data={programs}
        emptyTitle="Noch keine Affiliate-Programme"
        emptyDescription="Lege dein erstes Programm an, um Links zu erzeugen."
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Programm löschen?"
        description={`"${deleteTarget?.customName || (deleteTarget && AFFILIATE_PROVIDER_LABELS[deleteTarget.provider])}" wird endgültig gelöscht.`}
        pending={isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}
