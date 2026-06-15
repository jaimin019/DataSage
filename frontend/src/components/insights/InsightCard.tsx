import type { Insight } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, GitBranch, AlertTriangle, BarChart2, Lightbulb } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  insight: Insight;
}

const CATEGORY_CONFIG: Record<string, { className: string; icon: React.ReactNode }> = {
  trend:          { className: "bg-primary/10 text-primary border-primary/20",          icon: <TrendingUp className="w-2.5 h-2.5" /> },
  correlation:    { className: "bg-violet-500/10 text-violet-400 border-violet-500/20", icon: <GitBranch className="w-2.5 h-2.5" /> },
  anomaly:        { className: "bg-rose-500/10 text-rose-400 border-rose-500/20",       icon: <AlertTriangle className="w-2.5 h-2.5" /> },
  distribution:   { className: "bg-sky-500/10 text-sky-400 border-sky-500/20",          icon: <BarChart2 className="w-2.5 h-2.5" /> },
  recommendation: { className: "bg-primary/15 text-primary border-primary/25",          icon: <Lightbulb className="w-2.5 h-2.5" /> },
};

export default function InsightCard({ insight }: Props) {
  const config = CATEGORY_CONFIG[insight.category.toLowerCase()];
  const categoryClass = config?.className ?? "bg-muted/50 text-muted-foreground border-border";
  const categoryIcon  = config?.icon ?? null;

  return (
    <motion.div
      whileHover={{
        y: -3,
        boxShadow: "0 10px 40px rgba(99,102,241,0.14)",
        transition: { duration: 0.2, ease: "easeOut" },
      }}
      whileTap={{ scale: 0.99 }}
    >
      <Card className="overflow-hidden border transition-colors hover:border-primary/25 group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        <CardContent className="relative p-7">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground flex items-center justify-center font-display font-bold text-lg shadow-sm shadow-primary/30">
              {insight.rank}
            </div>

            <div className="flex-1 space-y-4 min-w-0">
              <Badge variant="outline" className={`${categoryClass} text-xs uppercase tracking-widest px-3 py-1 inline-flex items-center gap-1.5`}>
                {categoryIcon}
                {insight.category}
              </Badge>
              <h3 className="text-xl font-display font-semibold leading-snug break-words">
                {insight.title}
              </h3>
              <p className="text-base text-muted-foreground leading-relaxed">
                {insight.body}
              </p>
              {insight.supporting_columns?.length > 0 && (
                <div className="pt-3 flex flex-wrap gap-2 border-t border-border/60">
                  {insight.supporting_columns.map((col) => (
                    <Badge key={col} variant="secondary" className="text-xs font-mono px-2.5 py-0.5">
                      {col}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
