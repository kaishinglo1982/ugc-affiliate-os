import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { listVideoJobs } from "@/server/services/videos";
import { VideosTable, type VideoJobRow } from "@/components/videos/videos-table";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Video-Generator" };

export default async function VideosPage() {
  const jobs = await listVideoJobs();

  const rows: VideoJobRow[] = jobs.map((j) => ({
    id: j.id,
    format: j.format,
    aspectRatio: j.aspectRatio,
    provider: j.provider,
    status: j.status,
    progress: j.progress,
    resultUrl: j.resultUrl,
    errorMessage: j.errorMessage,
    campaignName: j.campaign?.name ?? null,
    productName: j.product?.name ?? null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Video-Generator</h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {rows.length} Job{rows.length === 1 ? "" : "s"} · Mock-Provider läuft vollständig lokal.
          </p>
        </div>
        <Button asChild>
          <Link href="/app/videos/new">
            <Plus className="h-4 w-4" /> Videoauftrag starten
          </Link>
        </Button>
      </div>
      <VideosTable jobs={rows} />
    </div>
  );
}
