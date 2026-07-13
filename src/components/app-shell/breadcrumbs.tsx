"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { findNavItem } from "@/lib/app-nav";

export function Breadcrumbs() {
  const pathname = usePathname();
  const navItem = findNavItem(pathname);
  const segments = pathname.split("/").filter(Boolean);

  const trailingSegment =
    segments.length > 2 ? segments[segments.length - 1].replace(/-/g, " ") : null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
      <Link href="/app/dashboard" className="text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]">
        App
      </Link>
      {navItem ? (
        <>
          <ChevronRight className="h-3.5 w-3.5 text-[var(--color-foreground-subtle)]" />
          <Link
            href={navItem.href}
            className={
              trailingSegment
                ? "text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]"
                : "font-medium text-[var(--color-foreground)]"
            }
          >
            {navItem.label}
          </Link>
        </>
      ) : null}
      {trailingSegment ? (
        <>
          <ChevronRight className="h-3.5 w-3.5 text-[var(--color-foreground-subtle)]" />
          <span className="font-medium capitalize text-[var(--color-foreground)]">
            {trailingSegment}
          </span>
        </>
      ) : null}
    </nav>
  );
}
