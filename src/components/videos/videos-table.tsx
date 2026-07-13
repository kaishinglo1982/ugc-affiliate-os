"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { VIDEO_JOB_STATUS_LABELS } from "@/lib/status-labels";
import { useVideoJobPolling } from "@/hooks/use-video-job-polling";

export interface VideoJobRow {
  id: string;
  format: string;
  aspectRatio: string;
  provider: string;
  status: string;
  progress: number;
  resultUrl: string | null;
  errorMessage: string | null;
  campaignName: string | null;
  productName: string | null;
}

const STATUS_VARIANT: Record<string, "outline" | "success" | "destructive" | "warning"> = {
  QUEUED: "outline",
  PROCESSING: "warning",
  REVIEW_REQUIRED: "warning",
  COMPLETED: "success",
  FAILED: "destructive",
  CANCELLED: "outline",
};

export function VideosTable({ jobs }: { jobs: VideoJobRow[] }) {
  const router = useRouter();
  const states = useVideoJobPolling(jobs);

  const rows = jobs.map((j) => ({ ...j, ...states[j.id] }));

  const columns = useMemo<ColumnDef<typeof rows[number], unknown>[]>(
    () => [
      {
        accessorKey: "format",
        header: "Job",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.format}</p>
            <p className="text-xs text-[var(--color-foreground-subtle)]">
              {row.original.aspectRatio} · {row.original.productName ?? row.original.campaignName ?? "—"}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={STATUS_VARIANT[row.original.status] ?? "outline"}>
            {VIDEO_JOB_STATUS_LABELS[row.original.status] ?? row.original.status}
          </Badge>
        ),
      },
      {
        accessorKey: "progress",
        header: "Fortschritt",
        cell: ({ row }) => (
          <div className="w-32">
            <Progress value={row.original.progress} />
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      data={rows}
      emptyTitle="Noch keine Video-Jobs"
      emptyDescription="Starte einen neuen Video-Job, um den Mock-Rendering-Lifecycle zu sehen."
      onRowClick={(row) => router.push(`/app/videos/${row.id}`)}
    />
  );
}
