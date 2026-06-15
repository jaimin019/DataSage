import { useState } from "react";
import type { ChartResponse } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Maximize2, BarChart2 } from "lucide-react";

interface Props {
  chart: ChartResponse;
}

const TYPE_LABELS: Record<string, string> = {
  distribution: "Distribution",
  categorical_bar: "Categorical",
  heatmap: "Correlation",
  scatter: "Scatter",
  line_trend: "Trend",
  anomaly_scatter: "Anomaly",
  cluster_scatter: "Clustering",
  grouped_bar: "Comparison",
  box_plots: "Box Plot",
};

export function ChartImageCard({ chart }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);

  return (
    <>
      <Card className="overflow-hidden group hover:border-primary/40 hover:shadow-lg transition-all">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-sm font-semibold leading-snug break-words">
              {chart.title}
            </CardTitle>
            <Badge variant="secondary" className="shrink-0 text-[10px] uppercase tracking-wider">
              {TYPE_LABELS[chart.type] ?? chart.type}
            </Badge>
          </div>
          <CardDescription className="text-xs line-clamp-2">{chart.description}</CardDescription>
        </CardHeader>

        <CardContent className="p-0 relative">
          {!loaded && !error && (
            <div className="relative h-[280px] w-full shimmer rounded-none" />
          )}
          <button
            onClick={() => loaded && setOpen(true)}
            className="block w-full relative overflow-hidden"
            aria-label="Open chart fullscreen"
          >
            <img
              src={chart.image_url}
              alt={chart.title}
              className={cn(
                "w-full h-auto max-h-[350px] object-contain transition-all duration-300 bg-background group-hover:scale-105",
                loaded ? "opacity-100" : "opacity-0 h-0",
              )}
              onLoad={() => setLoaded(true)}
              onError={() => setError(true)}
              loading="lazy"
            />
            {loaded && (
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur rounded-md p-1.5 border">
                <Maximize2 className="h-3.5 w-3.5" />
              </div>
            )}
          </button>
          {error && (
            <div className="flex h-[280px] items-center justify-center flex-col gap-2 text-muted-foreground text-sm">
              <BarChart2 className="w-8 h-8 text-muted-foreground/40" />
              <span>Chart unavailable</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl">
          <DialogTitle className="text-base">{chart.title}</DialogTitle>
          <img src={chart.image_url} alt={chart.title} className="w-full h-auto rounded-lg" />
        </DialogContent>
      </Dialog>
    </>
  );
}
