import type { Metadata } from "next";
import { prisma } from "@/lib/db/client";
import { listSocialPosts, listSocialAccounts } from "@/server/services/publishing";
import { PublishingPageClient } from "@/components/publishing/publishing-page-client";
import type { PostRow } from "@/components/publishing/posts-table";
import type { PostDetailData } from "@/components/publishing/post-detail-sheet";

export const metadata: Metadata = { title: "Social-Publishing" };

export default async function PublishingPage() {
  const [posts, accounts, campaigns, mediaAssets] = await Promise.all([
    listSocialPosts(),
    listSocialAccounts(),
    prisma.campaign.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.mediaAsset.findMany({
      select: { id: true, fileName: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const rows: PostRow[] = posts.map((p) => ({
    id: p.id,
    caption: p.caption,
    platform: p.account.platform,
    handle: p.account.handle,
    campaignName: p.campaign?.name ?? null,
    status: p.status,
    scheduledAt: p.scheduledAt ? p.scheduledAt.toISOString() : null,
    publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
  }));

  const postDetails: Record<string, PostDetailData> = {};
  const postEditData: Record<string, { id: string; accountId: string; campaignId: string | null; mediaAssetId: string | null; caption: string; hashtags: string[]; affiliateLinkText: string | null; disclosure: string | null }> = {};
  for (const p of posts) {
    postDetails[p.id] = {
      id: p.id,
      caption: p.caption,
      hashtags: p.hashtags,
      platform: p.account.platform,
      handle: p.account.handle,
      campaignName: p.campaign?.name ?? null,
      mediaAssetUrl: p.mediaAsset?.url ?? null,
      affiliateLinkText: p.affiliateLinkText,
      disclosure: p.disclosure,
      status: p.status,
      scheduledAt: p.scheduledAt ? p.scheduledAt.toISOString() : null,
      publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
      errorMessage: p.errorMessage,
      attempts: p.attempts,
    };
    postEditData[p.id] = {
      id: p.id,
      accountId: p.accountId,
      campaignId: p.campaignId,
      mediaAssetId: p.mediaAssetId,
      caption: p.caption,
      hashtags: p.hashtags,
      affiliateLinkText: p.affiliateLinkText,
      disclosure: p.disclosure,
    };
  }

  return (
    <PublishingPageClient
      posts={rows}
      postDetails={postDetails}
      postEditData={postEditData}
      accounts={accounts.map((a) => ({ id: a.id, label: a.handle, platform: a.platform }))}
      campaigns={campaigns.map((c) => ({ id: c.id, label: c.name }))}
      mediaAssets={mediaAssets.map((m) => ({ id: m.id, label: m.fileName }))}
    />
  );
}
