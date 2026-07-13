import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { KpiValue, type KpiVariant } from "@/components/dashboard/kpi-value";

interface KpiCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  variant?: KpiVariant;
  tone?: "default" | "positive" | "negative";
}

const TONE_CLASS: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  default: "text-[var(--color-foreground)]",
  positive: "text-[var(--color-success)]",
  negative: "text-[var(--color-destructive)]",
};

/** Server Component: renders the static label/icon chrome itself and only
 * hands the numeric value + a plain variant string across the client
 * boundary to `KpiValue` for the animated count-up. */
export function KpiCard({ label, value, icon: Icon, variant = "number", tone = "default" }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs uppercase tracking-wide text-[var(--color-foreground-subtle)]">
            {label}
          </p>
          <Icon className="h-4 w-4 shrink-0 text-[var(--color-foreground-subtle)]" />
        </div>
        <p className={`mt-2 text-2xl font-semibold tabular-nums ${TONE_CLASS[tone]}`}>
          <KpiValue value={value} variant={variant} />
        </p>
      </CardContent>
    </Card>
  );
}
