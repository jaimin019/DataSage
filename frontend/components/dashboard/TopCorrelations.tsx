import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface Correlation {
  col1: string;
  col2: string;
  correlation: number;
}

interface TopCorrelationsProps {
  correlations: Correlation[];
}

export default function TopCorrelations({ correlations }: TopCorrelationsProps) {
  if (!correlations || correlations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Correlations</CardTitle>
          <CardDescription>Strongest relationships between columns</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px] text-sm text-muted-foreground border-t border-dashed">
          No correlation data available
        </CardContent>
      </Card>
    );
  }

  // Helper to render the correlation bar
  const renderCorrelationBar = (value: number) => {
    const isPositive = value >= 0;
    const width = `${Math.abs(value) * 100}%`;
    const color = isPositive ? "bg-blue-500" : "bg-red-500";
    
    return (
      <div className="flex items-center gap-3 w-full">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden flex">
          {/* If positive, bar grows from middle to right. If negative, from middle to left */}
          <div className="w-1/2 flex justify-end">
            {!isPositive && <div className={`h-full ${color}`} style={{ width: `${Math.abs(value) * 200}%` }} />}
          </div>
          <div className="w-1/2 flex justify-start">
            {isPositive && <div className={`h-full ${color}`} style={{ width: `${Math.abs(value) * 200}%` }} />}
          </div>
        </div>
        <span className="text-xs font-mono w-12 text-right">{value.toFixed(2)}</span>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Correlations</CardTitle>
        <CardDescription>Strongest linear relationships in your dataset</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {correlations.slice(0, 5).map((corr, idx) => (
            <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2 flex-shrink-0 sm:w-[250px] overflow-hidden">
                <code className="text-xs px-1.5 py-0.5 bg-muted rounded truncate max-w-[100px]">{corr.col1}</code>
                <span className="text-muted-foreground text-xs">↔</span>
                <code className="text-xs px-1.5 py-0.5 bg-muted rounded truncate max-w-[100px]">{corr.col2}</code>
              </div>
              <div className="flex-1 min-w-[150px]">
                {renderCorrelationBar(corr.correlation)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
