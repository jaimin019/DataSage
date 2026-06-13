"use client";

import { useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { downloadReport } from "@/lib/api";

interface DownloadReportButtonProps {
  sessionId: string;
}

export default function DownloadReportButton({ sessionId }: DownloadReportButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      toast("Download Started", {
        description: "Your comprehensive PDF report is downloading.",
      });
      
      const blob = await downloadReport(sessionId);
      
      // Create a URL for the blob and trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `datasage-report-${sessionId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate PDF report.";
      toast.error("Download Failed", {
        description: message,
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Button 
      onClick={handleDownload} 
      disabled={isDownloading}
      className="flex items-center gap-2"
    >
      {isDownloading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileText className="h-4 w-4" />
      )}
      {isDownloading ? "Generating PDF..." : "Download Report"}
    </Button>
  );
}
