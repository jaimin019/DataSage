import { cn } from "@/lib/utils"

interface Props {
  icon: string
  label: string
  description: string
  selected: boolean
  onClick: () => void
}

export function PreferenceCard({ icon, label, description, selected, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-4 rounded-xl border-2 transition-all duration-150",
        "flex items-start gap-3 cursor-pointer",
        selected
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:bg-card/80"
      )}
    >
      <span className="text-2xl shrink-0">{icon}</span>
      <div>
        <p className={cn("font-semibold text-sm", selected && "text-foreground")}>
          {label}
        </p>
        <p className="text-xs mt-0.5 opacity-80">{description}</p>
      </div>
      {selected && (
        <span className="ml-auto shrink-0 text-primary text-lg">✓</span>
      )}
    </button>
  )
}
