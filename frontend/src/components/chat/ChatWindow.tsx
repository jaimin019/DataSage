import { useEffect, useState, useRef } from "react";
import { getConversation, askQuestion } from "@/lib/api";
import type { Message } from "@/lib/types";
import { Bot, User, Sparkles, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ChatInput from "./ChatInput";

interface Props {
  sessionId: string;
}

const SUGGESTED = [
  "What are the key patterns in this dataset?",
  "What columns have the most missing values?",
  "Were any anomalies detected?",
  "What are the strongest correlations?",
];

const TYPE_STYLES: Record<string, string> = {
  anomaly: "bg-destructive/10 text-destructive",
  statistical: "bg-info/10 text-info",
  trend: "bg-primary/10 text-primary",
  comparison: "bg-success/10 text-success",
  general: "bg-muted text-muted-foreground",
};

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const m = part.match(/^\*\*(.+)\*\*$/);
    return m ? <strong key={i}>{m[1]}</strong> : <span key={i}>{part}</span>;
  });
}

function renderContent(content: string) {
  const lines = content.split("\n");
  const out: React.ReactNode[] = [];
  let list: string[] = [];
  let lt: "ul" | "ol" | null = null;
  const flush = () => {
    if (list.length && lt) {
      const Tag = lt;
      out.push(
        <Tag key={`l${out.length}`} className={`${lt === "ol" ? "list-decimal" : "list-disc"} pl-5 space-y-1 my-2`}>
          {list.map((it, i) => (
            <li key={i} className="text-base leading-relaxed">{renderInline(it)}</li>
          ))}
        </Tag>,
      );
      list = [];
      lt = null;
    }
  };
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    const b = t.match(/^[•\-*]\s+(.+)/);
    if (b) { if (lt !== "ul") flush(); lt = "ul"; list.push(b[1]); continue; }
    const n = t.match(/^\d+[.)]\s+(.+)/);
    if (n) { if (lt !== "ol") flush(); lt = "ol"; list.push(n[1]); continue; }
    flush();
    if (t === "") out.push(<br key={`b${i}`} />);
    else out.push(<p key={`p${i}`} className="text-base leading-relaxed">{renderInline(t)}</p>);
  }
  flush();
  return out;
}

export default function ChatWindow({ sessionId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setIsLoadingHistory(true);
        const h = await getConversation(sessionId);
        if (mounted) { setMessages(h || []); setError(null); }
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : "Failed to load history");
      } finally {
        if (mounted) setIsLoadingHistory(false);
      }
    })();
    return () => { mounted = false; };
  }, [sessionId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const handleSend = async (question: string) => {
    if (!question.trim()) return;
    const tempId = `temp-${Date.now()}`;
    const userMsg: Message = { id: tempId, role: "user", content: question, created_at: new Date().toISOString() };
    setMessages((p) => [...p, userMsg]);
    setIsSending(true);
    setError(null);
    try {
      const response = await askQuestion(sessionId, question);
      const ast: Message = {
        id: response.conversation_id || `asst-${Date.now()}`,
        role: "assistant",
        content: response.answer,
        created_at: new Date().toISOString(),
        question_type: response.question_type,
      };
      setMessages((p) => [...p, ast]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get an answer.");
      setMessages((p) => p.filter((m) => m.id !== tempId));
    } finally {
      setIsSending(false);
    }
  };

  if (isLoadingHistory) {
    return (
      <div className="flex flex-col h-[500px] items-center justify-center space-y-4">
        <Sparkles className="h-8 w-8 animate-pulse text-muted-foreground" />
        <p className="text-muted-foreground">Loading conversation…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[680px] w-full border rounded-2xl overflow-hidden bg-card shadow-sm">
      <div className="bg-muted/30 px-7 py-5 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-sm shadow-primary/30">
            <Bot className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-base">DataSage Assistant</h3>
            <p className="text-xs text-muted-foreground">Ask anything about your data</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs px-3 py-1">Dataset Q&A</Badge>
      </div>

      <div className="flex-1 overflow-y-auto p-7 space-y-7">
        {messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex flex-col items-center justify-center h-full text-center space-y-6"
          >
            <div className="bg-primary/10 p-5 rounded-2xl">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h4 className="text-xl font-semibold mb-2">Ask anything about your data</h4>
              <p className="text-muted-foreground text-base max-w-sm">
                I can spot anomalies, explain correlations, and surface trends in your dataset.
              </p>
            </div>
            <div className="grid gap-2 w-full max-w-md">
              {SUGGESTED.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(q)}
                  disabled={isSending}
                  className="group text-left text-base p-4 border rounded-xl hover:bg-primary/5 hover:border-primary/30 transition-all duration-200 text-foreground/70 hover:text-foreground disabled:opacity-50 cursor-pointer flex items-center justify-between"
                >
                  <span>&ldquo;{q}&rdquo;</span>
                  <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-2 shrink-0">
                    →
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
              <div className={`flex gap-3 max-w-[80%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div
                  className={`flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center ${
                    msg.role === "user"
                      ? "bg-gradient-to-br from-primary to-primary-glow text-primary-foreground"
                      : "bg-muted border border-border"
                  }`}
                >
                  {msg.role === "user" ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                  {msg.role === "assistant" && msg.question_type && (
                    <Badge variant="secondary" className={`w-fit text-[10px] ${TYPE_STYLES[msg.question_type] ?? TYPE_STYLES.general}`}>
                      {msg.question_type}
                    </Badge>
                  )}
                  <div
                    className={`p-4 rounded-2xl ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm text-base"
                        : "bg-muted/40 border border-border rounded-tl-sm"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      renderContent(msg.content)
                    ) : (
                      <span className="text-base">{msg.content}</span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        )}

        {isSending && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.25 }}
            className="flex w-full justify-start"
          >
            <div className="flex gap-3 max-w-[80%]">
              <div className="flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center bg-muted border border-border">
                <Bot className="h-5 w-5" />
              </div>
              <div className="p-5 rounded-2xl bg-muted/40 border border-border rounded-tl-sm flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-primary/60 animate-bounce" />
                <div className="w-2.5 h-2.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2.5 h-2.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={endRef} />
      </div>

      {error && (
        <div className="px-6 pb-2">
          <Alert variant="destructive" className="py-2 px-3">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs ml-2">{error}</AlertDescription>
          </Alert>
        </div>
      )}

      <div className="p-5 bg-card border-t">
        <ChatInput onSend={handleSend} disabled={isSending} />
      </div>
    </div>
  );
}
