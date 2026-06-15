import {
  CheckCircle2,
  XCircle,
  Loader2,
  Database,
  BarChart2,
  Lightbulb,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useSessionStore } from "@/store/sessionStore";
import type { PipelineStatus as TPipelineStatus } from "@/lib/types";

interface Props {
  status: TPipelineStatus | null;
}

const STEPS = [
  { id: "cleaning", label: "Cleaning", icon: Database },
  { id: "eda", label: "EDA", icon: BarChart2 },
  { id: "viz", label: "Visualizations", icon: Sparkles },
  { id: "insights", label: "Insights", icon: Lightbulb },
  { id: "forecast", label: "Forecast", icon: TrendingUp },
];

export default function PipelineStatus({ status }: Props) {
  const { error, statusDetail } = useSessionStore();
  if (!status) return null;

  const currentStepIndex = STEPS.findIndex((s) => s.id === status);
  const isDone = status === "done";
  const isFailed = status === "failed";

  return (
    <Card className="w-full mb-8 border-border/60">
      <CardContent className="p-6">
        <div className="flex items-center justify-between w-full relative">
          <div className="absolute left-0 top-6 w-full h-0.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary-glow transition-all duration-1000 ease-in-out"
              style={{
                width: isDone
                  ? "100%"
                  : `${Math.max(0, currentStepIndex * 25)}%`,
              }}
            />
          </div>

          {STEPS.map((step, idx) => {
            const isCompleted = isDone || currentStepIndex > idx;
            const isActive = currentStepIndex === idx;
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className="relative flex flex-col items-center z-10"
              >
                <div className="relative">
                  {isActive && !isFailed && (
                    <div className="absolute -inset-1.5 rounded-full bg-primary/20 animate-pulse-ring" />
                  )}
                  <div
                    className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 z-10 ${
                      isCompleted
                        ? "bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-md"
                        : isActive && !isFailed
                        ? "bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-sm"
                        : isFailed && isActive
                        ? "bg-destructive text-destructive-foreground shadow-md"
                        : "bg-card border-2 border-border text-muted-foreground"
                    }`}
                  >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : isFailed && isActive ? (
                    <XCircle className="w-5 h-5" />
                  ) : isActive ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                </div>
                <span
                  className={`mt-3 text-xs font-medium ${
                    isCompleted || isActive
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </span>
                {isActive && statusDetail && !isFailed && (
                  <span className="absolute -bottom-5 text-[10px] text-muted-foreground whitespace-nowrap">
                    {statusDetail}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {isFailed && (
          <div className="mt-6 text-center text-destructive bg-destructive/10 p-4 rounded-lg border border-destructive/20">
            <p className="font-medium flex flex-col items-center justify-center gap-2">
              <span className="flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                Pipeline failed during{" "}
                {STEPS[currentStepIndex]?.label || "processing"}.
              </span>
              {error && (
                <span className="text-sm font-normal opacity-90">{error}</span>
              )}
              <span className="text-sm mt-1">Please try again.</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
