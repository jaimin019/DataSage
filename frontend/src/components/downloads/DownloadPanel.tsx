import { useState } from "react";
import { FileText, FileSpreadsheet, BookOpen, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { downloadReport, downloadCleanedCSV, downloadNotebook } from "@/lib/api";

type DType = "report" | "csv" | "notebook";

interface Props {
  sessionId: string;
  disabled?: boolean;
}

export default function DownloadPanel({ sessionId, disabled }: Props) {
  const [loading, setLoading] = useState<DType | null>(null);

  const handle = async (type: DType) => {
    setLoading(type);
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
      toast.success("Download started");
    } catch (err) {
      toast.error("Download failed", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setLoading(null);
    }
  };

  const items: { type: DType; icon: typeof FileText; title: string; description: string }[] = [
    { type: "report", icon: FileText, title: "PDF Report", description: "Full analysis with charts" },
    { type: "csv", icon: FileSpreadsheet, title: "Cleaned CSV", description: "Processed dataset" },
    { type: "notebook", icon: BookOpen, title: "Jupyter Notebook", description: "Runnable .ipynb" },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={disabled || loading !== null} className="transition-all duration-200 hover:scale-[1.02] hover:shadow-sm active:scale-[0.98]">
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Download
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">
          Export
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.map((it) => {
          const Icon = it.icon;
          const isLoading = loading === it.type;
          return (
            <DropdownMenuItem
              key={it.type}
              disabled={loading !== null}
              onClick={() => handle(it.type)}
              className="py-3"
            >
              <div className="flex items-start gap-3 w-full">
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary mt-0.5" />
                ) : (
                  <Icon className="h-5 w-5 text-primary mt-0.5" />
                )}
                <div>
                  <div className="font-medium text-sm">{it.title}</div>
                  <div className="text-xs text-muted-foreground">{it.description}</div>
                </div>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
