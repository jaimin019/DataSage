import type { AnalysisSummary } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, Columns, AlertTriangle, Network } from "lucide-react";

interface Props {
  analysis: AnalysisSummary | null;
}

export default function StatsCards({ analysis }: Props) {
  if (!analysis) return null;

  const stats = [
    {
      label: "Total Rows",
      value: analysis.row_count,
      isNumeric: true,
      hint: "observations in dataset",
      icon: Table,
    },
    {
      label: "Total Columns",
      value: analysis.col_count,
      isNumeric: true,
      hint: "features extracted",
      icon: Columns,
    },
    {
      label: "Anomalies Detected",
      value: analysis.anomaly_count,
      isNumeric: true,
      hint: `${analysis.anomaly_pct.toFixed(1)}% of total rows`,
      hintColor:
        analysis.anomaly_pct > 5
          ? "text-destructive"
          : analysis.anomaly_pct > 2
          ? "text-warning"
          : "text-success",
      icon: AlertTriangle,
    },
    {
      label: "Clusters Found",
      value: analysis.cluster_count > 0 ? analysis.cluster_count : "N/A",
      isNumeric: analysis.cluster_count > 0,
      hint:
        analysis.cluster_count > 0
          ? "distinct groups identified"
          : "clustering skipped",
      icon: Network,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <Card key={s.label} className="relative overflow-hidden group hover:border-primary/40 transition-colors">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {s.label}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-display font-bold tracking-tight">
                {s.isNumeric ? (
                  Number(s.value).toLocaleString()
                ) : (
                  s.value
                )}
              </div>
              <p className={`text-xs mt-1 ${s.hintColor ?? "text-muted-foreground"}`}>
                {s.hint}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
