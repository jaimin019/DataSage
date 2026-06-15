import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Search, Star, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import HistoryCard from "@/components/history/HistoryCard";
import {
  getHistory,
  deleteSession,
  updateAnalysisLabel,
  type HistoryItem,
} from "@/lib/api";
import { motion, type Variants } from "framer-motion";

const containerVariants: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06 },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({ meta: [{ title: "My analyses · DataSage" }] }),
  component: HistoryPage,
});

function HistoryPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [starredOnly, setStarred] = useState(false);
  const [search, setSearch] = useState("");
  const [isLoading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const res = await getHistory(page, 20, starredOnly);
      setItems(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, starredOnly]);

  const handleDelete = async (id: string) => {
    try {
      await deleteSession(id);
      setItems((prev) => prev.filter((i) => i.session_id !== id));
      setTotal((p) => p - 1);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRename = async (id: string, name: string) => {
    try {
      const updated = await updateAnalysisLabel(id, name, null);
      setItems((prev) => prev.map((i) => (i.session_id === id ? updated : i)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleStar = async (id: string, is_starred: boolean) => {
    setItems((prev) =>
      prev.map((i) => (i.session_id === id ? { ...i, is_starred } : i)),
    );
    try {
      const updated = await updateAnalysisLabel(id, null, is_starred);
      setItems((prev) =>
        prev.map((i) => (i.session_id === id ? updated : i)),
      );
    } catch (err) {
      setItems((prev) =>
        prev.map((i) =>
          i.session_id === id ? { ...i, is_starred: !is_starred } : i,
        ),
      );
      console.error(err);
    }
  };

  const filtered = items.filter((item) => {
    const name = item.effective_name || item.display_name || item.original_name || "";
    return !search || name.toLowerCase().includes(search.toLowerCase());
  });

  const starredCount = items.filter((i) => i.is_starred).length;

  if (!isLoading && items.length === 0 && !starredOnly && page === 1) {
    return (
      <div className="container max-w-5xl mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <FileSpreadsheet className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-display font-semibold">No analyses yet</h3>
          <p className="text-muted-foreground text-sm max-w-sm">
            Upload your first CSV to get started. DataSage will clean, analyze, and visualize it.
          </p>
          <Button onClick={() => navigate({ to: "/" })} className="mt-2">
            <Plus className="h-4 w-4 mr-1" /> Upload a CSV
          </Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="container max-w-5xl mx-auto px-4 py-8 space-y-8"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">
            My Analyses
          </h1>
          <p className="text-muted-foreground mt-1 text-sm flex items-center gap-2">
            <span>{total} analyses</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-warning text-warning" />
              {starredCount} starred
            </span>
          </p>
        </div>
        <Button onClick={() => navigate({ to: "/" })} className="gap-2">
          <Plus className="h-4 w-4" /> New analysis
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={starredOnly ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStarred(true);
              setPage(1);
            }}
            className="gap-1.5"
          >
            <Star className={`h-3.5 w-3.5 ${starredOnly ? "fill-current" : ""}`} />
            Starred
          </Button>
          <Button
            variant={!starredOnly ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStarred(false);
              setPage(1);
            }}
          >
            All
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border rounded-xl bg-card/50 border-dashed">
          <p className="text-muted-foreground font-medium">No results found.</p>
        </div>
      ) : (
        <motion.div
          className="space-y-3"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {filtered.map((item) => (
            <motion.div key={item.session_id} variants={cardVariants}>
              <HistoryCard
                item={item}
                onDelete={handleDelete}
                onRename={handleRename}
                onStar={handleStar}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Previous
          </Button>
          <span className="text-sm text-muted-foreground font-medium">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next →
          </Button>
        </div>
      )}
    </motion.div>
  );
}
