import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface BarChartData {
  label: string;
  count: number;
}

interface BarChartProps {
  data: BarChartData[];
  title: string;
  columnName: string;
}

export default function BarChart({ data, title, columnName }: BarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground border rounded-md">
        No categorical data available for {columnName}
      </div>
    );
  }

  // Calculate total for percentages
  const total = data.reduce((sum, item) => sum + item.count, 0);

  // Limit label lengths so they don't break the Y-axis
  const formattedData = data.map(item => ({
    ...item,
    displayLabel: item.label.length > 15 ? item.label.substring(0, 15) + "..." : item.label
  }));

  interface TooltipPayloadEntry {
    payload: BarChartData;
  }

  interface CustomTooltipProps {
    active?: boolean;
    payload?: TooltipPayloadEntry[];
  }

  const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const pct = total > 0 ? ((data.count / total) * 100).toFixed(1) : 0;
      return (
        <div className="bg-background border p-3 rounded-lg shadow-md text-sm">
          <p className="font-semibold mb-1">{data.label}</p>
          <p className="text-muted-foreground">
            Count: <span className="font-medium text-foreground">{data.count}</span>
          </p>
          <p className="text-muted-foreground">
            Percentage: <span className="font-medium text-foreground">{pct}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full flex flex-col h-full min-h-[300px]">
      <div className="mb-4">
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="flex-1 min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart 
            data={formattedData} 
            layout="vertical"
            margin={{ top: 10, right: 30, left: 40, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.5} />
            <XAxis 
              type="number"
              tick={{ fontSize: 12 }} 
            />
            <YAxis 
              dataKey="displayLabel"
              type="category"
              tick={{ fontSize: 12 }} 
              axisLine={false}
              tickLine={false}
              width={80}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
              content={<CustomTooltip />}
            />
            <Bar 
              dataKey="count" 
              fill="#10b981" 
              radius={[0, 4, 4, 0]} 
              name="Count" 
              barSize={20}
            />
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
