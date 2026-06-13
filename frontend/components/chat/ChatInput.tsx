import { useState, FormEvent } from "react";
import { SendHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");
  const MAX_CHARS = 500;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || disabled || trimmed.length > MAX_CHARS) return;
    
    onSend(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
  };

  const showCounter = input.length > 400;
  const isOverLimit = input.length > MAX_CHARS;

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <div className="relative flex items-center">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about your data... (Press Enter to send)"
          className={`pr-14 rounded-full bg-background border-border shadow-sm focus-visible:ring-primary/50 h-12 ${isOverLimit ? 'border-destructive focus-visible:ring-destructive/50' : ''}`}
          disabled={disabled}
          maxLength={MAX_CHARS + 50} // Allow typing slightly over to show red counter
        />
        <Button 
          type="submit" 
          size="icon" 
          disabled={disabled || !input.trim() || isOverLimit}
          className="absolute right-1.5 h-9 w-9 rounded-full bg-primary hover:bg-primary/90 transition-all"
        >
          <SendHorizontal className="h-4 w-4 text-primary-foreground" />
          <span className="sr-only">Send message</span>
        </Button>
      </div>
      
      {/* Character Counter */}
      {showCounter && (
        <div className={`absolute -top-6 right-2 text-xs font-medium ${isOverLimit ? 'text-destructive animate-pulse' : 'text-muted-foreground'}`}>
          {input.length} / {MAX_CHARS}
        </div>
      )}
    </form>
  );
}
