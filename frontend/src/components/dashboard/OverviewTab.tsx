import { useEffect, useState } from "react";
import { getAnalysis } from "@/lib/api";
import type { AnalysisSummary } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import StatsCards from "./StatsCards";
import TopCorrelations from "./TopCorrelations";

interface Props {
  sessionId: string;
}

export default function OverviewTab({ sessionId }: Props) {
  const [analysis, setAnalysis] = useState<AnalysisSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setIsLoading(true);
        const data = await getAnalysis(sessionId);
        if (mounted) {
          setAnalysis(data);
          setError(null);
        }
      } catch (err) {
        if (mounted)
          setError(err instanceof Error ? err.message : "Failed to load overview");
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [sessionId]);

  if (isLoading) {
    return (
      <div className="space-y-6 w-full">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[300px] w-full max-w-2xl rounded-xl" />
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <Alert variant="destructive" className="max-w-2xl">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Overview error</AlertTitle>
        <AlertDescription>{error || "Analysis data is missing."}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-8 w-full max-w-5xl mx-auto animate-fade-up">
      <StatsCards analysis={analysis} />
      <TopCorrelations correlations={analysis.top_correlations} />
    </div>
  );
}
