"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SOCIAL_POST_STATUS_LABELS } from "@/lib/status-labels";
import { PostDetailSheet, type PostDetailData } from "@/components/publishing/post-detail-sheet";

export interface CalendarPost {
  id: string;
  caption: string;
  platform: string;
  handle: string;
  campaignName: string | null;
  status: string;
  calendarDate: string;
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

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function dateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function ContentCalendar({
  posts,
  postDetails,
}: {
  posts: CalendarPost[];
  postDetails: Record<string, PostDetailData>;
}) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [detailId, setDetailId] = useState<string | null>(null);

  const postsByDay = useMemo(() => {
    const map = new Map<string, CalendarPost[]>();
    for (const post of posts) {
      const key = dateKey(new Date(post.calendarDate));
      const list = map.get(key) ?? [];
      list.push(post);
      map.set(key, list);
    }
    return map;
  }, [posts]);

  const days = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = (firstOfMonth.getDay() + 6) % 7; // Monday-first
    const gridStart = new Date(year, month, 1 - startOffset);
    return Array.from({ length: 42 }, (_, i) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + i);
      return date;
    });
  }, [cursor]);

  if (posts.length === 0) {
    return (
      <EmptyState
        title="Noch keine geplanten oder veröffentlichten Posts"
        description="Terminiere oder veröffentliche einen Post in Social-Publishing, um ihn hier zu sehen."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {cursor.toLocaleDateString("de-DE", { month: "long", year: "numeric" })}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
            aria-label="Vorheriger Monat"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCursor(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); })}
          >
            Heute
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
            aria-label="Nächster Monat"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-border)]">
        {WEEKDAYS.map((day) => (
          <div key={day} className="bg-[var(--color-surface-raised)] px-2 py-1.5 text-center text-xs font-semibold text-[var(--color-foreground-subtle)]">
            {day}
          </div>
        ))}
        {days.map((date) => {
          const inMonth = date.getMonth() === cursor.getMonth();
          const isToday = dateKey(date) === dateKey(new Date());
          const dayPosts = postsByDay.get(dateKey(date)) ?? [];
          return (
            <div
              key={date.toISOString()}
              className={`min-h-24 bg-[var(--color-surface)] p-1.5 ${inMonth ? "" : "opacity-40"}`}
            >
              <p className={`mb-1 text-xs ${isToday ? "font-semibold text-[var(--color-primary)]" : "text-[var(--color-foreground-subtle)]"}`}>
                {date.getDate()}
              </p>
              <div className="space-y-1">
                {dayPosts.slice(0, 3).map((post) => (
                  <button
                    key={post.id}
                    onClick={() => setDetailId(post.id)}
                    className="block w-full truncate rounded px-1.5 py-1 text-left text-[11px] hover:bg-[var(--color-surface-raised)]"
                    style={{ borderLeft: "2px solid var(--color-border-strong)" }}
                  >
                    <span className="font-medium">{post.platform}</span> · {post.caption}
                  </button>
                ))}
                {dayPosts.length > 3 ? (
                  <p className="px-1.5 text-[10px] text-[var(--color-foreground-subtle)]">+{dayPosts.length - 3} weitere</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3">
        {Object.entries(SOCIAL_POST_STATUS_LABELS).map(([status, label]) => (
          <span key={status} className="flex items-center gap-1.5 text-xs text-[var(--color-foreground-subtle)]">
            <Badge variant={STATUS_VARIANT[status] ?? "outline"} className="h-2 w-2 rounded-full p-0" />
            {label}
          </span>
        ))}
      </div>

      <PostDetailSheet
        open={Boolean(detailId)}
        onOpenChange={(open) => !open && setDetailId(null)}
        post={detailId ? (postDetails[detailId] ?? null) : null}
        onEdit={() => {}}
      />
    </div>
  );
}
