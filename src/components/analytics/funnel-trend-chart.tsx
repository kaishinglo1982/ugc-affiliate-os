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

interface TrendPoint {
  date: string;
  clicks: number;
  conversions: number;
}

export function FunnelTrendChart({ data }: { data: TrendPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-[var(--color-foreground-muted)]">
        Noch keine Klicks oder Conversions im gewählten Zeitraum/Filter.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="clicksFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chartSeries[1]} stopOpacity={0.35} />
            <stop offset="100%" stopColor={chartSeries[1]} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="conversionsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chartSeries[2]} stopOpacity={0.35} />
            <stop offset="100%" stopColor={chartSeries[2]} stopOpacity={0} />
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
          width={40}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: chartChrome.axis, strokeWidth: 1 }} />
        <Legend
          formatter={(value) => (
            <span style={{ color: "var(--color-foreground-muted)", fontSize: 12 }}>{value}</span>
          )}
        />
        <Area type="monotone" dataKey="clicks" name="Klicks" stroke={chartSeries[1]} strokeWidth={2} fill="url(#clicksFill)" />
        <Area type="monotone" dataKey="conversions" name="Conversions" stroke={chartSeries[2]} strokeWidth={2} fill="url(#conversionsFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
