"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, RotateCcw, XCircle } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VIDEO_JOB_STATUS_LABELS, INTEGRATION_MODE_LABELS } from "@/lib/status-labels";
import { useVideoJobPolling } from "@/hooks/use-video-job-polling";
import { retryVideoJobAction, cancelVideoJobAction } from "@/server/actions/videos";

export interface VideoJobDetailData {
  id: string;
  provider: string;
  format: string;
  aspectRatio: string;
  durationSec: number;
  style: string | null;
  avatar: string | null;
  voice: string | null;
  language: string;
  subtitles: boolean;
  music: string | null;
  status: string;
  progress: number;
  resultUrl: string | null;
  errorMessage: string | null;
  attempts: number;
  scriptTitle: string | null;
  productName: string | null;
  campaignName: string | null;
}

const STATUS_VARIANT: Record<string, "outline" | "success" | "destructive" | "warning"> = {
  QUEUED: "outline",
  PROCESSING: "warning",
  REVIEW_REQUIRED: "warning",
  COMPLETED: "success",
  FAILED: "destructive",
  CANCELLED: "outline",
};

export function VideoJobDetail({ job }: { job: VideoJobDetailData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const states = useVideoJobPolling([job]);
  const live = states[job.id] ?? job;

  function handleRetry() {
    startTransition(async () => {
      const result = await retryVideoJobAction(job.id);
      if (result.success) {
        toast.success("Video-Job neu gestartet");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelVideoJobAction(job.id);
      if (result.success) {
        toast.success("Video-Job abgebrochen");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const isActive = live.status === "QUEUED" || live.status === "PROCESSING";
  const isTerminalFailure = live.status === "FAILED" || live.status === "CANCELLED";

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Status</CardTitle>
            <Badge variant={STATUS_VARIANT[live.status] ?? "outline"}>
              {VIDEO_JOB_STATUS_LABELS[live.status] ?? live.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={live.progress} />
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {isActive
              ? "Wird verarbeitet — die Seite aktualisiert sich automatisch."
              : live.status === "COMPLETED"
                ? "Rendering abgeschlossen."
                : live.status === "REVIEW_REQUIRED"
                  ? "Manuelle Freigabe erforderlich, bevor der Clip weiterverwendet wird."
                  : "Job beendet."}
          </p>
          {live.errorMessage ? (
            <p className="rounded-md border border-[var(--color-destructive)]/40 bg-[var(--color-destructive)]/10 p-3 text-sm text-[var(--color-destructive)]">
              {live.errorMessage}
            </p>
          ) : null}

          {live.status === "COMPLETED" && live.resultUrl ? (
            <div className="space-y-3">
              <div className="relative aspect-[9/16] w-full max-w-xs overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
                <Image src={live.resultUrl} alt="Mock-Videoergebnis" fill className="object-cover" unoptimized />
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href={live.resultUrl} download>
                  <Download className="h-4 w-4" /> Ergebnis herunterladen
                </a>
              </Button>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {isTerminalFailure ? (
              <Button variant="outline" size="sm" onClick={handleRetry} disabled={isPending}>
                <RotateCcw className="h-4 w-4" /> Erneut versuchen
              </Button>
            ) : null}
            {isActive ? (
              <Button variant="ghost" size="sm" className="text-[var(--color-destructive)]" onClick={handleCancel} disabled={isPending}>
                <XCircle className="h-4 w-4" /> Abbrechen
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Auftragsdetails</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Provider" value={`${job.provider} (${INTEGRATION_MODE_LABELS.MOCK})`} />
          <Row label="Format" value={job.format} />
          <Row label="Seitenverhältnis" value={job.aspectRatio} />
          <Row label="Dauer" value={`${job.durationSec}s`} />
          <Row label="Sprache" value={job.language} />
          <Row label="Untertitel" value={job.subtitles ? "Ja" : "Nein"} />
          <Row label="Stil" value={job.style ?? "—"} />
          <Row label="Avatar" value={job.avatar ?? "—"} />
          <Row label="Voice" value={job.voice ?? "—"} />
          <Row label="Musik" value={job.music ?? "—"} />
          <Row label="Skript" value={job.scriptTitle ?? "—"} />
          <Row label="Produkt" value={job.productName ?? "—"} />
          <Row label="Kampagne" value={job.campaignName ?? "—"} />
          <Row label="Versuche" value={String(job.attempts)} />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--color-border)] py-1.5 last:border-0">
      <span className="text-[var(--color-foreground-subtle)]">{label}</span>
      <span>{value}</span>
    </div>
  );
}
