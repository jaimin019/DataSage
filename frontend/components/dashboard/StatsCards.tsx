import { AnalysisSummary } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, Columns, AlertTriangle, Network } from "lucide-react";

interface StatsCardsProps {
  analysis: AnalysisSummary | null;
}

export default function StatsCards({ analysis }: StatsCardsProps) {
  if (!analysis) return null;

  const getAnomalyColor = (pct: number) => {
    if (pct > 5) return "text-red-500";
    if (pct > 2) return "text-yellow-500";
    return "text-green-500";
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Rows</CardTitle>
          <Table className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{analysis.row_count.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1">
            observations in dataset
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Columns</CardTitle>
          <Columns className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{analysis.col_count.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1">
            features extracted
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Anomalies Detected</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {analysis.anomaly_count.toLocaleString()}
          </div>
          <p className={`text-xs mt-1 font-medium ${getAnomalyColor(analysis.anomaly_pct)}`}>
            {analysis.anomaly_pct.toFixed(1)}% of total rows
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Clusters Found</CardTitle>
          <Network className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {analysis.cluster_count > 0 ? analysis.cluster_count : "N/A"}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {analysis.cluster_count > 0 ? "distinct groups identified" : "clustering skipped"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
