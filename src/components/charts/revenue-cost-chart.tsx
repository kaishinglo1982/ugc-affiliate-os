"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { chartChrome, chartSeries } from "@/lib/design-tokens";
import { formatEuro } from "@/lib/finance/format";

interface HistoryPoint {
  date: string;
  revenue: number;
  expense: number;
}

export function RevenueCostChart({ data }: { data: HistoryPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-[var(--color-foreground-muted)]">
        Noch keine Daten im gewählten Zeitraum.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chartSeries[0]} stopOpacity={0.35} />
            <stop offset="100%" stopColor={chartSeries[0]} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chartSeries[4]} stopOpacity={0.3} />
            <stop offset="100%" stopColor={chartSeries[4]} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={chartChrome.gridline} vertical={false} />
        <XAxis
          dataKey="date"
          stroke={chartChrome.axis}
          tick={{ fill: chartChrome.mutedText, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          minTickGap={24}
        />
        <YAxis
          stroke={chartChrome.axis}
          tick={{ fill: chartChrome.mutedText, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={56}
          tickFormatter={(value: number) => `€${value}`}
        />
        <Tooltip
          content={<ChartTooltip formatValue={(v) => formatEuro(v)} />}
          cursor={{ stroke: chartChrome.axis, strokeWidth: 1 }}
        />
        <Legend
          formatter={(value) => (
            <span style={{ color: "var(--color-foreground-muted)", fontSize: 12 }}>{value}</span>
          )}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          name="Umsatz"
          stroke={chartSeries[0]}
          strokeWidth={2}
          fill="url(#revenueFill)"
        />
        <Area
          type="monotone"
          dataKey="expense"
          name="Kosten"
          stroke={chartSeries[4]}
          strokeWidth={2}
          fill="url(#expenseFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
