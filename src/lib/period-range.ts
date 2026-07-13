import type { DashboardPeriod } from "@/lib/dashboard-period";

/** Shared by dashboard and analytics — resolves a period key to a concrete date range. */
export function getPeriodRange(period: DashboardPeriod): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();

  switch (period) {
    case "7d":
      from.setDate(from.getDate() - 7);
      break;
    case "30d":
      from.setDate(from.getDate() - 30);
      break;
    case "90d":
      from.setDate(from.getDate() - 90);
      break;
    case "month":
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
      break;
    case "quarter": {
      const quarterStartMonth = Math.floor(from.getMonth() / 3) * 3;
      from.setMonth(quarterStartMonth, 1);
      from.setHours(0, 0, 0, 0);
      break;
    }
    case "all":
      from.setFullYear(from.getFullYear() - 5);
      break;
  }

  return { from, to };
}
