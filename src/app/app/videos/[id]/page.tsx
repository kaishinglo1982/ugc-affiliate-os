import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getVideoJobById } from "@/server/services/videos";
import { VideoJobDetail } from "@/components/videos/video-job-detail";

interface VideoJobPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: VideoJobPageProps): Promise<Metadata> {
  const { id } = await params;
  const job = await getVideoJobById(id);
  return { title: job ? `Video-Job: ${job.format}` : "Video-Job" };
}

export default async function VideoJobPage({ params }: VideoJobPageProps) {
  const { id } = await params;
  const job = await getVideoJobById(id);
  if (!job) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{job.format}</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {job.product?.name ?? job.campaign?.name ?? "Ohne Zuordnung"}
        </p>
      </div>
      <VideoJobDetail
        job={{
          id: job.id,
          provider: job.provider,
          format: job.format,
          aspectRatio: job.aspectRatio,
          durationSec: job.durationSec,
          style: job.style,
          avatar: job.avatar,
          voice: job.voice,
          language: job.language,
          subtitles: job.subtitles,
          music: job.music,
          status: job.status,
          progress: job.progress,
          resultUrl: job.resultUrl,
          errorMessage: job.errorMessage,
          attempts: job.attempts,
          scriptTitle: job.script?.title ?? null,
          productName: job.product?.name ?? null,
          campaignName: job.campaign?.name ?? null,
        }}
      />
    </div>
  );
}
