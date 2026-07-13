import { DIMENSION_LABELS, INVERTED_DIMENSIONS, type ScoreBreakdownEntry } from "@/features/products/scoring";

export function ScoreBreakdown({ breakdown, total }: { breakdown: ScoreBreakdownEntry[]; total: number }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
        <span className="text-sm font-medium">Gesamtscore</span>
        <span className="text-lg font-semibold tabular-nums">{total} / 100</span>
      </div>
      <ul className="space-y-2">
        {breakdown.map((entry) => (
          <li key={entry.dimension}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span>
                {DIMENSION_LABELS[entry.dimension]}
                {INVERTED_DIMENSIONS.has(entry.dimension) ? (
                  <span className="ml-1 text-xs text-[var(--color-foreground-subtle)]">(invertiert)</span>
                ) : null}
              </span>
              <span className="tabular-nums text-[var(--color-foreground-muted)]">
                {entry.rawValue}/10 · Gewicht {(entry.weight * 100).toFixed(0)}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-overlay)]">
              <div
                className="h-full rounded-full bg-[var(--color-primary)]"
                style={{ width: `${(entry.contribution / (entry.weight * 100)) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
