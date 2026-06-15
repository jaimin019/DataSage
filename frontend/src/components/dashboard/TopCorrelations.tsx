import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface Correlation {
  col1: string;
  col2: string;
  correlation: number;
}

interface Props {
  correlations: Correlation[];
}

export default function TopCorrelations({ correlations }: Props) {
  if (!correlations || correlations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Correlations</CardTitle>
          <CardDescription>Strongest relationships between columns</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[160px] text-sm text-muted-foreground">
          No correlation data available
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Correlations</CardTitle>
        <CardDescription>Strongest linear relationships in your dataset</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {correlations.slice(0, 5).map((corr, idx) => {
            const isPositive = corr.correlation >= 0;
            const widthPct = Math.abs(corr.correlation) * 100;
            return (
              <div
                key={idx}
                className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 rounded-lg hover:bg-accent/40 transition-colors"
              >
                <div className="flex items-center gap-2 sm:w-[240px] min-w-0">
                  <code className="text-xs px-1.5 py-0.5 bg-muted rounded truncate max-w-[100px]">
                    {corr.col1}
                  </code>
                  <span className="text-muted-foreground text-xs">↔</span>
                  <code className="text-xs px-1.5 py-0.5 bg-muted rounded truncate max-w-[100px]">
                    {corr.col2}
                  </code>
                </div>
                <div className="flex-1 flex items-center gap-3">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden flex">
                    <div className="w-1/2 flex justify-end">
                      {!isPositive && (
                        <div
                          className="h-full bg-destructive rounded-l-full"
                          style={{ width: `${widthPct * 2}%` }}
                        />
                      )}
                    </div>
                    <div className="w-1/2 flex justify-start">
                      {isPositive && (
                        <div
                          className="h-full bg-primary rounded-r-full"
                          style={{ width: `${widthPct * 2}%` }}
                        />
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-mono w-12 text-right tabular-nums">
                    {corr.correlation.toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
