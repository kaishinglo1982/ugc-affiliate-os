/** Client-safe period type/options — kept separate from
 * server/services/dashboard.ts so Client Components never pull in the
 * Prisma/pg dependency chain. */
export type DashboardPeriod = "7d" | "30d" | "90d" | "month" | "quarter" | "all";

export const PERIOD_OPTIONS: Array<{ value: DashboardPeriod; label: string }> = [
  { value: "7d", label: "Letzte 7 Tage" },
  { value: "30d", label: "Letzte 30 Tage" },
  { value: "90d", label: "Letzte 90 Tage" },
  { value: "month", label: "Dieser Monat" },
  { value: "quarter", label: "Dieses Quartal" },
  { value: "all", label: "Gesamter Zeitraum" },
];
