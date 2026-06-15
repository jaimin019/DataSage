import { useEffect, useState } from "react";
import { getForecast } from "@/lib/api";
import type { ForecastResponse } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
  Info,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import ForecastChart from "../charts/ForecastChart";
import { motion } from "framer-motion";

interface Props {
  sessionId: string;
}

function emptyMessage(reason: string) {
  if (reason.includes("year"))
    return { title: "Yearly forecast not available", body: `${reason}. Try 5+ years of data.` };
  if (reason.includes("datetime") || reason.includes("date"))
    return { title: "No date column found", body: "Add a date/time column to enable forecasting." };
  return { title: "Forecasting not available", body: reason || "Dataset doesn't have time-series structure." };
}

export default function ForecastView({ sessionId }: Props) {
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setIsLoading(true);
        const data = await getForecast(sessionId);
        if (mounted) {
          setForecast(data);
          setError(null);
        }
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : "Failed to load forecast");
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [sessionId]);

  const downloadCSV = () => {
    if (!forecast?.forecast_data) return;
    const headers = ["Date", "Forecast", "Lower Bound", "Upper Bound"];
    const csv = [
      headers.join(","),
      ...forecast.forecast_data.map(
        (r) => `${r.ds},${r.yhat},${r.yhat_lower},${r.yhat_upper}`,
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `forecast_${sessionId.substring(0, 8)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[450px] w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="w-full">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error loading forecast</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!forecast || forecast.skipped) {
    const e = emptyMessage(forecast?.skip_reason || "");
    return (
      <Card className="w-full border-dashed">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4"
          >
            <TrendingUp className="w-7 h-7 text-muted-foreground" />
          </motion.div>
          <h3 className="text-xl font-semibold mb-2">{e.title}</h3>
          <p className="text-muted-foreground max-w-md">{e.body}</p>
        </CardContent>
      </Card>
    );
  }

  const TrendIcon =
    forecast.trend_direction === "up"
      ? TrendingUp
      : forecast.trend_direction === "down"
      ? TrendingDown
      : Minus;
  const trendColor =
    forecast.trend_direction === "up"
      ? "text-success"
      : forecast.trend_direction === "down"
      ? "text-destructive"
      : "text-muted-foreground";
  const periodLabel = forecast.is_yearly ? "years" : "periods";

  return (
    <motion.div
      className="space-y-6 w-full"
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.1 } },
      }}
    >
      <motion.div
        variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div>
          <h2 className="text-3xl font-display font-bold tracking-tight">Predictive Forecast</h2>
          <p className="text-muted-foreground text-base mt-1">
            <span className="font-semibold text-foreground">{forecast.target_col}</span> over{" "}
            <span className="font-semibold text-foreground">{forecast.date_col}</span>
          </p>
        </div>
        {forecast.forecast_data?.length ? (
          <Button
            variant="outline"
            onClick={downloadCSV}
            className="transition-all duration-200 hover:scale-[1.02] hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98]"
          >
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        ) : null}
      </motion.div>

      <motion.div
        variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <Card>
          <CardHeader className="pb-3 pt-5 px-6">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className={`flex items-center gap-2 ${trendColor}`}>
              <TrendIcon className="h-5 w-5" />
              <span className="text-3xl font-display font-bold capitalize">
                {forecast.trend_direction || "Unknown"}
              </span>
            </div>
            {forecast.trend_pct_change != null && (
              <p className="text-xs text-muted-foreground mt-1">
                {Math.abs(forecast.trend_pct_change).toFixed(1)}% over next {periodLabel}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 pt-5 px-6">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Expected Change
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="text-3xl font-display font-bold">
              {forecast.trend_pct_change
                ? `${forecast.trend_pct_change > 0 ? "+" : ""}${forecast.trend_pct_change.toFixed(1)}%`
                : "N/A"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 pt-5 px-6">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Model Accuracy
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="text-3xl font-display font-bold">
              {forecast.metrics?.mape
                ? `${(forecast.metrics.mape * 100).toFixed(1)}% err`
                : forecast.metrics?.mae
                ? `MAE ${forecast.metrics.mae.toFixed(2)}`
                : "N/A"}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } }}
      >
        <Card className="p-8">
          <ForecastChart
            historical={forecast.historical_data || []}
            forecast={forecast.forecast_data || []}
            targetCol={forecast.target_col || "Target"}
            isYearly={forecast.is_yearly}
          />
        </Card>
      </motion.div>

      {forecast.llm_interpretation && (
        <motion.div
          variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } }}
        >
          <Alert className="bg-primary/5 border-primary/20 p-6">
            <Info className="h-5 w-5 text-primary" />
            <AlertTitle className="text-primary font-semibold text-base ml-1">AI Interpretation</AlertTitle>
            <AlertDescription className="mt-3 text-base leading-relaxed ml-1">
              {forecast.llm_interpretation}
            </AlertDescription>
          </Alert>
        </motion.div>
      )}
    </motion.div>
  );
}
