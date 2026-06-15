"use client";

import { useEffect, useState } from "react";
import { getForecast } from "@/lib/api";
import { ForecastResponse } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, TrendingUp, TrendingDown, Minus, Download, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import ForecastChart from "../charts/ForecastChart";

interface ForecastViewProps {
  sessionId: string;
}

interface EmptyStateInfo {
  title: string;
  body: string;
  icon: string;
}

function getEmptyStateMessage(skipReason: string): EmptyStateInfo {
  if (skipReason.includes("year")) {
    return {
      title: "Yearly Forecast Not Available",
      body: `${skipReason}. For forecasting, try a dataset with sales/revenue data spanning 5+ years.`,
      icon: "📅",
    };
  }
  if (skipReason.includes("datetime") || skipReason.includes("date")) {
    return {
      title: "No Date Column Found",
      body: "Add a date/time column (e.g., 'date', 'month', 'timestamp') to enable trend forecasting.",
      icon: "📆",
    };
  }
  return {
    title: "Forecasting Not Available",
    body: skipReason || "This dataset doesn't have the right structure for time-series forecasting.",
    icon: "📈",
  };
}

export default function ForecastView({ sessionId }: ForecastViewProps) {
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadForecast() {
      try {
        setIsLoading(true);
        const data = await getForecast(sessionId);
        if (mounted) {
          setForecast(data);
          setError(null);
        }
      } catch (err: unknown) {
        if (mounted) {
          const message = err instanceof Error ? err.message : "Failed to load forecast data";
          setError(message);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadForecast();

    return () => {
      mounted = false;
    };
  }, [sessionId]);

  const downloadCSV = () => {
    if (!forecast || !forecast.forecast_data) return;
    
    const headers = ["Date", "Forecast", "Lower Bound", "Upper Bound"];
    const csvContent = [
      headers.join(","),
      ...forecast.forecast_data.map(row => 
        `${row.ds},${row.yhat},${row.yhat_lower},${row.yhat_upper}`
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `forecast_${sessionId.substring(0, 8)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
        <Skeleton className="h-[450px] w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="max-w-2xl mx-auto">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error loading forecast</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!forecast || forecast.skipped) {
    const emptyState = getEmptyStateMessage(forecast?.skip_reason || "");
    return (
      <Card className="max-w-2xl mx-auto bg-muted/20 border-dashed">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <span className="text-5xl mb-4">{emptyState.icon}</span>
          <h3 className="text-xl font-semibold mb-2">{emptyState.title}</h3>
          <p className="text-muted-foreground max-w-md">{emptyState.body}</p>
        </CardContent>
      </Card>
    );
  }

  const renderTrendIcon = () => {
    if (forecast.trend_direction === "up") return <TrendingUp className="h-5 w-5 text-green-500" />;
    if (forecast.trend_direction === "down") return <TrendingDown className="h-5 w-5 text-red-500" />;
    return <Minus className="h-5 w-5 text-gray-500" />;
  };

  const trendColor =
    forecast.trend_direction === "up"
      ? "text-green-600"
      : forecast.trend_direction === "down"
      ? "text-red-600"
      : "text-gray-600";

  const periodLabel = forecast.is_yearly ? "years" : "periods";

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Predictive Forecast</h2>
          <p className="text-muted-foreground">
            Forecast for <span className="font-semibold text-foreground">{forecast.target_col}</span> over{" "}
            <span className="font-semibold text-foreground">{forecast.date_col}</span>
          </p>
        </div>
        {forecast.forecast_data && forecast.forecast_data.length > 0 && (
          <Button variant="outline" onClick={downloadCSV}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Trend Summary Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Trend Direction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {renderTrendIcon()}
              <span className="text-2xl font-bold capitalize">{forecast.trend_direction || "Unknown"}</span>
            </div>
            {forecast.trend_pct_change != null && (
              <p className={`text-sm font-medium mt-1 ${trendColor}`}>
                {forecast.trend_direction === "up" ? "↑" : forecast.trend_direction === "down" ? "↓" : "→"}{" "}
                {Math.abs(forecast.trend_pct_change).toFixed(1)}% over next {periodLabel}
              </p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expected Change</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {forecast.trend_pct_change ? `${forecast.trend_pct_change > 0 ? "+" : ""}${forecast.trend_pct_change.toFixed(1)}%` : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">over forecast period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Model Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {forecast.metrics?.mape ? `${(forecast.metrics.mape * 100).toFixed(1)}% Error` : 
               forecast.metrics?.mae ? `MAE: ${forecast.metrics.mae.toFixed(2)}` : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">based on historical fit</p>
          </CardContent>
        </Card>
      </div>

      <Card className="p-6">
        <ForecastChart 
          historical={forecast.historical_data || []} 
          forecast={forecast.forecast_data || []} 
          targetCol={forecast.target_col || "Target"} 
          isYearly={forecast.is_yearly}
        />
      </Card>

      {forecast.llm_interpretation && (
        <Alert className="bg-primary/5 border-primary/20">
          <Info className="h-4 w-4 text-primary" />
          <AlertTitle className="text-primary font-semibold">AI Interpretation</AlertTitle>
          <AlertDescription className="mt-2 text-sm leading-relaxed">
            {forecast.llm_interpretation}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
