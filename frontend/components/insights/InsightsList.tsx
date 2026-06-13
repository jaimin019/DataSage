"use client";

import { useEffect, useState } from "react";
import { getInsights } from "@/lib/api";
import { Insight } from "@/lib/types";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import InsightCard from "./InsightCard";

interface InsightsListProps {
  sessionId: string;
}

export default function InsightsList({ sessionId }: InsightsListProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInsights = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await getInsights(sessionId);
      
      // Sort insights strictly by rank
      const sorted = (response.insights || []).sort((a, b) => a.rank - b.rank);
      setInsights(sorted);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load insights";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInsights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto w-full">
        <div className="text-center mb-8">
          <h2 className="text-xl font-medium animate-pulse text-muted-foreground">
            Analysis is generating insights...
          </h2>
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[140px] w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="max-w-2xl mx-auto">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Could not load insights</AlertTitle>
        <AlertDescription className="mt-2 flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={loadInsights} className="bg-background">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center border rounded-xl bg-muted/20 max-w-4xl mx-auto w-full">
        <p className="text-lg font-medium text-muted-foreground">No insights discovered</p>
        <p className="text-sm text-muted-foreground mt-2">
          The dataset might be too simple to extract meaningful business insights.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Key Discoveries</h2>
        <p className="text-muted-foreground">AI-generated insights based on statistical patterns and anomalies.</p>
      </div>
      
      <div className="space-y-4">
        {insights.map((insight, idx) => (
          <InsightCard key={`insight-${insight.rank}-${idx}`} insight={insight} />
        ))}
      </div>
    </div>
  );
}
