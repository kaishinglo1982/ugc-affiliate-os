"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PostsTable, type PostRow } from "@/components/publishing/posts-table";
import { PostFormSheet } from "@/components/publishing/post-form-sheet";
import { PostDetailSheet, type PostDetailData } from "@/components/publishing/post-detail-sheet";

interface Option {
  id: string;
  label: string;
}

interface PostEditData {
  id: string;
  accountId: string;
  campaignId: string | null;
  mediaAssetId: string | null;
  caption: string;
  hashtags: string[];
  affiliateLinkText: string | null;
  disclosure: string | null;
}

export function PublishingPageClient({
  posts,
  postDetails,
  postEditData,
  accounts,
  campaigns,
  mediaAssets,
}: {
  posts: PostRow[];
  postDetails: Record<string, PostDetailData>;
  postEditData: Record<string, PostEditData>;
  accounts: (Option & { platform: string })[];
  campaigns: Option[];
  mediaAssets: Option[];
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Social-Publishing</h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {posts.length} Post{posts.length === 1 ? "" : "s"} · Veröffentlichung erfordert immer eine explizite Freigabe.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Post erstellen
        </Button>
      </div>

      <PostsTable posts={posts} onOpen={setDetailId} />

      <PostFormSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        accounts={accounts}
        campaigns={campaigns}
        mediaAssets={mediaAssets}
      />
      <PostFormSheet
        open={Boolean(editId)}
        onOpenChange={(open) => !open && setEditId(null)}
        post={editId ? postEditData[editId] : null}
        accounts={accounts}
        campaigns={campaigns}
        mediaAssets={mediaAssets}
      />
      <PostDetailSheet
        open={Boolean(detailId)}
        onOpenChange={(open) => !open && setDetailId(null)}
        post={detailId ? (postDetails[detailId] ?? null) : null}
        onEdit={() => {
          if (detailId) {
            setEditId(detailId);
            setDetailId(null);
          }
        }}
      />
    </div>
  );
}
