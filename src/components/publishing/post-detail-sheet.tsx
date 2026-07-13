"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Send, CalendarClock, CheckCircle2, XCircle, Trash2, Pencil, RotateCcw } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SOCIAL_POST_STATUS_LABELS } from "@/lib/status-labels";
import {
  changePostStatusAction,
  schedulePostAction,
  publishPostAction,
  duplicatePostAction,
  deletePostAction,
} from "@/server/actions/publishing";

export interface PostDetailData {
  id: string;
  caption: string;
  hashtags: string[];
  platform: string;
  handle: string;
  campaignName: string | null;
  mediaAssetUrl: string | null;
  affiliateLinkText: string | null;
  disclosure: string | null;
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  errorMessage: string | null;
  attempts: number;
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

export function PostDetailSheet({
  open,
  onOpenChange,
  post,
  onEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: PostDetailData | null;
  onEdit: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [scheduleValue, setScheduleValue] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  if (!post) return null;

  function run(label: string, action: () => Promise<{ success: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        toast.success(label);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handlePublish() {
    startTransition(async () => {
      const result = await publishPostAction(post!.id);
      if (result.success) {
        toast.success(
          result.data.status === "PUBLISHED"
            ? `Veröffentlicht${result.data.externalPostUrl ? ` · ${result.data.externalPostUrl}` : ""}`
            : "Veröffentlichung fehlgeschlagen — siehe Fehlermeldung.",
        );
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleSchedule() {
    if (!scheduleValue) {
      toast.error("Bitte ein Datum wählen.");
      return;
    }
    run("Post terminiert", () => schedulePostAction(post!.id, scheduleValue));
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deletePostAction(post!.id);
      if (result.success) {
        toast.success("Post gelöscht");
        setDeleteOpen(false);
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDuplicate() {
    startTransition(async () => {
      const result = await duplicatePostAction(post!.id);
      if (result.success) {
        toast.success("Post dupliziert");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const canEdit = post.status === "DRAFT" || post.status === "READY";
  const canCancel = ["DRAFT", "READY", "APPROVED", "SCHEDULED"].includes(post.status);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {post.platform} · {post.handle}
              <Badge variant={STATUS_VARIANT[post.status] ?? "outline"}>
                {SOCIAL_POST_STATUS_LABELS[post.status] ?? post.status}
              </Badge>
            </SheetTitle>
            <SheetDescription>{post.campaignName ?? "Ohne Kampagne"}</SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {post.mediaAssetUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.mediaAssetUrl} alt="" className="max-h-64 w-full rounded-md object-cover" />
            ) : null}

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-foreground-subtle)]">Caption</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{post.caption}</p>
            </div>

            {post.hashtags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {post.hashtags.map((tag) => (
                  <Badge key={tag} variant="outline">{tag}</Badge>
                ))}
              </div>
            ) : null}

            {post.affiliateLinkText ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-foreground-subtle)]">Affiliate-Link</p>
                <p className="mt-1 text-sm">{post.affiliateLinkText}</p>
              </div>
            ) : null}

            {post.disclosure ? (
              <p className="text-xs text-[var(--color-foreground-subtle)]">{post.disclosure}</p>
            ) : null}

            {post.scheduledAt ? (
              <p className="text-sm text-[var(--color-foreground-muted)]">
                Geplant: {new Date(post.scheduledAt).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })}
              </p>
            ) : null}
            {post.publishedAt ? (
              <p className="text-sm text-[var(--color-foreground-muted)]">
                Veröffentlicht: {new Date(post.publishedAt).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })}
              </p>
            ) : null}
            {post.errorMessage ? (
              <p role="alert" className="text-sm text-[var(--color-destructive)]">{post.errorMessage}</p>
            ) : null}
            {post.attempts > 0 ? (
              <p className="text-xs text-[var(--color-foreground-subtle)]">{post.attempts} Veröffentlichungsversuch(e)</p>
            ) : null}

            <div className="flex flex-wrap gap-2 border-t border-[var(--color-border)] pt-4">
              {canEdit ? (
                <Button variant="outline" size="sm" onClick={onEdit} disabled={isPending}>
                  <Pencil className="h-4 w-4" /> Bearbeiten
                </Button>
              )
              : null}

              {post.status === "DRAFT" ? (
                <Button size="sm" onClick={() => run("Als bereit markiert", () => changePostStatusAction(post!.id, "READY"))} disabled={isPending}>
                  <CheckCircle2 className="h-4 w-4" /> Bereit markieren
                </Button>
              ) : null}

              {post.status === "READY" ? (
                <Button size="sm" onClick={() => run("Freigegeben", () => changePostStatusAction(post!.id, "APPROVED"))} disabled={isPending}>
                  <CheckCircle2 className="h-4 w-4" /> Freigeben
                </Button>
              ) : null}

              {(post.status === "APPROVED" || post.status === "SCHEDULED" || post.status === "FAILED") ? (
                <Button size="sm" onClick={handlePublish} disabled={isPending}>
                  {post.status === "FAILED" ? <RotateCcw className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                  {post.status === "FAILED" ? "Erneut versuchen" : "Jetzt veröffentlichen"}
                </Button>
              ) : null}

              {canCancel ? (
                <Button variant="outline" size="sm" onClick={() => setCancelOpen(true)} disabled={isPending}>
                  <XCircle className="h-4 w-4" /> Stornieren
                </Button>
              ) : null}

              <Button variant="outline" size="sm" onClick={handleDuplicate} disabled={isPending}>
                <Copy className="h-4 w-4" /> Duplizieren
              </Button>

              {(post.status === "DRAFT" || post.status === "CANCELLED") ? (
                <Button variant="ghost" size="sm" className="text-[var(--color-destructive)]" onClick={() => setDeleteOpen(true)} disabled={isPending}>
                  <Trash2 className="h-4 w-4" /> Löschen
                </Button>
              ) : null}
            </div>

            {post.status === "APPROVED" ? (
              <div className="flex items-end gap-2 border-t border-[var(--color-border)] pt-4">
                <div className="flex-1 space-y-1.5">
                  <label htmlFor="scheduleAt" className="text-sm font-medium">Termin</label>
                  <Input
                    id="scheduleAt"
                    type="datetime-local"
                    value={scheduleValue}
                    onChange={(e) => setScheduleValue(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="sm" onClick={handleSchedule} disabled={isPending}>
                  <CalendarClock className="h-4 w-4" /> Terminieren
                </Button>
              </div>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Post endgültig löschen?"
        description="Dieser Post wird unwiderruflich gelöscht."
        pending={isPending}
        onConfirm={handleDelete}
      />
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Post stornieren?"
        description="Der Post wird storniert und aus dem aktiven Workflow entfernt."
        confirmLabel="Stornieren"
        pending={isPending}
        onConfirm={() =>
          startTransition(async () => {
            const result = await changePostStatusAction(post!.id, "CANCELLED");
            if (result.success) {
              toast.success("Post storniert");
              setCancelOpen(false);
              router.refresh();
            } else {
              toast.error(result.error);
            }
          })
        }
      />
    </>
  );
}
