import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, Lock, Settings2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSessionStatus } from "@/hooks/useSessionStatus";
import { useSessionStore } from "@/store/sessionStore";
import PipelineStatus from "@/components/dashboard/PipelineStatus";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DownloadPanel from "@/components/downloads/DownloadPanel";
import OverviewTab from "@/components/dashboard/OverviewTab";
import { ChartGallery } from "@/components/charts/ChartGallery";
import InsightsList from "@/components/insights/InsightsList";
import ForecastView from "@/components/forecast/ForecastView";
import ChatWindow from "@/components/chat/ChatWindow";

export const Route = createFileRoute("/_authenticated/dashboard/$sessionId")({
  head: () => ({ meta: [{ title: "Analysis · DataSage" }] }),
  component: DashboardPage,
});

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function DashboardPage() {
  const { sessionId } = useParams({ from: "/_authenticated/dashboard/$sessionId" });
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const TABS = ["overview", "charts", "insights", "forecast", "chat"];

  useSessionStatus(sessionId);
  const { status, datasetInfo, error, preferencesSummary } = useSessionStore();

  const isDone = status === "done";
  const isFailed = status === "failed";

  if (error?.includes("permission") || error?.includes("Forbidden") || error?.includes("403")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] gap-4 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-display font-semibold">Access denied</h2>
        <p className="text-muted-foreground">This analysis belongs to a different account.</p>
        <Button onClick={() => navigate({ to: "/history" })}>Go to my analyses</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-[1400px]">
      <PipelineStatus status={status} />

      {!isDone && !isFailed && (
        <div className="mt-12 space-y-8 max-w-4xl mx-auto">
          <div className="text-center">
            <h2 className="text-2xl font-display font-semibold animate-pulse">
              Analysis in progress…
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              DataSage is crunching your numbers. Usually 15-90 seconds.
            </p>
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
        <div className="mt-10 animate-fade-up">
          <div className="mb-4">
            <Link
              to="/history"
              className="text-xs text-muted-foreground inline-flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-3 w-3" /> My Analyses
            </Link>
          </div>

          <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-4xl font-display font-bold tracking-tight truncate">
                {datasetInfo?.filename ?? "Dashboard"}
              </h2>
              <div className="flex items-center gap-2 mt-2 flex-wrap text-sm text-muted-foreground">
                {datasetInfo ? (
                  <span>
                    {datasetInfo.row_count.toLocaleString()} rows · {datasetInfo.col_count} columns
                  </span>
                ) : (
                  <Skeleton className="h-4 w-32" />
                )}
                {datasetInfo?.file_size_bytes != null && (
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    {formatBytes(datasetInfo.file_size_bytes)}
                  </Badge>
                )}
                {preferencesSummary && (
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] inline-flex items-center gap-1">
                    <Settings2 className="w-3 h-3" />
                    {preferencesSummary}
                  </Badge>
                )}
              </div>
            </div>
            <DownloadPanel sessionId={sessionId} disabled={!isDone} />
          </div>

          <Tabs defaultValue="overview" onValueChange={(val) => setActiveTab(val)} className="w-full">
            <TabsList className="mb-8 w-full justify-start overflow-x-auto h-auto p-1 bg-muted/40 rounded-xl border">
              {TABS.map((t) => (
                <TabsTrigger
                  key={t}
                  value={t}
                  onClick={() => setActiveTab(t)}
                  className="relative rounded-lg px-6 py-2.5 text-sm font-medium capitalize"
                >
                  {activeTab === t && (
                    <motion.div
                      layoutId="activeTabPill"
                      className="absolute inset-0 bg-card rounded-lg shadow-sm"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                    />
                  )}
                  <span className="relative z-10">{t}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="mt-4 min-h-[500px]">
              <TabsContent value="overview" className="m-0">
                <motion.div key="overview" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: "easeOut" }}>
                  <OverviewTab sessionId={sessionId} />
                </motion.div>
              </TabsContent>
              <TabsContent value="charts" className="m-0">
                <motion.div key="charts" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: "easeOut" }}>
                  <div className="space-y-6 max-w-5xl mx-auto">
                    <div>
                      <h2 className="text-3xl font-display font-bold tracking-tight">
                        Visualization Gallery
                      </h2>
                      <p className="text-muted-foreground text-base mt-2">
                        Plotly charts generated from your analysis pipeline.
                      </p>
                    </div>
                    <ChartGallery sessionId={sessionId} />
                  </div>
                </motion.div>
              </TabsContent>
              <TabsContent value="insights" className="m-0">
                <div className="w-full flex flex-col items-center">
                  <motion.div
                    className="w-full max-w-4xl"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                  >
                    <InsightsList sessionId={sessionId} />
                  </motion.div>
                </div>
              </TabsContent>
              <TabsContent value="forecast" className="m-0">
                <div className="w-full flex flex-col items-center">
                  <motion.div
                    className="w-full max-w-5xl"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                  >
                    <ForecastView sessionId={sessionId} />
                  </motion.div>
                </div>
              </TabsContent>
              <TabsContent value="chat" className="m-0">
                <div className="w-full flex flex-col items-center">
                  <motion.div
                    className="w-full max-w-3xl"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                  >
                    <ChatWindow sessionId={sessionId} />
                  </motion.div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      )}
    </div>
  );
}
