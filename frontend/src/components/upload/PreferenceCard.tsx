import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Props {
  icon: React.ReactNode;
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}

export function PreferenceCard({ icon, label, description, selected, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-4 rounded-xl border transition-all duration-200",
        "flex items-start gap-3 cursor-pointer group",
        selected
          ? "border-primary/60 bg-primary/[0.06] ring-glow"
          : "border-border bg-card hover:border-border-strong hover:bg-accent/40",
      )}
    >
      <span className="text-xl shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className={cn("font-medium text-sm", selected ? "text-foreground" : "text-foreground/90")}>
          {label}
        </p>
        <p className="text-xs mt-0.5 text-muted-foreground">{description}</p>
      </div>
      {selected && (
        <span className="shrink-0 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
          <Check className="h-3 w-3" />
        </span>
      )}
    </button>
  );
}
