import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart2, Lightbulb, Sparkles, TrendingUp, Database, Zap } from "lucide-react";
import DropZone from "@/components/upload/DropZone";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { useSessionStore } from "@/store/sessionStore";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DataSage — Autonomous CSV analysis in 60 seconds" },
      {
        name: "description",
        content:
          "Upload a CSV. DataSage cleans, charts, finds anomalies, surfaces insights, and forecasts trends automatically.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const user = useAuthStore((s) => s.user);
  const reset = useSessionStore((s) => s.reset);

  useEffect(() => {
    // When user lands on home page, always clear any previous session state
    // so the DropZone starts fresh and doesn't show "Analyzing..."
    reset();
  }, [reset]);

  const features = [
    { icon: Database, label: "Auto-cleaning" },
    { icon: BarChart2, label: "Smart EDA" },
    { icon: Sparkles, label: "Plotly charts" },
    { icon: Lightbulb, label: "AI insights" },
    { icon: TrendingUp, label: "Forecasting" },
    { icon: Zap, label: "60-second pipeline" },
  ];

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      {/* Mesh background */}
      <div className="absolute inset-0 mesh-bg opacity-60 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_30%,var(--color-background)_75%)] pointer-events-none" />

      <div className="relative container mx-auto px-4 py-16 md:py-24 flex flex-col items-center">
        <div className="max-w-3xl w-full text-center space-y-6 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-card/60 text-xs font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            Live pipeline · 60s typical run
          </div>
          <motion.h1
            className="text-5xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight leading-[1.05]"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.12 } },
            }}
          >
            {["Autonomous data", "analysis,"].map((line, i) => (
              <motion.span
                key={i}
                className="block"
                variants={{
                  hidden: { opacity: 0, y: 24 },
                  show:   { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
                }}
              >
                {line}
              </motion.span>
            ))}
            <motion.span
              className="text-gradient block"
              variants={{
                hidden: { opacity: 0, y: 24 },
                show:   { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
              }}
            >
              in one upload.
            </motion.span>
          </motion.h1>
          <motion.p
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35, ease: "easeOut" }}
          >
            Drop a CSV. DataSage cleans, charts, detects anomalies, and forecasts
            — and hands you back a fully-loaded dashboard.
          </motion.p>
        </div>

        <div className="w-full max-w-2xl mb-14">
          <DropZone />
        </div>

        <motion.div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 max-w-4xl w-full"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.06, delayChildren: 0.5 } },
          }}
        >
          {features.map(({ icon: Icon, label }) => (
            <motion.div
              key={label}
              variants={{
                hidden: { opacity: 0, y: 16 },
                show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
              }}
              whileHover={{ scale: 1.04, transition: { duration: 0.15 } }}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-card/50 backdrop-blur-sm cursor-default"
            >
              <Icon className="h-5 w-5 text-primary" />
              <span className="text-xs font-medium text-center">{label}</span>
            </motion.div>
          ))}
        </motion.div>

        {!user && (
          <div className="mt-12 text-center text-sm text-muted-foreground">
            <Link
              to="/auth"
              className="underline underline-offset-4 text-primary font-medium hover:text-primary/80"
            >
              Create a free account
            </Link>{" "}
            to save your analyses across devices.
          </div>
        )}
      </div>
    </div>
  );
}
