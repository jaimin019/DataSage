import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'

export interface HistogramBin {
  bin_label: string
  bin_start: number
  bin_end: number
  count: number
}

interface Props {
  data: HistogramBin[]
  title?: string
  columnName?: string
  description?: string
  color?: string
}

interface TooltipPayloadEntry {
  payload: HistogramBin;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload?.length) {
    const d = payload[0].payload as HistogramBin
    return (
      <div className="rounded-lg border bg-card p-3 shadow-sm text-sm">
        <p className="font-medium">Range: {d.bin_label}</p>
        <p className="text-muted-foreground">Count: <span className="text-foreground font-semibold">{d.count}</span></p>
      </div>
    )
  }
  return null
}

export default function HistogramChart({ data, title, description, color = '#6366f1' }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground text-sm border border-dashed rounded-md">
        No data available
      </div>
    )
  }

  // Find max count for color intensity scaling
  const maxCount = Math.max(...data.map(d => d.count))

  return (
    <div className="w-full">
      {description && (
        <p className="text-xs text-muted-foreground mb-3">{description}</p>
      )}
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={data}
          margin={{ top: 5, right: 20, left: 10, bottom: 40 }}
          barCategoryGap="2%"
          barGap={0}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
          <XAxis
            dataKey="bin_label"
            tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
            interval={Math.floor(data.length / 6)}
            angle={-35}
            textAnchor="end"
            height={50}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            width={40}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
          <Bar
            dataKey="count"
            fill={color}
            radius={[3, 3, 0, 0]}
            minPointSize={2}
            maxBarSize={40}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={color}
                fillOpacity={0.4 + 0.6 * (entry.count / maxCount)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
