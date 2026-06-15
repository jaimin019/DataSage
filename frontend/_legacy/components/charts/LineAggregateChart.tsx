"use client";

import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { LineDataPoint, ChartConfig } from "@/lib/types";

const COLOR_PALETTE = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#84cc16", "#f97316",
];

interface LineAggregateChartProps {
  data: LineDataPoint[];
  config: ChartConfig;
  title: string;
  description: string;
}

interface LineTooltipPayloadEntry {
  value: number;
  name: string;
  color: string;
}

interface LineTooltipProps {
  active?: boolean;
  payload?: LineTooltipPayloadEntry[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: LineTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border p-3 rounded-lg shadow-md text-sm">
        <p className="font-semibold mb-1">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} className="text-muted-foreground">
            {entry.name}:{" "}
            <span className="font-medium text-foreground">
              {typeof entry.value === "number" ? entry.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : entry.value}
            </span>
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export default function LineAggregateChart({ data, config }: LineAggregateChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground border border-dashed rounded-md">
        No line chart data available
      </div>
    );
  }

  const xKey = config.x_key || config.xLabel || "x";
  const yKey = config.y_key || config.yLabel || "y";

  return (
    <div className="w-full h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
          <defs>
            <linearGradient id="lineAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLOR_PALETTE[0]} stopOpacity={0.15} />
              <stop offset="95%" stopColor={COLOR_PALETTE[0]} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.4} />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 12 }}
            tickMargin={8}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            domain={["auto", "auto"]}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) =>
              v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
            }
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey={yKey}
            fill="url(#lineAreaGradient)"
            stroke="none"
            name={config.y_label || yKey}
          />
          <Line
            type="monotone"
            dataKey={yKey}
            stroke={COLOR_PALETTE[0]}
            strokeWidth={2}
            dot={{ r: 4, fill: COLOR_PALETTE[0] }}
            activeDot={{ r: 6 }}
            name={config.y_label || yKey}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
