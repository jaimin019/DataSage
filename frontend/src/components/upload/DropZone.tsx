import { useState, useRef, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import Papa from "papaparse";
import { Loader2, UploadCloud, FileText, X } from "lucide-react";
import { toast } from "sonner";
import { uploadCSV } from "@/lib/api";
import { useSessionStore } from "@/store/sessionStore";
import { usePreferenceStore } from "@/store/preferenceStore";
import { useAuthStore } from "@/store/authStore";
import { Card, CardContent } from "@/components/ui/card";
import { PreferenceForm } from "./PreferenceForm";

export default function DropZone() {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const { setUploading, isUploading, setError, error, setSession, reset, sessionId } =
    useSessionStore();
  const { showForm, isFormVisible } = usePreferenceStore();

  useEffect(() => {
    // Clear local file state when session store is reset (user navigates home)
    if (!isUploading && !sessionId) {
      setFile(null);
      // Also hide the preference form
      usePreferenceStore.getState().hideForm();
    }
  }, [isUploading, sessionId]);

  const handleFileSelected = async (selectedFile: File) => {
    if (!user) {
      toast.error("Please sign in to upload a CSV");
      navigate({ to: "/auth" });
      return;
    }
    setFile(selectedFile);
    setError("");
    const preview = await parseCSVPreview(selectedFile);
    showForm(preview.columns);
  };

  const handleClearFile = (e: React.MouseEvent) => {
    e.stopPropagation();       // prevent the click from opening file picker
    setFile(null);
    setError("");
    usePreferenceStore.getState().hideForm();
    usePreferenceStore.getState().resetToDefaults();
    // Reset the file input so the same file can be re-selected if needed
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const parseCSVPreview = (f: File): Promise<{ columns: string[] }> =>
    new Promise((resolve) => {
      Papa.parse(f, {
        preview: 5,
        header: true,
        complete: (results) =>
          resolve({ columns: (results.meta.fields as string[]) ?? [] }),
        error: () => resolve({ columns: [] }),
      });
    });

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (!dropped) return;
    if (dropped.name.endsWith(".csv")) handleFileSelected(dropped);
    else setError("Only CSV files are accepted.");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.name.endsWith(".csv")) handleFileSelected(selected);
    else setError("Only CSV files are accepted.");
  };

  const handleAnalyze = async () => {
    if (!file) return;
    const preferences = usePreferenceStore.getState().toJSON();

    reset();
    setUploading(true);
    setError("");

    try {
      const response = await uploadCSV(file, preferences);
      setSession(response.session_id, response.dataset_info);
      navigate({
        to: "/dashboard/$sessionId",
        params: { sessionId: response.session_id },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      if (
        message.includes("429") ||
        message.toLowerCase().includes("limit") ||
        message.toLowerCase().includes("50 analyses")
      ) {
        toast.error("You've reached your 50-analysis limit.");
      } else {
        setError(message);
      }
      setUploading(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <Card className="w-full max-w-xl glass border-border/80 shadow-xl relative z-10">
        <CardContent className="p-5">
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`relative overflow-hidden border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
              dragOver
                ? "border-primary bg-primary/[0.08]"
                : "border-border hover:border-primary/50 hover:bg-accent/30"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".csv"
              onChange={handleFileChange}
            />
            {file ? (
              <>
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <p className="font-semibold text-foreground text-sm truncate max-w-[240px]">
                  {file.name}
                </p>
                <p className="text-xs text-muted-foreground mt-1 font-mono">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                {/* Clear button — appears below file info */}
                <button
                  onClick={handleClearFile}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground
                             hover:text-destructive transition-colors px-2 py-1 rounded-md
                             hover:bg-destructive/10 border border-transparent hover:border-destructive/20"
                >
                  <X className="h-3 w-3" />
                  Remove file
                </button>
              </>
            ) : (
              <>
                <div
                  className={`h-12 w-12 rounded-xl flex items-center justify-center mb-3 transition-colors ${
                    dragOver
                      ? "bg-primary text-primary-foreground animate-pulse-ring"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  <UploadCloud className="h-6 w-6" />
                </div>
                <p className="font-semibold text-foreground text-base">
                  Drop your CSV here
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  or click to browse files
                </p>
                <p className="text-xs text-muted-foreground/70 mt-3 font-mono">
                  Up to 50&nbsp;MB · UTF-8
                </p>
              </>
            )}
          </div>

          {error && (
            <p className="text-destructive text-sm mt-4 text-center">{error}</p>
          )}
          {isUploading && (
            <div className="mt-4 flex items-center justify-center text-muted-foreground text-sm">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing data…
            </div>
          )}
        </CardContent>
      </Card>

      <div
        className={`w-full max-w-xl transition-all duration-500 ease-out ${
          isFormVisible
            ? "max-h-[1200px] opacity-100"
            : "max-h-0 opacity-0 overflow-hidden"
        }`}
      >
        <PreferenceForm onStartAnalysis={handleAnalyze} />
      </div>
    </div>
  );
}
