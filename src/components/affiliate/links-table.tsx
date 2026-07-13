"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LinkDialog, type LinkDialogInitial } from "@/components/affiliate/link-dialog";
import { AFFILIATE_PROVIDER_LABELS } from "@/lib/status-labels";
import { deleteAffiliateLinkAction, testAffiliateLinkAction } from "@/server/actions/affiliate-links";

export interface LinkRow {
  id: string;
  label: string;
  destinationUrl: string;
  deepLink: string | null;
  shortSlug: string;
  platform: string | null;
  provider: string;
  productName: string | null;
  clickCount: number;
  lastCheckStatus: string | null;
  programId: string;
  productId: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
}

interface Option {
  id: string;
  label: string;
  provider?: string;
}

export function LinksTable({
  links,
  programs,
  products,
}: {
  links: LinkRow[];
  programs: Array<Option & { provider: string }>;
  products: Option[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<LinkRow | null>(null);

  function handleCopy(link: LinkRow) {
    navigator.clipboard.writeText(link.deepLink || link.destinationUrl);
    toast.success("Link kopiert");
  }

  function handleTest(link: LinkRow) {
    startTransition(async () => {
      const result = await testAffiliateLinkAction(link.id);
      if (result.success) {
        toast.success("Link geprüft");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteAffiliateLinkAction(deleteTarget.id);
      if (result.success) {
        toast.success("Link gelöscht");
        setDeleteTarget(null);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const columns = useMemo<ColumnDef<LinkRow, unknown>[]>(
    () => [
      {
        accessorKey: "label",
        header: "Link",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.label}</p>
            <p className="max-w-xs truncate text-xs text-[var(--color-foreground-subtle)]">
              {row.original.deepLink || row.original.destinationUrl}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "provider",
        header: "Programm",
        cell: ({ row }) => AFFILIATE_PROVIDER_LABELS[row.original.provider] ?? row.original.provider,
      },
      {
        accessorKey: "productName",
        header: "Produkt",
        cell: ({ row }) => row.original.productName ?? "—",
      },
      {
        accessorKey: "platform",
        header: "Plattform",
        cell: ({ row }) => row.original.platform ?? "—",
      },
      {
        accessorKey: "clickCount",
        header: "Klicks",
      },
      {
        accessorKey: "lastCheckStatus",
        header: "Linkstatus",
        cell: ({ row }) => {
          const status = row.original.lastCheckStatus;
          if (!status) return <Badge variant="outline">Ungeprüft</Badge>;
          const variant = status === "OK" ? "success" : status === "BLOCKED" ? "warning" : "destructive";
          return <Badge variant={variant}>{status}</Badge>;
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" aria-label="Link kopieren" onClick={() => handleCopy(row.original)}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Link testen" onClick={() => handleTest(row.original)} disabled={isPending}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <LinkDialog
              programs={programs}
              products={products}
              initial={row.original as unknown as LinkDialogInitial}
            />
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
        data={links}
        emptyTitle="Noch keine Affiliate-Links"
        emptyDescription="Erstelle einen Link, um ihn Kampagnen und Content zuzuordnen."
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Link löschen?"
        description={`"${deleteTarget?.label}" wird endgültig gelöscht.`}
        pending={isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}
