import { cn } from "@/lib/utils";

export interface BarListItem {
  label: string;
  value: number;
  formattedValue?: string;
}

/**
 * Single-hue horizontal magnitude comparison (no legend needed — the title
 * names the series). Values are always direct-labeled per-bar, so identity
 * and magnitude never depend on color alone.
 */
export function BarList({
  items,
  color = "#4f46e5",
  emptyLabel = "Noch keine Daten.",
}: {
  items: BarListItem[];
  color?: string;
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-[var(--color-foreground-muted)]">{emptyLabel}</p>;
  }

  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-center justify-between gap-2 text-sm">
            <span className="truncate text-[var(--color-foreground)]">{item.label}</span>
            <span className="shrink-0 tabular-nums text-[var(--color-foreground-muted)]">
              {item.formattedValue ?? item.value.toLocaleString("de-DE")}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-overlay)]">
            <div
              className={cn("h-full rounded-full transition-all duration-500")}
              style={{ width: `${Math.max(4, (item.value / max) * 100)}%`, backgroundColor: color }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
