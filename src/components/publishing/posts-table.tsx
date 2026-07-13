"use client";

import { useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { SOCIAL_POST_STATUS_LABELS } from "@/lib/status-labels";

export interface PostRow {
  id: string;
  caption: string;
  platform: string;
  handle: string;
  campaignName: string | null;
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
}

const STATUS_VARIANT: Record<string, "outline" | "success" | "destructive" | "warning" | "primary"> = {
  DRAFT: "outline",
  READY: "primary",
  APPROVED: "primary",
  SCHEDULED: "warning",
  PUBLISHING: "warning",
  PUBLISHED: "success",
  FAILED: "destructive",
  CANCELLED: "outline",
};

export function PostsTable({ posts, onOpen }: { posts: PostRow[]; onOpen: (id: string) => void }) {
  const columns = useMemo<ColumnDef<PostRow, unknown>[]>(
    () => [
      {
        accessorKey: "caption",
        header: "Post",
        cell: ({ row }) => (
          <div className="max-w-sm">
            <p className="truncate font-medium">{row.original.caption}</p>
            <p className="text-xs text-[var(--color-foreground-subtle)]">
              {row.original.platform} · {row.original.handle} · {row.original.campaignName ?? "Ohne Kampagne"}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={STATUS_VARIANT[row.original.status] ?? "outline"}>
            {SOCIAL_POST_STATUS_LABELS[row.original.status] ?? row.original.status}
          </Badge>
        ),
      },
      {
        accessorKey: "scheduledAt",
        header: "Termin",
        cell: ({ row }) => {
          const date = row.original.publishedAt ?? row.original.scheduledAt;
          return (
            <span className="text-sm text-[var(--color-foreground-muted)]">
              {date ? new Date(date).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" }) : "—"}
            </span>
          );
        },
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      data={posts}
      emptyTitle="Noch keine Posts"
      emptyDescription="Erstelle einen Post-Entwurf, um den Freigabe- und Veröffentlichungs-Workflow zu starten."
      onRowClick={(row) => onOpen(row.id)}
    />
  );
}
