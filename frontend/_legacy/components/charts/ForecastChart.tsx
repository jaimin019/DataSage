"use client";

import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ForecastPoint } from "@/lib/types";

interface ForecastChartProps {
  historical: { ds: string; y: number }[];
  forecast: ForecastPoint[];
  targetCol: string;
  isYearly?: boolean;
}

interface CombinedDataPoint {
  date: string;
  formattedDate: string;
  historical_y: number | null;
  forecast_yhat: number | null;
  confidence_range: [number, number] | null;
}

interface ForecastTooltipPayloadEntry {
  dataKey: string;
  value: number | [number, number] | null;
  color: string;
  payload: CombinedDataPoint;
}

interface ForecastTooltipProps {
  active?: boolean;
  payload?: ForecastTooltipPayloadEntry[];
}

function formatDateLabel(ds: string, isYearly: boolean): string {
  if (isYearly) {
    // Year-based: just show the year number
    const num = parseInt(ds, 10);
    if (!isNaN(num)) return num.toString();
    // Try extracting year from a date string
    const date = new Date(ds);
    if (!isNaN(date.getTime())) return date.getFullYear().toString();
    return ds;
  }
  try {
    const date = new Date(ds);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    }
  } catch {
    // fallback
  }
  return ds;
}

function CustomTooltip({ active, payload }: ForecastTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border p-3 rounded-lg shadow-md text-sm">
        <p className="font-semibold mb-2">{payload[0].payload.formattedDate}</p>
        {payload.map((entry, index) => {
          if (entry.dataKey === "historical_y" && entry.value !== null) {
            return (
              <div key={index} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                <span>Historical: <span className="font-medium">{(entry.value as number).toFixed(2)}</span></span>
              </div>
            );
          }
          if (entry.dataKey === "forecast_yhat" && entry.value !== null) {
            return (
              <div key={index} className="flex items-center gap-2 mt-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                <span>Forecast: <span className="font-medium">{(entry.value as number).toFixed(2)}</span></span>
              </div>
            );
          }
          if (entry.dataKey === "confidence_range" && entry.value !== null) {
            const range = entry.value as [number, number];
            return (
              <div key={index} className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <div className="w-3 h-3 rounded-sm opacity-50" style={{ backgroundColor: entry.color }} />
                <span>Range: [{range[0].toFixed(2)}, {range[1].toFixed(2)}]</span>
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  }
  return null;
}

export default function ForecastChart({ historical, forecast, targetCol, isYearly = false }: ForecastChartProps) {
  if ((!historical || historical.length === 0) && (!forecast || forecast.length === 0)) {
    return (
      <div className="flex h-[400px] items-center justify-center text-sm text-muted-foreground border rounded-md">
        No forecast data available
      </div>
    );
  }

  const combinedData: CombinedDataPoint[] = [];
  
  // Downsample historical data to prevent chart lag if > 200 points
  const step = historical.length > 200 ? Math.floor(historical.length / 200) : 1;
  
  for (let i = 0; i < historical.length; i += step) {
    const h = historical[i];
    combinedData.push({
      date: h.ds,
      formattedDate: formatDateLabel(h.ds, isYearly),
      historical_y: h.y,
      forecast_yhat: null,
      confidence_range: null,
    });
  }

  // Add forecast data
  forecast.forEach((f) => {
    combinedData.push({
      date: f.ds,
      formattedDate: formatDateLabel(f.ds, isYearly),
      historical_y: null,
      forecast_yhat: f.yhat,
      confidence_range: [f.yhat_lower, f.yhat_upper],
    });
  });

  return (
    <div className="w-full flex flex-col h-full min-h-[400px]">
      <div className="mb-4">
        <h3 className="font-semibold text-lg">{targetCol} Forecast</h3>
      </div>
      <div className="flex-1 min-h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={combinedData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
            <XAxis 
              dataKey="formattedDate" 
              tick={{ fontSize: 12 }} 
              minTickGap={50}
              tickMargin={10}
            />
            <YAxis 
              tick={{ fontSize: 12 }} 
              domain={["auto", "auto"]}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={36} />
            
            {/* Confidence Band (Area) */}
            <Area 
              type="monotone" 
              dataKey="confidence_range" 
              fill="#fb923c" 
              stroke="none" 
              opacity={0.2} 
              name="Confidence Interval" 
              connectNulls
            />
            
            {/* Historical Data (Line) */}
            <Line 
              type="monotone" 
              dataKey="historical_y" 
              stroke="#3b82f6" 
              strokeWidth={2} 
              dot={false} 
              name="Historical" 
              connectNulls
            />
            
            {/* Forecast Data (Line) */}
            <Line 
              type="monotone" 
              dataKey="forecast_yhat" 
              stroke="#f97316" 
              strokeWidth={2} 
              strokeDasharray="5 5" 
              dot={false} 
              name="Forecast" 
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
