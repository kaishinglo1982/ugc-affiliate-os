"use client";

import { useState } from "react";
import { AlertTriangle, Menu, Search } from "lucide-react";
import { SidebarNav } from "@/components/app-shell/sidebar-nav";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { QuickCreate } from "@/components/app-shell/quick-create";
import { ThemeSwitcher } from "@/components/app-shell/theme-switcher";
import { UserMenu } from "@/components/app-shell/user-menu";
import {
  NotificationsCenter,
  type NotificationItem,
} from "@/components/app-shell/notifications-center";
import { CommandPalette } from "@/components/app-shell/command-palette";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

interface AppShellProps {
  user: { name: string; email: string };
  notifications: NotificationItem[];
  unreadCount: number;
  integrationIssueCount: number;
  children: React.ReactNode;
}

export function AppShell({
  user,
  notifications,
  unreadCount,
  integrationIssueCount,
  children,
}: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-64 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] lg:block">
        <SidebarNav />
      </aside>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-(--z-sticky) flex h-16 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-background)]/85 px-4 backdrop-blur-md sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Navigation öffnen"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="hidden lg:block">
            <Breadcrumbs />
          </div>

          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="ml-0 flex flex-1 items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-foreground-subtle)] transition-colors hover:border-[var(--color-border-strong)] lg:ml-4 lg:max-w-sm"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Suchen oder Aktion ausführen…</span>
            <span className="sm:hidden">Suchen…</span>
            <kbd className="ml-auto hidden rounded border border-[var(--color-border-strong)] px-1.5 py-0.5 font-mono text-[10px] sm:inline">
              ⌘K
            </kbd>
          </button>

          <div className="ml-auto flex items-center gap-1.5">
            {integrationIssueCount > 0 ? (
              <Badge variant="warning" className="hidden items-center gap-1 sm:inline-flex">
                <AlertTriangle className="h-3 w-3" />
                {integrationIssueCount} Integration{integrationIssueCount === 1 ? "" : "en"}
              </Badge>
            ) : (
              <Badge variant="success" className="hidden sm:inline-flex">
                Single-User · Online
              </Badge>
            )}
            <QuickCreate />
            <NotificationsCenter notifications={notifications} unreadCount={unreadCount} />
            <ThemeSwitcher />
            <UserMenu name={user.name} email={user.email} />
          </div>
        </header>

        <main id="main-content" className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}
