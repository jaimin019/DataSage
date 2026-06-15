import { useEffect, useState } from "react";
import { ChartImageCard } from "./ChartImageCard";
import { getVisualizations } from "@/lib/api";
import type { ChartResponse } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, BarChart2 } from "lucide-react";

interface Props {
  sessionId: string;
}

const FULL_WIDTH_TYPES = ["heatmap", "cluster_scatter", "box_plots", "line_trend"];

export function ChartGallery({ sessionId }: Props) {
  const [charts, setCharts] = useState<ChartResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    getVisualizations(sessionId)
      .then((data) => {
        const sorted = [...data.charts].sort((a, b) => a.sort_order - b.sort_order);
        setCharts(sorted);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card overflow-hidden">
            <div className="p-4 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-[280px] w-full rounded-none" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7 text-muted-foreground" />
        </div>
        <p className="font-medium">Could not load charts</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (charts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
          <BarChart2 className="w-7 h-7 text-muted-foreground" />
        </div>
        <p className="font-medium">No charts available</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        {charts.length} chart{charts.length !== 1 ? "s" : ""} generated
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {charts.map((chart) => (
          <div
            key={chart.chart_id}
            className={FULL_WIDTH_TYPES.includes(chart.type) ? "md:col-span-2" : ""}
          >
            <ChartImageCard chart={chart} />
          </div>
        ))}
      </div>
    </div>
  );
}
