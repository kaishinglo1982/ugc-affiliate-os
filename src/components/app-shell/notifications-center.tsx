"use client";

import { useState, useTransition } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/server/actions/notifications";

export interface NotificationItem {
  id: string;
  level: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
  title: string;
  message: string;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
}

const LEVEL_DOT: Record<NotificationItem["level"], string> = {
  INFO: "bg-[var(--color-cyan)]",
  SUCCESS: "bg-[var(--color-success)]",
  WARNING: "bg-[var(--color-warning)]",
  ERROR: "bg-[var(--color-destructive)]",
};

export function NotificationsCenter({
  notifications,
  unreadCount,
}: {
  notifications: NotificationItem[];
  unreadCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Benachrichtigungen">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-destructive)] px-1 text-[10px] font-semibold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <p className="text-sm font-semibold">Benachrichtigungen</p>
          {unreadCount > 0 ? (
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline disabled:opacity-50"
              disabled={isPending}
              onClick={() =>
                startTransition(() => {
                  void markAllNotificationsReadAction();
                })
              }
            >
              <CheckCheck className="h-3.5 w-3.5" /> Alle gelesen
            </button>
          ) : null}
        </div>
        {notifications.length === 0 ? (
          <div className="p-4">
            <EmptyState title="Keine Benachrichtigungen" description="Neue Ereignisse erscheinen hier." />
          </div>
        ) : (
          <ScrollArea className="max-h-80">
            <ul>
              {notifications.map((notification) => (
                <li
                  key={notification.id}
                  className={cn(
                    "flex gap-3 border-b border-[var(--color-border)] px-4 py-3 last:border-0",
                    !notification.readAt && "bg-[var(--color-surface-raised)]",
                  )}
                >
                  <span
                    className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", LEVEL_DOT[notification.level])}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="mt-0.5 text-xs text-[var(--color-foreground-muted)]">
                      {notification.message}
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--color-foreground-subtle)]">
                      {formatDistanceToNow(notification.createdAt, { addSuffix: true, locale: de })}
                    </p>
                  </div>
                  {!notification.readAt ? (
                    <button
                      type="button"
                      className="shrink-0 self-start text-[11px] text-[var(--color-primary)] hover:underline"
                      onClick={() =>
                        startTransition(() => {
                          void markNotificationReadAction(notification.id);
                        })
                      }
                    >
                      Gelesen
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
