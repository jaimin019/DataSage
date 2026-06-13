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
import { AnomalyScatterPoint, ChartConfig } from "@/lib/types";

interface AnomalyScatterChartProps {
  data: AnomalyScatterPoint[];
  config: ChartConfig;
  title: string;
  description: string;
}

interface AnomalyTooltipProps {
  active?: boolean;
  payload?: { payload: AnomalyScatterPoint }[];
  xLabel: string;
  yLabel: string;
}

function CustomTooltip({ active, payload, xLabel, yLabel }: AnomalyTooltipProps) {
  if (active && payload && payload.length) {
    const p = payload[0].payload;
    return (
      <div className={`bg-background border p-3 rounded-lg shadow-md text-sm ${p.is_anomaly ? "border-destructive" : ""}`}>
        <p className="font-semibold mb-1">
          {p.is_anomaly ? "🚨 Anomaly" : "Normal Point"}
        </p>
        <p className="text-muted-foreground">
          {xLabel}: <span className="font-medium text-foreground">{p.x.toFixed(3)}</span>
        </p>
        <p className="text-muted-foreground">
          {yLabel}: <span className="font-medium text-foreground">{p.y.toFixed(3)}</span>
        </p>
      </div>
    );
  }
  return null;
}

export default function AnomalyScatterChart({ data, config }: AnomalyScatterChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground border border-dashed rounded-md">
        No anomaly data available
      </div>
    );
  }

  const xLabel = config.x_label || config.xLabel || "X";
  const yLabel = config.y_label || config.yLabel || "Y";

  const normalData = data.filter((d) => !d.is_anomaly);
  const anomalyData = data.filter((d) => d.is_anomaly);

  return (
    <div className="w-full h-[320px]">
      <style>{`
        @keyframes anomalyPulse {
          0% { opacity: 0.9; }
          50% { opacity: 0.5; }
          100% { opacity: 0.9; }
        }
      `}</style>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
          <XAxis
            type="number"
            dataKey="x"
            name={xLabel}
            tick={{ fontSize: 12 }}
            tickMargin={10}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={yLabel}
            tick={{ fontSize: 12 }}
            tickMargin={10}
          />
          <Tooltip
            content={<CustomTooltip xLabel={xLabel} yLabel={yLabel} />}
            cursor={{ strokeDasharray: "3 3" }}
          />
          <Legend wrapperStyle={{ paddingTop: "10px" }} />

          <Scatter
            name={`Normal (${normalData.length})`}
            data={normalData}
            fill="#6366f1"
            opacity={0.5}
          />
          <Scatter
            name={`Anomaly (${anomalyData.length})`}
            data={anomalyData}
            fill="#ef4444"
            opacity={0.9}
            shape={(props: { cx?: number; cy?: number }) => {
              const { cx = 0, cy = 0 } = props;
              return (
                <g>
                  <circle cx={cx} cy={cy} r={5} fill="#ef4444" opacity={0.9} />
                  <circle
                    cx={cx}
                    cy={cy}
                    r={8}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth={1.5}
                    opacity={0.4}
                    style={{ animation: "anomalyPulse 2s ease-in-out infinite" }}
                  />
                </g>
              );
            }}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
