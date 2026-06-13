"use client";

import { useParams, useRouter } from "next/navigation";
import { useSessionStatus } from "@/hooks/useSessionStatus";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useSessionStore } from "@/store/sessionStore";
import PipelineStatus from "@/components/dashboard/PipelineStatus";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DownloadPanel from "@/components/downloads/DownloadPanel";

// Tab contents
import OverviewTab from "@/components/dashboard/OverviewTab";
import { ChartGallery } from "@/components/charts/ChartGallery";
import InsightsList from "@/components/insights/InsightsList";
import ForecastView from "@/components/forecast/ForecastView";
import ChatWindow from "@/components/chat/ChatWindow";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getStatusBadgeStyle(status: string | null): string {
  switch (status) {
    case "done":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 border-green-200 dark:border-green-800";
    case "failed":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 border-red-200 dark:border-red-800";
    case "pending":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800";
    default:
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800";
  }
}

export default function DashboardPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const router = useRouter();
  
  useSessionStatus(sessionId);
  const { status, datasetInfo, error, preferencesSummary } = useSessionStore();

  const isDone = status === "done";
  const isFailed = status === "failed";

  if (error?.includes('permission') || error?.includes('Forbidden') || error?.includes('403')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <span className="text-5xl">🔒</span>
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="text-muted-foreground">
          This analysis belongs to a different account.
        </p>
        <Button onClick={() => router.push('/history')} className="mt-2">
          Go to My Analyses
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-[1400px]">
      <PipelineStatus status={status} />
      
      {!isDone && !isFailed && (
        <div className="mt-12 space-y-8 max-w-4xl mx-auto">
          <div className="text-center">
            <h2 className="text-2xl font-bold animate-pulse text-foreground">Analysis in progress...</h2>
            <p className="text-muted-foreground mt-2">DataSage is crunching your numbers. This usually takes 15-30 seconds.</p>
          </div>
          <div className="grid gap-6">
            <Skeleton className="h-[120px] w-full rounded-xl" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-[300px] w-full rounded-xl" />
              <Skeleton className="h-[300px] w-full rounded-xl" />
            </div>
          </div>
        </div>
      )}

      {isDone && (
        <div className="mt-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="mb-4">
            <Link
              href="/history"
              className="text-sm text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors w-fit"
            >
              <ChevronLeft className="h-4 w-4" /> My Analyses
            </Link>
          </div>
          {/* Dashboard Header */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                {datasetInfo?.filename ?? "Dashboard"}
              </h2>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                {datasetInfo ? (
                  <p className="text-muted-foreground">
                    {datasetInfo.row_count.toLocaleString()} rows · {datasetInfo.col_count} columns
                  </p>
                ) : (
                  <Skeleton className="h-4 w-32" />
                )}
                {datasetInfo?.file_size_bytes != null && (
                  <Badge variant="secondary" className="text-xs font-mono">
                    {formatBytes(datasetInfo.file_size_bytes)}
                  </Badge>
                )}
                {status && (
                  <Badge variant="outline" className={`text-xs ${getStatusBadgeStyle(status)}`}>
                    {status.toUpperCase()}
                  </Badge>
                )}
                {preferencesSummary && (
                  <Badge variant="outline" className="text-xs bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800">
                    🎯 {preferencesSummary}
                  </Badge>
                )}
              </div>
            </div>
            {/* Download dropdown panel in header — compact version */}
            <div className="flex-shrink-0">
              <DownloadPanel sessionId={sessionId} disabled={!isDone} />
            </div>
          </div>
          
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="mb-8 w-full justify-start overflow-x-auto h-auto p-1.5 bg-muted/40 rounded-xl border">
              <TabsTrigger value="overview" className="rounded-lg px-6 py-2.5 data-[state=active]:shadow-sm">Overview</TabsTrigger>
              <TabsTrigger value="charts" className="rounded-lg px-6 py-2.5 data-[state=active]:shadow-sm">Charts</TabsTrigger>
              <TabsTrigger value="insights" className="rounded-lg px-6 py-2.5 data-[state=active]:shadow-sm">Insights</TabsTrigger>
              <TabsTrigger value="forecast" className="rounded-lg px-6 py-2.5 data-[state=active]:shadow-sm">Forecast</TabsTrigger>
              <TabsTrigger value="chat" className="rounded-lg px-6 py-2.5 data-[state=active]:shadow-sm">Chat</TabsTrigger>
            </TabsList>
            
            <div className="mt-4 min-h-[500px]">
              <TabsContent value="overview" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                <OverviewTab sessionId={sessionId} />
              </TabsContent>
              
              <TabsContent value="charts" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">Visualization Gallery</h2>
                    <p className="text-muted-foreground">Plotly charts generated from your data analysis pipeline.</p>
                  </div>
                  <ChartGallery sessionId={sessionId} />
                </div>
              </TabsContent>
              
              <TabsContent value="insights" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                <InsightsList sessionId={sessionId} />
              </TabsContent>
              
              <TabsContent value="forecast" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                <ForecastView sessionId={sessionId} />
              </TabsContent>
              
              <TabsContent value="chat" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                <ChatWindow sessionId={sessionId} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      )}
    </div>
  );
}
