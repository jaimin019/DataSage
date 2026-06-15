import { usePreferenceStore } from "@/store/preferenceStore";
import { PreferenceCard } from "./PreferenceCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Rocket, Search, BrainCircuit, ShieldAlert, TrendingUp, Zap, Target, BarChart2, Link2, AlertTriangle, Grid3x3, LineChart, Gauge, Clock, Microscope, CheckSquare, HelpCircle, Flag, Trash2 } from "lucide-react";

interface Props {
  onStartAnalysis: () => void;
}

type FocusArea =
  | "data_quality"
  | "distributions"
  | "correlations"
  | "anomalies"
  | "clustering"
  | "forecasting";

export function PreferenceForm({ onStartAnalysis }: Props) {
  const {
    currentStep,
    setStep,
    preferences,
    setGoal,
    setTargetColumn,
    setDepth,
    toggleFocusArea,
    setOutlierHandling,
    availableColumns,
    resetToDefaults,
  } = usePreferenceStore();

  const handleNext = () => setStep(currentStep + 1);
  const handleBack = () => setStep(currentStep - 1);
  const handleSkipToDefaults = () => {
    resetToDefaults();
    onStartAnalysis();
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-3">
            <div className="mb-4">
              <h3 className="text-lg font-semibold tracking-tight">What are you trying to accomplish?</h3>
              <p className="text-sm text-muted-foreground">DataSage will focus its analysis on your goal.</p>
            </div>
            <PreferenceCard icon={<Search className="w-4 h-4" />} label="Explore patterns" description="Find correlations, clusters, trends" selected={preferences.goal === "explore"} onClick={() => setGoal("explore")} />
            <PreferenceCard icon={<BrainCircuit className="w-4 h-4" />} label="Prepare for ML" description="Feature quality, missing data, types" selected={preferences.goal === "prepare_ml"} onClick={() => setGoal("prepare_ml")} />
            <PreferenceCard icon={<ShieldAlert className="w-4 h-4" />} label="Detect anomalies" description="Find outliers and data quality issues" selected={preferences.goal === "detect_anomalies"} onClick={() => setGoal("detect_anomalies")} />
            <PreferenceCard icon={<TrendingUp className="w-4 h-4" />} label="Forecast trends" description="Predict future values over time" selected={preferences.goal === "forecast"} onClick={() => setGoal("forecast")} />
            <PreferenceCard icon={<Zap className="w-4 h-4" />} label="Quick overview" description="Fast summary, skip deep analysis" selected={preferences.goal === "quick_overview"} onClick={() => setGoal("quick_overview")} />
          </div>
        );
      case 1:
        return (
          <div className="space-y-3">
            <div className="mb-4">
              <h3 className="text-lg font-semibold tracking-tight">Which column matters most?</h3>
              <p className="text-sm text-muted-foreground">Insights will prioritize this column. Skip if unsure.</p>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
              <PreferenceCard icon={<HelpCircle className="w-4 h-4" />} label="No preference" description="Analyze all columns equally" selected={preferences.target_column === null} onClick={() => setTargetColumn(null)} />
              {availableColumns.map((col) => (
                <PreferenceCard key={col} icon={<BarChart2 className="w-4 h-4" />} label={col} description={`Column: ${col}`} selected={preferences.target_column === col} onClick={() => setTargetColumn(col)} />
              ))}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-3">
            <div className="mb-4">
              <h3 className="text-lg font-semibold tracking-tight">How deep should the analysis go?</h3>
              <p className="text-sm text-muted-foreground">Actual time varies with dataset size.</p>
            </div>
            <PreferenceCard icon={<Zap className="w-4 h-4" />} label="Quick (~15-30 seconds)" description="Basic stats, 4 charts, top 3 insights" selected={preferences.depth === "quick"} onClick={() => setDepth("quick")} />
            <PreferenceCard icon={<Gauge className="w-4 h-4" />} label="Standard (~45-90 seconds)" description="Full pipeline, 10 charts, 5 insights" selected={preferences.depth === "standard"} onClick={() => setDepth("standard")} />
            <PreferenceCard icon={<Microscope className="w-4 h-4" />} label="Deep (2-3 minutes)" description="All analyses, 16 charts, 7 insights" selected={preferences.depth === "deep"} onClick={() => setDepth("deep")} />
          </div>
        );
      case 3:
        return (
          <div className="space-y-3">
            <div className="mb-4">
              <h3 className="text-lg font-semibold tracking-tight">What should DataSage focus on?</h3>
              <p className="text-sm text-muted-foreground">Select all that apply. Leave empty for balanced.</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: "data_quality", label: "Data quality", icon: <CheckSquare className="w-3.5 h-3.5" /> },
                { id: "distributions", label: "Distributions", icon: <BarChart2 className="w-3.5 h-3.5" /> },
                { id: "correlations", label: "Correlations", icon: <Link2 className="w-3.5 h-3.5" /> },
                { id: "anomalies", label: "Anomalies", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
                { id: "clustering", label: "Clustering", icon: <Grid3x3 className="w-3.5 h-3.5" /> },
                { id: "forecasting", label: "Forecasting", icon: <LineChart className="w-3.5 h-3.5" /> },
              ].map((area) => {
                const isSelected = preferences.focus_areas.includes(area.id as FocusArea);
                return (
                  <button
                    key={area.id}
                    onClick={() => toggleFocusArea(area.id as FocusArea)}
                    className={`p-3 rounded-lg border text-sm font-medium transition-all text-left flex items-center gap-2 ${
                      isSelected
                        ? "border-primary/60 bg-primary/[0.08] text-foreground"
                        : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground"
                    }`}
                  >
                    {area.icon}
                    {area.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-3">
            <div className="mb-4">
              <h3 className="text-lg font-semibold tracking-tight">How should outliers be handled?</h3>
              <p className="text-sm text-muted-foreground">Outliers may be errors or genuine extremes.</p>
            </div>
            <PreferenceCard icon={<Flag className="w-4 h-4" />} label="Flag only (recommended)" description="Outliers are marked but kept in data." selected={preferences.outlier_handling === "flag_only"} onClick={() => setOutlierHandling("flag_only")} />
            <PreferenceCard icon={<Trash2 className="w-4 h-4" />} label="Remove extreme outliers" description="Values beyond 3× IQR are removed." selected={preferences.outlier_handling === "remove_extreme"} onClick={() => setOutlierHandling("remove_extreme")} />
          </div>
        );
      case 5:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold tracking-tight">Your analysis settings</h3>
            <div className="bg-muted/60 p-4 rounded-xl space-y-2 text-sm border">
              {[
                ["Goal", preferences.goal.replace("_", " ")],
                ["Target", preferences.target_column || "None"],
                ["Depth", preferences.depth],
                ["Focus", preferences.focus_areas.length > 0 ? preferences.focus_areas.map((f) => f.replace("_", " ")).join(", ") : "Balanced"],
                ["Outliers", preferences.outlier_handling.replace("_", " ")],
              ].map(([k, v], i, arr) => (
                <div key={k} className={`flex justify-between ${i < arr.length - 1 ? "border-b border-border/60 pb-2" : ""}`}>
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-medium capitalize">{v}</span>
                </div>
              ))}
            </div>
            <div className="pt-2 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Change
              </Button>
              <Button className="flex-1" onClick={onStartAnalysis}>
                <Rocket className="h-4 w-4 mr-1" /> Start analysis
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <Card className="w-full max-w-xl mx-auto mt-4 border-border/80 shadow-lg">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-5">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {currentStep < 5 ? "Customize Your Analysis" : "Summary"}
          </span>
          <button onClick={handleSkipToDefaults} className="text-xs font-medium text-primary hover:underline">
            Skip → use defaults
          </button>
        </div>

        {currentStep < 5 && (
          <div className="flex gap-1.5 mb-6">
            {[0, 1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  step <= currentStep ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        )}

        {renderStepContent()}

        {currentStep < 5 && (
          <div className="flex justify-between items-center mt-8 pt-4 border-t border-border/60">
            <Button variant="ghost" onClick={handleBack} disabled={currentStep === 0}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button onClick={handleNext}>
              Continue <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
