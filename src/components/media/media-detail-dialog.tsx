"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Archive, Download, Loader2, Save, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateMediaAction, archiveMediaAction, deleteMediaAction } from "@/server/actions/media";
import type { Result } from "@/types/result";
import type { MediaAssetItem } from "@/components/media/media-grid";

interface Option {
  id: string;
  label: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      Speichern
    </Button>
  );
}

export function MediaDetailDialog({
  asset,
  open,
  onOpenChange,
  products,
  campaigns,
}: {
  asset: MediaAssetItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Option[];
  campaigns: Option[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const action = asset
    ? updateMediaAction.bind(null, asset.id)
    : async (prev: Result<{ id: string }> | null) => prev;
  const [state, formAction] = useActionState(action, null as Result<{ id: string }> | null);

  useEffect(() => {
    if (state?.success) {
      toast.success("Metadaten gespeichert");
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!asset) return null;

  function handleArchive() {
    startTransition(async () => {
      const result = await archiveMediaAction(asset!.id);
      if (result.success) {
        toast.success("Datei archiviert");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteMediaAction(asset!.id);
      if (result.success) {
        toast.success("Datei gelöscht");
        setDeleteOpen(false);
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="truncate">{asset.fileName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {asset.kind === "IMAGE" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={asset.url} alt={asset.fileName} className="max-h-64 w-full rounded-md object-contain" />
          ) : asset.kind === "VIDEO" ? (
            <div className="flex h-40 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-foreground-muted)]">
              Video-Vorschau: {asset.mimeType}
            </div>
          ) : (
            <div className="flex h-24 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-foreground-muted)]">
              {asset.mimeType}
            </div>
          )}

          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div><dt className="text-xs text-[var(--color-foreground-subtle)]">Größe</dt><dd>{(asset.sizeBytes / 1024).toFixed(1)} KB</dd></div>
            <div><dt className="text-xs text-[var(--color-foreground-subtle)]">Typ</dt><dd>{asset.mimeType}</dd></div>
            {asset.durationSec ? <div><dt className="text-xs text-[var(--color-foreground-subtle)]">Dauer</dt><dd>{asset.durationSec}s</dd></div> : null}
          </dl>

          <form action={formAction} className="space-y-3">
            <FormField label="Tags (kommagetrennt)" htmlFor="tags">
              <Input id="tags" name="tags" defaultValue={asset.tags.join(", ")} />
            </FormField>
            <FormField label="Produkt" htmlFor="productId">
              <Select name="productId" defaultValue={asset.productId ?? undefined}>
                <SelectTrigger id="productId"><SelectValue placeholder="Kein Produkt" /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Kampagne" htmlFor="campaignId">
              <Select name="campaignId" defaultValue={asset.campaignId ?? undefined}>
                <SelectTrigger id="campaignId"><SelectValue placeholder="Keine Kampagne" /></SelectTrigger>
                <SelectContent>
                  {campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <SubmitButton />
          </form>
        </div>
        <DialogFooter className="sm:justify-between">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={asset.url} download={asset.fileName}>
                <Download className="h-4 w-4" /> Download
              </a>
            </Button>
            <Button variant="outline" size="sm" onClick={handleArchive} disabled={isPending}>
              <Archive className="h-4 w-4" /> Archivieren
            </Button>
          </div>
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" /> Löschen
          </Button>
        </DialogFooter>
      </DialogContent>
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Datei endgültig löschen?"
        description={`"${asset.fileName}" wird unwiderruflich aus dem Speicher entfernt.`}
        pending={isPending}
        onConfirm={handleDelete}
      />
    </Dialog>
  );
}
