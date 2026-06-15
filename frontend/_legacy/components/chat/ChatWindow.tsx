"use client";

import { useEffect, useState, useRef } from "react";
import { getConversation, askQuestion } from "@/lib/api";
import { Message } from "@/lib/types";
import { Bot, User, Sparkles, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ChatInput from "./ChatInput";
import { useSessionStore } from "@/store/sessionStore";

interface ChatWindowProps {
  sessionId: string;
}

const FALLBACK_QUESTIONS = [
  "What are the key patterns in this dataset?",
  "What columns have the most missing values?",
  "Were any anomalies detected?",
  "What are the strongest correlations?",
  "What does the data distribution look like?",
];

const QUESTION_TYPE_STYLES: Record<string, { label: string; className: string }> = {
  anomaly: { label: "Anomaly Analysis", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
  statistical: { label: "Statistics", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  trend: { label: "Trend", className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300" },
  comparison: { label: "Comparison", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  general: { label: "General", className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" },
};

/** Render message content with basic markdown support */
function renderMessageContent(content: string) {
  // Split by lines
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let currentList: string[] = [];
  let listType: "ul" | "ol" | null = null;

  const flushList = () => {
    if (currentList.length > 0 && listType) {
      const ListTag = listType;
      elements.push(
        <ListTag key={`list-${elements.length}`} className={`${listType === "ol" ? "list-decimal" : "list-disc"} pl-5 space-y-1 my-2`}>
          {currentList.map((item, i) => (
            <li key={i} className="text-sm leading-relaxed">
              {renderInlineFormatting(item)}
            </li>
          ))}
        </ListTag>
      );
      currentList = [];
      listType = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check for bullet lists
    const bulletMatch = trimmed.match(/^[•\-\*]\s+(.+)/);
    if (bulletMatch) {
      if (listType !== "ul") flushList();
      listType = "ul";
      currentList.push(bulletMatch[1]);
      continue;
    }

    // Check for numbered lists
    const numberMatch = trimmed.match(/^\d+[.)]\s+(.+)/);
    if (numberMatch) {
      if (listType !== "ol") flushList();
      listType = "ol";
      currentList.push(numberMatch[1]);
      continue;
    }

    // Not a list item — flush any pending list
    flushList();

    if (trimmed === "") {
      elements.push(<br key={`br-${i}`} />);
    } else {
      elements.push(
        <p key={`p-${i}`} className="text-sm leading-relaxed">
          {renderInlineFormatting(trimmed)}
        </p>
      );
    }
  }

  flushList(); // flush any remaining list
  return elements;
}

/** Render bold text (**text**) */
function renderInlineFormatting(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const boldMatch = part.match(/^\*\*(.+)\*\*$/);
    if (boldMatch) {
      return <strong key={i}>{boldMatch[1]}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

export default function ChatWindow({ sessionId }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const suggestedQuestions = FALLBACK_QUESTIONS;
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    let mounted = true;

    async function loadHistory() {
      try {
        setIsLoadingHistory(true);
        const history = await getConversation(sessionId);
        if (mounted) {
          setMessages(history || []);
          setError(null);
        }
      } catch (err: unknown) {
        if (mounted) {
          const message = err instanceof Error ? err.message : "Failed to load chat history";
          setError(message);
        }
      } finally {
        if (mounted) setIsLoadingHistory(false);
      }
    }

    loadHistory();

    return () => {
      mounted = false;
    };
  }, [sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  const handleSend = async (question: string) => {
    if (!question.trim()) return;

    const tempId = `temp-${Date.now()}`;
    const userMsg: Message = {
      id: tempId,
      role: "user",
      content: question,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsSending(true);
    setError(null);

    try {
      const response = await askQuestion(sessionId, question);
      
      const assistantMsg: Message = {
        id: response.conversation_id || `asst-${Date.now()}`,
        role: "assistant",
        content: response.answer,
        created_at: new Date().toISOString(),
        question_type: response.question_type,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to get an answer from DataSage.";
      setError(message);
      // Remove the optimistic user message if it failed completely
      setMessages((prev) => prev.filter(m => m.id !== tempId));
    } finally {
      setIsSending(false);
    }
  };

  if (isLoadingHistory) {
    return (
      <div className="flex flex-col h-[500px] items-center justify-center space-y-4">
        <Sparkles className="h-8 w-8 animate-pulse text-muted-foreground" />
        <p className="text-muted-foreground animate-pulse">Loading conversation history...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] max-w-4xl mx-auto w-full border rounded-xl overflow-hidden bg-background shadow-sm">
      {/* Header */}
      <div className="bg-muted/30 px-6 py-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">DataSage Assistant</h3>
        </div>
        <Badge variant="outline" className="text-xs font-normal">Dataset Q&A</Badge>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
            <div className="bg-primary/10 p-4 rounded-full">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h4 className="text-lg font-medium mb-2">Ask a question about your data</h4>
              <p className="text-muted-foreground max-w-sm text-sm">
                I can analyze distributions, identify trends, spot anomalies, and explain correlations in your dataset.
              </p>
            </div>
            <div className="grid gap-2 w-full max-w-md">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const cleanQ = q.replace(/^"|"$/g, '');
                    handleSend(cleanQ);
                  }}
                  disabled={isSending}
                  className="text-left text-sm p-3 border rounded-lg hover:bg-muted/50 transition-colors text-foreground/80 hover:text-foreground disabled:opacity-50"
                >
                  &ldquo;{q}&rdquo;
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`flex gap-3 max-w-[80%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                
                {/* Avatar */}
                <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                  msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted border border-border"
                }`}>
                  {msg.role === "user" ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                </div>

                {/* Bubble */}
                <div className="flex flex-col gap-1">
                  {msg.role === "assistant" && msg.question_type && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-muted-foreground">DataSage</span>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] h-5 px-2 font-medium border-transparent ${
                          QUESTION_TYPE_STYLES[msg.question_type]?.className || QUESTION_TYPE_STYLES.general.className
                        }`}
                      >
                        {QUESTION_TYPE_STYLES[msg.question_type]?.label || msg.question_type}
                      </Badge>
                    </div>
                  )}
                  
                  <div className={`p-3.5 rounded-2xl leading-relaxed ${
                    msg.role === "user" 
                      ? "bg-primary text-primary-foreground rounded-tr-sm text-sm" 
                      : "bg-muted/50 border border-border rounded-tl-sm"
                  }`}>
                    {msg.role === "assistant"
                      ? renderMessageContent(msg.content)
                      : <span className="text-sm">{msg.content}</span>
                    }
                  </div>
                </div>

              </div>
            </div>
          ))
        )}

        {isSending && (
          <div className="flex w-full justify-start">
            <div className="flex gap-3 max-w-[80%] flex-row">
              <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-muted border border-border">
                <Bot className="h-5 w-5" />
              </div>
              <div className="p-4 rounded-2xl bg-muted/50 border border-border rounded-tl-sm flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Error Alert */}
      {error && (
        <div className="px-6 pb-2">
          <Alert variant="destructive" className="py-2 px-3">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs ml-2">{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 bg-background border-t">
        <ChatInput onSend={handleSend} disabled={isSending} />
      </div>
    </div>
  );
}
