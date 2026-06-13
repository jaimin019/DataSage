"use client";

import { useState } from "react";
import { FileText, FileSpreadsheet, BookOpen, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { downloadReport, downloadCleanedCSV, downloadNotebook } from "@/lib/api";

interface DownloadPanelProps {
  sessionId: string;
  disabled?: boolean;
}

type DownloadType = "report" | "csv" | "notebook";

interface DownloadItem {
  type: DownloadType;
  icon: typeof FileText;
  title: string;
  description: string;
}

const DOWNLOAD_ITEMS: DownloadItem[] = [
  {
    type: "report",
    icon: FileText,
    title: "Download PDF Report",
    description: "Full analysis report with charts and insights",
  },
  {
    type: "csv",
    icon: FileSpreadsheet,
    title: "Download Cleaned CSV",
    description: "Processed dataset with nulls filled and numeric columns extracted",
  },
  {
    type: "notebook",
    icon: BookOpen,
    title: "Download Jupyter Notebook",
    description: "Runnable .ipynb with all analysis steps in code",
  },
];

export default function DownloadPanel({ sessionId, disabled = false }: DownloadPanelProps) {
  const [loadingType, setLoadingType] = useState<DownloadType | null>(null);

  const handleDownload = async (type: DownloadType) => {
    setLoadingType(type);
    try {
      switch (type) {
        case "report": {
          const blob = await downloadReport(sessionId);
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `datasage-report-${sessionId.slice(0, 8)}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          break;
        }
        case "csv":
          await downloadCleanedCSV(sessionId);
          break;
        case "notebook":
          await downloadNotebook(sessionId);
          break;
      }
      toast.success("✅ File downloaded", {
        description: "Your file has been saved successfully.",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error("❌ Download failed. Try again.", {
        description: message,
      });
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <span>📥</span> Downloads
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {DOWNLOAD_ITEMS.map((item) => {
          const isLoading = loadingType === item.type;
          const Icon = item.icon;

          return (
            <Button
              key={item.type}
              variant="outline"
              className="w-full justify-start h-auto py-3 px-4"
              disabled={disabled || isLoading || loadingType !== null}
              onClick={() => handleDownload(item.type)}
            >
              <div className="flex items-start gap-3 w-full">
                <div className="flex-shrink-0 mt-0.5">
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : (
                    <Icon className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="text-left">
                  <div className="font-medium text-sm">{item.title}</div>
                  <div className="text-xs text-muted-foreground font-normal mt-0.5">
                    {item.description}
                  </div>
                </div>
              </div>
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}
