"use client";

import { useEffect, useState } from "react";
import { getAnalysis } from "@/lib/api";
import { AnalysisSummary } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import StatsCards from "./StatsCards";
import TopCorrelations from "./TopCorrelations";

interface OverviewTabProps {
  sessionId: string;
}

export default function OverviewTab({ sessionId }: OverviewTabProps) {
  const [analysis, setAnalysis] = useState<AnalysisSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setIsLoading(true);
        const data = await getAnalysis(sessionId);
        if (mounted) {
          setAnalysis(data);
          setError(null);
        }
      } catch (err: unknown) {
        if (mounted) {
          const message = err instanceof Error ? err.message : "Failed to load overview";
          setError(message);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, [sessionId]);

  if (isLoading) {
    return (
      <div className="space-y-6 w-full">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-[400px] w-full rounded-xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-[400px] w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <Alert variant="destructive" className="max-w-2xl mx-auto">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Overview Error</AlertTitle>
        <AlertDescription>{error || "Analysis data is missing."}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-8 w-full animate-in fade-in duration-500">
      <StatsCards analysis={analysis} />
      
      <div className="max-w-2xl">
        <TopCorrelations correlations={analysis.top_correlations} />
      </div>
    </div>
  );
}
