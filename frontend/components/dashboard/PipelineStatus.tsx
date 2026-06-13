import { PipelineStatus as TPipelineStatus } from "@/lib/types";
import { CheckCircle2, XCircle, Loader2, Database, BarChart2, Lightbulb, TrendingUp, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

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

import { useSessionStore } from "@/store/sessionStore";

export default function PipelineStatus({ status }: Props) {
  const { error, statusDetail } = useSessionStore();
  
  if (!status) return null;

  const currentStepIndex = STEPS.findIndex((s) => s.id === status);
  const isDone = status === "done";
  const isFailed = status === "failed";

  return (
    <Card className="w-full mb-8 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between w-full relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-1000 ease-in-out"
              style={{ width: isDone ? '100%' : `${Math.max(0, currentStepIndex * 25)}%` }}
            />
          </div>
          
          {STEPS.map((step, idx) => {
            const isCompleted = isDone || currentStepIndex > idx;
            const isActive = currentStepIndex === idx;
            const Icon = step.icon;
            
            return (
              <div key={step.id} className="relative flex flex-col items-center z-10">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 shadow-md ${
                  isCompleted ? "bg-primary text-primary-foreground scale-110" :
                  isActive && !isFailed ? "bg-primary text-primary-foreground animate-pulse scale-110" :
                  isFailed && isActive ? "bg-destructive text-destructive-foreground scale-110" :
                  "bg-muted text-muted-foreground border-2 border-background"
                }`}>
                  {isCompleted ? <CheckCircle2 className="w-6 h-6" /> :
                   isFailed && isActive ? <XCircle className="w-6 h-6" /> :
                   isActive ? <Loader2 className="w-6 h-6 animate-spin" /> :
                   <Icon className="w-5 h-5" />}
                </div>
                <span className={`mt-3 text-sm font-medium transition-colors duration-300 ${
                  isCompleted || isActive ? "text-foreground" : "text-muted-foreground"
                }`}>
                  {step.label}
                </span>
                {isActive && statusDetail && !isFailed && (
                  <span className="absolute -bottom-6 text-xs text-muted-foreground whitespace-nowrap animate-in fade-in slide-in-from-top-1">
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
                Pipeline failed during {STEPS[currentStepIndex]?.label || "processing"}.
              </span>
              {error && <span className="text-sm font-normal opacity-90">{error}</span>}
              <span className="text-sm mt-1">Please try again.</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
