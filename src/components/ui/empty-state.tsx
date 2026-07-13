import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/** Every list/table view uses this instead of rendering a bare empty table —
 * an unexplained empty view is treated as a defect (master prompt §24). */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] px-6 py-16 text-center",
        className,
      )}
    >
      {Icon ? (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-surface-raised)] text-[var(--color-foreground-muted)]">
          <Icon className="h-6 w-6" />
        </div>
      ) : null}
      <div className="space-y-1">
        <p className="text-sm font-medium text-[var(--color-foreground)]">{title}</p>
        {description ? (
          <p className="max-w-sm text-sm text-[var(--color-foreground-muted)]">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
