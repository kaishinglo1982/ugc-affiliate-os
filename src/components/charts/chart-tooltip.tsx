import { chartChrome } from "@/lib/design-tokens";

interface ChartTooltipProps {
  active?: boolean;
  label?: string;
  payload?: Array<{ name: string; value: number; color?: string }>;
  formatValue?: (value: number) => string;
}

export function ChartTooltip({ active, label, payload, formatValue }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      className="rounded-md border px-3 py-2 text-xs shadow-[var(--shadow-md)]"
      style={{
        backgroundColor: chartChrome.tooltipBg,
        borderColor: chartChrome.tooltipBorder,
        color: "var(--color-foreground)",
      }}
    >
      {label ? <p className="mb-1 font-medium">{label}</p> : null}
      <ul className="space-y-0.5">
        {payload.map((entry) => (
          <li key={entry.name} className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color ?? "var(--color-foreground-muted)" }}
            />
            <span className="text-[var(--color-foreground-muted)]">{entry.name}:</span>
            <span className="font-medium tabular-nums">
              {formatValue ? formatValue(entry.value) : entry.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
