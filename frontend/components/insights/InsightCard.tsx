import { Insight } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface InsightCardProps {
  insight: Insight;
}

const CATEGORY_COLORS: Record<string, string> = {
  trend: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  correlation: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  anomaly: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  distribution: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  recommendation: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
};

const RANK_STYLES: Record<number, string> = {
  1: "bg-yellow-400 text-yellow-900 shadow-[0_0_10px_rgba(250,204,21,0.5)]",
  2: "bg-slate-300 text-slate-800 shadow-[0_0_10px_rgba(203,213,225,0.5)]",
  3: "bg-amber-600 text-amber-50 shadow-[0_0_10px_rgba(217,119,6,0.5)]",
};

export default function InsightCard({ insight }: InsightCardProps) {
  const categoryColor =
    CATEGORY_COLORS[insight.category.toLowerCase()] ??
    "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";

  const rankStyle =
    RANK_STYLES[insight.rank] ?? "bg-muted text-muted-foreground";

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md border-l-4 border-l-primary/20 hover:border-l-primary">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {/* Rank Circle */}
          <div
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${rankStyle}`}
          >
            {insight.rank}
          </div>

          <div className="flex-1 space-y-3">
            {/* Header: Badge */}
            <div>
              <Badge
                variant="outline"
                className={`border-transparent ${categoryColor}`}
              >
                {insight.category.toUpperCase()}
              </Badge>
            </div>

            {/* Title — full wrapping, no truncation */}
            <h3 className="text-lg font-semibold leading-snug break-words">
              {insight.title}
            </h3>

            {/* Body — full text, no clamping */}
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              {insight.body}
            </p>

            {/* Supporting columns as code pills */}
            {insight.supporting_columns && insight.supporting_columns.length > 0 && (
              <div className="pt-2 flex flex-wrap gap-2 border-t border-border/50">
                {insight.supporting_columns.map((col) => (
                  <Badge
                    key={col}
                    variant="secondary"
                    className="text-xs font-mono border border-border/50"
                  >
                    {col}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
