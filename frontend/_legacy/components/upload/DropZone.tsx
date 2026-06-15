"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { uploadCSV } from "@/lib/api";
import { useSessionStore } from "@/store/sessionStore";
import { usePreferenceStore } from "@/store/preferenceStore";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, UploadCloud } from "lucide-react";
import Papa from "papaparse";
import { PreferenceForm } from "./PreferenceForm";
import { toast } from "sonner";

export default function DropZone() {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  
  const { setUploading, isUploading, setError, error, setSession, reset } = useSessionStore();
  const { showForm, isFormVisible } = usePreferenceStore();

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleFileSelected = async (selectedFile: File) => {
    setFile(selectedFile);
    setError("");
    
    // Parse first 5 rows to get column names for preference form
    const preview = await parseCSVPreview(selectedFile);
    
    // Show preference form with column names
    showForm(preview.columns);
  };

  const parseCSVPreview = async (file: File): Promise<{ columns: string[] }> => {
    return new Promise((resolve) => {
      Papa.parse(file, {
        preview: 5,
        header: true,
        complete: (results) => {
          const columns = results.meta.fields ?? [];
          resolve({ columns });
        },
        error: () => {
          resolve({ columns: [] });
        }
      });
    });
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith(".csv")) {
        handleFileSelected(droppedFile);
      } else {
        setError("Only CSV files are accepted.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.name.endsWith(".csv")) {
        handleFileSelected(selectedFile);
      } else {
        setError("Only CSV files are accepted.");
      }
    }
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
      router.push(`/dashboard/${response.session_id}`);
    } catch (err: any) {
      const message = err instanceof Error ? err.message : "Upload failed";
      if (message.includes("429") || message.toLowerCase().includes("limit") || message.toLowerCase().includes("50 analyses")) {
        toast.error("You've reached your 50-analysis limit. Delete old analyses to continue.");
        // Do not set error in state so the form stays usable
      } else {
        setError(message);
      }
      setUploading(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <Card className="w-full max-w-xl shadow-lg border-muted/50 bg-background/50 backdrop-blur-sm relative z-10">
      <CardContent className="p-6">
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
            dragOver ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 hover:bg-muted/30"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".csv"
            onChange={handleFileChange}
          />
          <UploadCloud className={`w-12 h-12 mb-4 ${dragOver ? "text-primary" : "text-muted-foreground"}`} />
          {file ? (
            <div className="text-center">
              <p className="font-semibold text-foreground">{file.name}</p>
              <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="font-medium text-foreground text-lg mb-1">Drop your CSV here</p>
              <p className="text-sm text-muted-foreground">or click to browse files</p>
            </div>
          )}
        </div>

        {error && <p className="text-destructive text-sm mt-4 text-center">{error}</p>}
        {isUploading && (
          <div className="mt-4 flex items-center justify-center text-muted-foreground text-sm">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Analyzing Data...
          </div>
        )}
      </CardContent>
    </Card>

    <div className={`w-full max-w-xl transition-all duration-300 ease-in-out ${
      isFormVisible ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"
    }`}>
      <PreferenceForm onStartAnalysis={handleAnalyze} />
    </div>
  </div>
  );
}
