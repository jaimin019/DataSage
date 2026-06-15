import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Star, MoreVertical, Loader2, TrendingUp } from "lucide-react";
import type { HistoryItem } from "@/lib/api";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface Props {
  item: HistoryItem;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onStar: (id: string, starred: boolean) => void;
}

export default function HistoryCard({ item, onDelete, onRename, onStar }: Props) {
  const navigate = useNavigate();
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [newName, setNewName] = useState(
    item.display_name ?? item.original_name ?? "",
  );

  const handleRenameSubmit = () => {
    onRename(item.session_id, newName);
    setIsRenameOpen(false);
  };

  const isPending = !["done", "failed"].includes(item.status?.toLowerCase() ?? "");
  const isDone = item.status?.toLowerCase() === "done";
  const isFailed = item.status?.toLowerCase() === "failed";

  const statusBadge = isDone ? (
    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-medium">
      Complete
    </Badge>
  ) : isFailed ? (
    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] font-medium">
      Failed
    </Badge>
  ) : (
    <Badge variant="outline" className="bg-muted text-muted-foreground border-border gap-1 text-[10px] font-medium">
      <Loader2 className="w-3 h-3 animate-spin" /> Processing
    </Badge>
  );

  return (
    <motion.div
      className="group border rounded-xl p-4 sm:p-5 bg-card shadow-sm"
      whileHover={{
        y: -2,
        boxShadow: "0 8px 32px rgba(99, 102, 241, 0.12)",
        borderColor: "rgba(99, 102, 241, 0.3)",
        transition: { duration: 0.2 },
      }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <button
            onClick={() => onStar(item.session_id, !item.is_starred)}
            className="mt-1 flex-shrink-0 focus:outline-none rounded"
            aria-label={item.is_starred ? "Unstar" : "Star"}
          >
            <Star
              className={`h-5 w-5 transition-colors ${
                item.is_starred
                  ? "fill-warning text-warning"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            />
          </button>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate text-base">
              {item.effective_name}
            </h3>
            <div className="text-xs text-muted-foreground mt-0.5 truncate">
              {item.original_name || "Unknown"} ·{" "}
              {new Date(item.created_at).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 mt-3 text-xs">
              <Badge variant="secondary" className="font-mono">
                {item.row_count?.toLocaleString() || 0} rows
              </Badge>
              <Badge variant="secondary" className="font-mono">
                {item.col_count || 0} cols
              </Badge>
              <Badge variant="secondary">{item.insight_count} insights</Badge>
              <Badge variant="secondary">{item.chart_count} charts</Badge>
              {item.has_forecast && (
                <Badge className="bg-primary/15 text-primary border-transparent inline-flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Forecast
                </Badge>
              )}
            </div>

            {item.preferences_summary && (
              <div className="mt-2 text-xs text-muted-foreground/80 line-clamp-1">
                {item.preferences_summary}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-3 flex-shrink-0">
          {statusBadge}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() =>
                navigate({
                  to: "/dashboard/$sessionId",
                  params: { sessionId: item.session_id },
                })
              }
              className="transition-all duration-200 hover:scale-[1.02] hover:shadow-sm active:scale-[0.98]"
            >
              Open
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                className={buttonVariants({
                  variant: "outline",
                  size: "icon",
                  className: "h-8 w-8 transition-all duration-200 hover:bg-primary/10 hover:text-primary",
                })}
              >
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsRenameOpen(true)}>
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onStar(item.session_id, !item.is_starred)}
                >
                  {item.is_starred ? "Unstar" : "Star"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <AlertDialog>
                  <AlertDialogTrigger className="w-full text-left">
                    <DropdownMenuItem
                      onSelect={(e) => e.preventDefault()}
                      className="text-destructive focus:text-destructive w-full"
                    >
                      Delete
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogTitle>Delete this analysis?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete &ldquo;{item.effective_name}
                      &rdquo; and all its files. This cannot be undone.
                    </AlertDialogDescription>
                    <div className="flex justify-end gap-2 mt-4">
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(item.session_id)}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        Delete permanently
                      </AlertDialogAction>
                    </div>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent>
          <DialogTitle>Rename analysis</DialogTitle>
          <div className="py-4 space-y-4">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Q3 Sales Data"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameSubmit();
              }}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsRenameOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleRenameSubmit}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
