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
import type { ForecastPoint } from "@/lib/types";

interface Props {
  historical: { ds: string; y: number }[];
  forecast: ForecastPoint[];
  targetCol: string;
  isYearly?: boolean;
}

interface CombinedPoint {
  date: string;
  formattedDate: string;
  historical_y: number | null;
  forecast_yhat: number | null;
  confidence_range: [number, number] | null;
}

function formatDateLabel(ds: string, isYearly: boolean): string {
  if (isYearly) {
    const num = parseInt(ds, 10);
    if (!isNaN(num)) return num.toString();
    const d = new Date(ds);
    if (!isNaN(d.getTime())) return d.getFullYear().toString();
    return ds;
  }
  const d = new Date(ds);
  if (!isNaN(d.getTime()))
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  return ds;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border p-3 rounded-lg shadow-md text-sm">
      <p className="font-semibold mb-2">{payload[0].payload.formattedDate}</p>
      {payload.map((entry: any, i: number) => {
        if (entry.dataKey === "historical_y" && entry.value !== null)
          return (
            <div key={i} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span>Historical: <span className="font-medium tabular-nums">{Number(entry.value).toFixed(2)}</span></span>
            </div>
          );
        if (entry.dataKey === "forecast_yhat" && entry.value !== null)
          return (
            <div key={i} className="flex items-center gap-2 mt-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span>Forecast: <span className="font-medium tabular-nums">{Number(entry.value).toFixed(2)}</span></span>
            </div>
          );
        return null;
      })}
    </div>
  );
}

export default function ForecastChart({ historical, forecast, targetCol, isYearly = false }: Props) {
  if ((!historical || historical.length === 0) && (!forecast || forecast.length === 0)) {
    return (
      <div className="flex h-[400px] items-center justify-center text-sm text-muted-foreground border rounded-md">
        No forecast data available
      </div>
    );
  }

  const combined: CombinedPoint[] = [];
  const step = historical.length > 200 ? Math.floor(historical.length / 200) : 1;
  for (let i = 0; i < historical.length; i += step) {
    const h = historical[i];
    combined.push({
      date: h.ds,
      formattedDate: formatDateLabel(h.ds, isYearly),
      historical_y: h.y,
      forecast_yhat: null,
      confidence_range: null,
    });
  }
  forecast.forEach((f) =>
    combined.push({
      date: f.ds,
      formattedDate: formatDateLabel(f.ds, isYearly),
      historical_y: null,
      forecast_yhat: f.yhat,
      confidence_range: [f.yhat_lower, f.yhat_upper],
    }),
  );

  return (
    <div className="w-full flex flex-col h-full min-h-[400px]">
      <div className="mb-4">
        <h3 className="font-semibold text-lg">{targetCol} Forecast</h3>
      </div>
      <div className="flex-1 min-h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={combined} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
            <XAxis dataKey="formattedDate" tick={{ fontSize: 12 }} minTickGap={50} tickMargin={10} />
            <YAxis tick={{ fontSize: 12 }} domain={["auto", "auto"]} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={36} />
            <Area type="monotone" dataKey="confidence_range" fill="var(--color-primary-glow)" stroke="none" opacity={0.2} name="Confidence Interval" connectNulls />
            <Line type="monotone" dataKey="historical_y" stroke="var(--color-primary)" strokeWidth={2} dot={false} name="Historical" connectNulls />
            <Line type="monotone" dataKey="forecast_yhat" stroke="var(--color-warning)" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Forecast" connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
