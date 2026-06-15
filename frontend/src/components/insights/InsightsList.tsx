import { useEffect, useState } from "react";
import { getInsights } from "@/lib/api";
import type { Insight } from "@/lib/types";
import { AlertCircle, RefreshCw, TrendingUp } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import InsightCard from "./InsightCard";
import { motion } from "framer-motion";

interface Props {
  sessionId: string;
}

export default function InsightsList({ sessionId }: Props) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInsights = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await getInsights(sessionId);
      setInsights((response.insights || []).sort((a, b) => a.rank - b.rank));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load insights");
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
      <div className="space-y-4 w-full">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[140px] w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="max-w-2xl">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Could not load insights</AlertTitle>
        <AlertDescription className="mt-2 flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={loadInsights}>
            <RefreshCw className="mr-2 h-4 w-4" /> Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center border rounded-xl bg-muted/20 w-full">
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4"
        >
          <TrendingUp className="w-7 h-7 text-muted-foreground" />
        </motion.div>
        <p className="text-lg font-medium text-muted-foreground">No insights discovered</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <h2 className="text-3xl font-display font-bold tracking-tight">Key Discoveries</h2>
        <p className="text-muted-foreground text-base mt-1">AI-generated insights based on statistical patterns in your data.</p>
      </motion.div>
      <motion.div
        className="space-y-5"
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.08 } },
        }}
      >
        {insights.map((insight, idx) => (
          <motion.div
            key={`insight-${insight.rank}-${idx}`}
            variants={{
              hidden: { opacity: 0, x: -20 },
              show:   { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } },
            }}
          >
            <InsightCard insight={insight} />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
