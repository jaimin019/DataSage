"use client";

import { useMemo } from "react";
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
import { ClusterPoint, ChartConfig } from "@/lib/types";

const COLOR_PALETTE = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#84cc16", "#f97316",
];

interface ClusterScatterChartProps {
  data: ClusterPoint[];
  config: ChartConfig;
  title: string;
  description: string;
}

interface ClusterTooltipProps {
  active?: boolean;
  payload?: { payload: ClusterPoint }[];
}

function CustomTooltip({ active, payload }: ClusterTooltipProps) {
  if (active && payload && payload.length) {
    const p = payload[0].payload;
    return (
      <div className="bg-background border p-3 rounded-lg shadow-md text-sm">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: COLOR_PALETTE[p.cluster % COLOR_PALETTE.length] }}
          />
          <p className="font-semibold">Cluster {p.cluster}</p>
        </div>
        <p className="text-muted-foreground">
          PCA 1: <span className="font-medium text-foreground">{p.x.toFixed(3)}</span>
        </p>
        <p className="text-muted-foreground">
          PCA 2: <span className="font-medium text-foreground">{p.y.toFixed(3)}</span>
        </p>
      </div>
    );
  }
  return null;
}

export default function ClusterScatterChart({ data, config }: ClusterScatterChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground border border-dashed rounded-md">
        No cluster data available
      </div>
    );
  }

  const k = config.k ?? 3;

  const groupedData = useMemo(() => {
    const groups: Record<number, ClusterPoint[]> = {};
    for (let i = 0; i < k; i++) {
      groups[i] = [];
    }
    data.forEach((d) => {
      if (!groups[d.cluster]) groups[d.cluster] = [];
      groups[d.cluster].push(d);
    });
    return groups;
  }, [data, k]);

  return (
    <div className="w-full h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
          <XAxis
            type="number"
            dataKey="x"
            name="PCA Component 1"
            tick={{ fontSize: 12 }}
            tickMargin={10}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="PCA Component 2"
            tick={{ fontSize: 12 }}
            tickMargin={10}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3" }} />
          <Legend wrapperStyle={{ paddingTop: "10px" }} />

          {Object.keys(groupedData).map((clusterStr) => {
            const clusterId = parseInt(clusterStr, 10);
            const points = groupedData[clusterId];
            return (
              <Scatter
                key={`cluster-${clusterId}`}
                name={`Cluster ${clusterId} (${points.length})`}
                data={points}
                fill={COLOR_PALETTE[clusterId % COLOR_PALETTE.length]}
                opacity={0.8}
              />
            );
          })}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
