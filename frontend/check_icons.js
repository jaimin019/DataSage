import * as lucide from "lucide-react";
const icons = ["CheckCircle2", "XCircle", "Loader2", "Database", "BarChart2", "Lightbulb", "TrendingUp", "Sparkles"];
icons.forEach(i => {
  if (!lucide[i]) console.log("MISSING:", i);
});
console.log("Done checking icons.");
