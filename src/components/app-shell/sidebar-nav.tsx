"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { NAV_SECTIONS } from "@/lib/app-nav";
import { cn } from "@/lib/utils";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <Link href="/" className="flex items-center gap-2 px-4 py-5 font-semibold" onClick={onNavigate}>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-violet)] to-[var(--color-cyan)] text-white">
          <Sparkles className="h-4 w-4" />
        </span>
        UGC Affiliate OS
      </Link>
      <nav
        className="flex-1 space-y-6 overflow-y-auto px-3 pb-6"
        aria-label="App-Navigation"
      >
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="px-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-foreground-subtle)]">
              {section.title}
            </p>
            <div className="mt-1.5 space-y-0.5">
              {section.items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-[var(--color-foreground-muted)] transition-colors hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-foreground)]",
                      active &&
                        "bg-[var(--color-primary)]/12 text-[var(--color-foreground)]",
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}
