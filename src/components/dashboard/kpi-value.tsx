"use client";

import { AnimatedNumber } from "@/components/motion/animated-number";
import { formatEuro } from "@/lib/finance/format";

export type KpiVariant = "number" | "currency" | "percent";

const FORMATTERS: Record<KpiVariant, (value: number) => string> = {
  number: (v) => Math.round(v).toLocaleString("de-DE"),
  currency: (v) => formatEuro(v),
  percent: (v) => `${v.toFixed(2)} %`,
};

/**
 * Client-boundary leaf: only ever receives plain serializable props (a
 * number and a variant string) from its Server Component parent, never a
 * function or component reference — those cannot cross the RSC boundary.
 */
export function KpiValue({ value, variant = "number" }: { value: number; variant?: KpiVariant }) {
  return <AnimatedNumber value={value} format={FORMATTERS[variant]} />;
}
