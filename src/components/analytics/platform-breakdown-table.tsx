"use client";

import { useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { formatEuro } from "@/lib/finance/format";

export interface PlatformBreakdownRow {
  platform: string;
  impressions: number;
  clicks: number;
  revenue: number;
  ctr: number;
}

export function PlatformBreakdownTable({ rows }: { rows: PlatformBreakdownRow[] }) {
  const columns = useMemo<ColumnDef<PlatformBreakdownRow, unknown>[]>(
    () => [
      { accessorKey: "platform", header: "Plattform" },
      {
        accessorKey: "impressions",
        header: "Impressions",
        cell: ({ row }) => <span className="tabular-nums">{row.original.impressions.toLocaleString("de-DE")}</span>,
      },
      {
        accessorKey: "clicks",
        header: "Klicks",
        cell: ({ row }) => <span className="tabular-nums">{row.original.clicks.toLocaleString("de-DE")}</span>,
      },
      {
        accessorKey: "ctr",
        header: "CTR",
        cell: ({ row }) => <span className="tabular-nums">{row.original.ctr.toFixed(2)} %</span>,
      },
      {
        accessorKey: "revenue",
        header: "Umsatz",
        cell: ({ row }) => <span className="tabular-nums">{formatEuro(row.original.revenue)}</span>,
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      data={rows}
      emptyTitle="Keine Plattformdaten"
      emptyDescription="Noch keine Impressions, Klicks oder Umsätze im gewählten Zeitraum/Filter."
    />
  );
}
