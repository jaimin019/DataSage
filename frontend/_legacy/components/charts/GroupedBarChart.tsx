"use client";

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { GroupedBarPoint, ChartConfig } from "@/lib/types";

const COLOR_PALETTE = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#84cc16", "#f97316",
];

interface GroupedBarChartProps {
  data: GroupedBarPoint[];
  config: ChartConfig;
  title: string;
  description: string;
}

interface GroupedBarTooltipPayloadEntry {
  value: number;
  dataKey: string;
  color: string;
}

interface GroupedBarTooltipProps {
  active?: boolean;
  payload?: GroupedBarTooltipPayloadEntry[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: GroupedBarTooltipProps) {
  if (active && payload && payload.length) {
    // Find the underlying data point from the bar payload
    const firstEntry = payload[0] as GroupedBarTooltipPayloadEntry & {
      payload?: GroupedBarPoint;
    };
    const dataPoint = firstEntry?.payload;
    return (
      <div className="bg-background border p-3 rounded-lg shadow-md text-sm">
        <p className="font-semibold mb-2">{label}</p>
        <p className="text-muted-foreground">
          Mean: <span className="font-medium text-foreground">{dataPoint?.mean?.toFixed(2) ?? "—"}</span>
        </p>
        <p className="text-muted-foreground">
          Median: <span className="font-medium text-foreground">{dataPoint?.median?.toFixed(2) ?? "—"}</span>
        </p>
        <p className="text-muted-foreground">
          Count: <span className="font-medium text-foreground">{dataPoint?.count ?? "—"}</span>
        </p>
      </div>
    );
  }
  return null;
}

export default function GroupedBarChart({ data, config }: GroupedBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground border border-dashed rounded-md">
        No grouped bar data available
      </div>
    );
  }

  const isHorizontal = config.orientation === "horizontal";

  return (
    <div className="w-full h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart
          data={data}
          layout={isHorizontal ? "vertical" : "horizontal"}
          margin={{ top: 10, right: 20, bottom: 20, left: isHorizontal ? 20 : 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
          {isHorizontal ? (
            <>
              <YAxis
                dataKey="category"
                type="category"
                width={120}
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <XAxis type="number" tick={{ fontSize: 12 }} />
            </>
          ) : (
            <>
              <XAxis
                dataKey="category"
                tick={{ fontSize: 11 }}
                tickMargin={8}
                angle={-30}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            </>
          )}
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} />
          <Bar
            dataKey="mean"
            fill={COLOR_PALETTE[0]}
            radius={isHorizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            name="Mean"
            barSize={isHorizontal ? 18 : 28}
          />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
