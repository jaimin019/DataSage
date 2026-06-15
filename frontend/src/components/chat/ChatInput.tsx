import { useState, type FormEvent } from "react";
import { SendHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props {
  onSend: (message: string) => void;
  disabled: boolean;
}

export default function ChatInput({ onSend, disabled }: Props) {
  const [input, setInput] = useState("");
  const MAX_CHARS = 500;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || disabled || trimmed.length > MAX_CHARS) return;
    onSend(trimmed);
    setInput("");
  };

  const isOver = input.length > MAX_CHARS;
  const showCounter = input.length > 400;

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <div className="relative flex items-center">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about your data…"
          className={`pr-16 rounded-full bg-card border-border h-14 text-base focus-visible:ring-primary/50 ${
            isOver ? "border-destructive" : ""
          }`}
          disabled={disabled}
          maxLength={MAX_CHARS + 50}
        />
        <Button
          type="submit"
          size="icon"
          disabled={disabled || !input.trim() || isOver}
          className="absolute right-2 h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary-glow shadow-sm shadow-primary/40 transition-all duration-200 hover:scale-110 hover:shadow-md hover:shadow-primary/40 active:scale-[0.95]"
        >
          <SendHorizontal className="h-4 w-4" />
          <span className="sr-only">Send</span>
        </Button>
      </div>
      {showCounter && (
        <div
          className={`absolute -top-5 right-3 text-[10px] font-medium ${
            isOver ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {input.length} / {MAX_CHARS}
        </div>
      )}
    </form>
  );
}
