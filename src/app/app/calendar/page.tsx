import type { Metadata } from "next";
import { listPostsForCalendar } from "@/server/services/publishing";
import { ContentCalendar, type CalendarPost } from "@/components/calendar/content-calendar";
import type { PostDetailData } from "@/components/publishing/post-detail-sheet";

export const metadata: Metadata = { title: "Content-Kalender" };

export default async function CalendarPage() {
  const posts = await listPostsForCalendar();

  const calendarPosts: CalendarPost[] = posts.map((p) => ({
    id: p.id,
    caption: p.caption,
    platform: p.account.platform,
    handle: p.account.handle,
    campaignName: p.campaign?.name ?? null,
    status: p.status,
    calendarDate: p.calendarDate.toISOString(),
  }));

  const postDetails: Record<string, PostDetailData> = {};
  for (const p of posts) {
    postDetails[p.id] = {
      id: p.id,
      caption: p.caption,
      hashtags: p.hashtags,
      platform: p.account.platform,
      handle: p.account.handle,
      campaignName: p.campaign?.name ?? null,
      mediaAssetUrl: null,
      affiliateLinkText: p.affiliateLinkText,
      disclosure: p.disclosure,
      status: p.status,
      scheduledAt: p.scheduledAt ? p.scheduledAt.toISOString() : null,
      publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
      errorMessage: p.errorMessage,
      attempts: p.attempts,
    };
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Content-Kalender</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Geplante und veröffentlichte Posts im Überblick.
        </p>
      </div>
      <ContentCalendar posts={calendarPosts} postDetails={postDetails} />
    </div>
  );
}
