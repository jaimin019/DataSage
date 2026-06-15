"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ScatterDataPoint, ChartConfig } from "@/lib/types";

const COLOR_PALETTE = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#84cc16", "#f97316",
];

interface ScatterPlotChartProps {
  data: ScatterDataPoint[];
  config: ChartConfig;
  title: string;
  description: string;
}

interface ScatterTooltipProps {
  active?: boolean;
  payload?: { payload: ScatterDataPoint }[];
  xLabel: string;
  yLabel: string;
}

function CustomTooltip({ active, payload, xLabel, yLabel }: ScatterTooltipProps) {
  if (active && payload && payload.length) {
    const p = payload[0].payload;
    return (
      <div className="bg-background border p-3 rounded-lg shadow-md text-sm">
        <p className="font-semibold mb-1">{p.color_group}</p>
        <p className="text-muted-foreground">
          {xLabel}: <span className="font-medium text-foreground">{p.x.toFixed(2)}</span>
        </p>
        <p className="text-muted-foreground">
          {yLabel}: <span className="font-medium text-foreground">{p.y.toFixed(2)}</span>
        </p>
      </div>
    );
  }
  return null;
}

export default function ScatterPlotChart({ data, config, title, description }: ScatterPlotChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground border border-dashed rounded-md">
        No scatter data available
      </div>
    );
  }

  const xLabel = config.x_label || config.xLabel || "X";
  const yLabel = config.y_label || config.yLabel || "Y";

  // Group by color_group
  const groups: Record<string, ScatterDataPoint[]> = {};
  data.forEach((point) => {
    const group = point.color_group || "default";
    if (!groups[group]) groups[group] = [];
    groups[group].push(point);
  });

  const groupNames = Object.keys(groups);

  return (
    <div className="w-full h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
          <XAxis
            type="number"
            dataKey="x"
            name={xLabel}
            tick={{ fontSize: 12 }}
            tickMargin={10}
            label={{ value: xLabel, position: "insideBottom", offset: -5, fontSize: 12 }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={yLabel}
            tick={{ fontSize: 12 }}
            tickMargin={10}
            label={{ value: yLabel, angle: -90, position: "insideLeft", fontSize: 12 }}
          />
          <Tooltip
            content={
              <CustomTooltip
                xLabel={xLabel}
                yLabel={yLabel}
              />
            }
            cursor={{ strokeDasharray: "3 3" }}
          />
          <Legend wrapperStyle={{ paddingTop: "10px" }} />

          {groupNames.map((groupName, idx) => (
            <Scatter
              key={groupName}
              name={groupName}
              data={groups[groupName]}
              fill={COLOR_PALETTE[idx % COLOR_PALETTE.length]}
              opacity={0.7}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
