"use client";

import { useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { SCRIPT_STATUS_LABELS } from "@/lib/status-labels";

export interface ScriptRow {
  id: string;
  title: string;
  productName: string | null;
  campaignName: string | null;
  platform: string | null;
  status: string;
  versionCount: number;
}

export function ScriptsTable({ scripts, onOpen }: { scripts: ScriptRow[]; onOpen: (id: string) => void }) {
  const columns = useMemo<ColumnDef<ScriptRow, unknown>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Titel",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.title}</p>
            <p className="text-xs text-[var(--color-foreground-subtle)]">
              {row.original.productName ?? "Ohne Produkt"}
              {row.original.campaignName ? ` · ${row.original.campaignName}` : ""}
            </p>
          </div>
        ),
      },
      { accessorKey: "platform", header: "Plattform", cell: ({ row }) => row.original.platform ?? "—" },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <Badge variant="outline">{SCRIPT_STATUS_LABELS[row.original.status]}</Badge>,
      },
      { accessorKey: "versionCount", header: "Versionen" },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      data={scripts}
      emptyTitle="Noch keine Skripte"
      emptyDescription="Generiere dein erstes UGC-Skript — auch ohne API-Key über den Template-Generator."
      onRowClick={(row) => onOpen(row.id)}
    />
  );
}
