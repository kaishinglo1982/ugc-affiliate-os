import { formatEuro } from "@/lib/finance/format";
import { chartSeries } from "@/lib/design-tokens";

interface FunnelProps {
  clicks: number;
  conversions: number;
  revenue: number;
}

export function ConversionFunnel({ clicks, conversions, revenue }: FunnelProps) {
  const stages = [
    { label: "Klicks", value: clicks, display: clicks.toLocaleString("de-DE") },
    { label: "Conversions", value: conversions, display: conversions.toLocaleString("de-DE") },
  ];
  const max = Math.max(clicks, 1);
  const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;

  return (
    <div className="space-y-4">
      {stages.map((stage, index) => (
        <div key={stage.label}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span>{stage.label}</span>
            <span className="tabular-nums text-[var(--color-foreground-muted)]">{stage.display}</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--color-surface-overlay)]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.max(6, (stage.value / max) * 100)}%`,
                backgroundColor: chartSeries[index],
              }}
            />
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm">
        <span className="text-[var(--color-foreground-muted)]">Conversion Rate</span>
        <span className="font-medium tabular-nums">{conversionRate.toFixed(2)} %</span>
      </div>
      <div className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm">
        <span className="text-[var(--color-foreground-muted)]">Zugeordneter Umsatz</span>
        <span className="font-medium tabular-nums">{formatEuro(revenue)}</span>
      </div>
    </div>
  );
}
