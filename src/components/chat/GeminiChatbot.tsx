import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import {
  Bot,
  Sparkles,
  Send,
  X,
  RotateCcw,
  Check,
  Copy,
  BarChart2,
  AlertTriangle,
  Cpu,
  Layers,
  HelpCircle,
  TrendingUp,
  Code2,
  ChevronDown,
  Minimize2,
  Maximize2,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useChat, type ChatContextPayload } from "@/context/ChatContext";
import { useAuth } from "@/hooks/useAuth";
import { getAuth } from "firebase/auth";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  modelUsed?: string;
  badge?: string;
}

export function GeminiChatbot() {
  const { isOpen, closeChat, activeContext } = useChat();
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "initial_welcome",
      role: "assistant",
      content:
        "Hello! I am your **Gemini AI Socratic Interviewer & DSA Coach**. \n\nI'm here to guide your invariant discovery, nudge your thinking on typos & logical edge cases without spoiling answers, answer doubts about simulation steps, and evaluate your submissions and activity.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedModel, setSelectedModel] = useState<
    "gemini-3.8-flash" | "gemini-3.5-flash" | "gemini-3.1-pro-preview" | "gemini-3.1-flash-lite"
  >("gemini-3.8-flash");
  const [selectedRole, setSelectedRole] = useState<
    "interviewer" | "step_doubts" | "evaluator" | "mistake_analyzer" | "general"
  >("interviewer");
  const [isContextDismissed, setIsContextDismissed] = useState(false);

  const handleRemoveContext = () => {
    setIsContextDismissed(true);
    if (selectedRole === "step_doubts") {
      setSelectedRole("general");
    }
    toast.info("Context removed. Coach can now answer any general questions without problem constraints.", {
      duration: 3000,
    });
  };

  const handleReattachContext = () => {
    setIsContextDismissed(false);
    toast.success("Problem context re-attached.", {
      duration: 2500,
    });
  };


  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages, scrollToBottom]);

  // If activeContext is passed with a custom prompt, send it automatically
  useEffect(() => {
    if (activeContext?.customPrompt) {
      if (activeContext.role) {
        setSelectedRole(activeContext.role as any);
      }
      handleSendMessage(activeContext.customPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeContext?.customPrompt]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: "cleared_welcome",
        role: "assistant",
        content:
          "Conversation cleared. How can I guide your algorithm analysis today? Feel free to ask about any step or submit code for Socratic nudges!",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setSessionId(undefined);
  };

  const handleSendMessage = async (customText?: string) => {
    const text = (customText || inputText).trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: "user_" + Date.now(),
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    if (!customText) setInputText("");
    setLoading(true);

    try {
      let idToken: string | undefined = undefined;
      try {
        const auth = getAuth();
        if (auth.currentUser) {
          idToken = await auth.currentUser.getIdToken();
        }
      } catch (e) {
        // Guest user
      }

      // Format payload for API
      const apiMessages = newMessages
        .filter((m) => m.id !== "initial_welcome" && m.id !== "cleared_welcome")
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          messages: apiMessages.length ? apiMessages : [{ role: "user", content: text }],
          model: selectedModel,
          role: selectedRole,
          context: isContextDismissed ? {} : (activeContext || {}),

          sessionId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to communicate with Gemini assistant");
      }

      if (data.sessionId) {
        setSessionId(data.sessionId);
      }

      const botMsg: Message = {
        id: "bot_" + Date.now(),
        role: "assistant",
        content: data.content || "I couldn't process that. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        modelUsed: data.modelUsed || selectedModel,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error("Chat error:", err);
      const errMsg: Message = {
        id: "err_" + Date.now(),
        role: "assistant",
        content: `⚠️ **Notice**: ${err.message || "An error occurred while contacting the Gemini AI service. Please try again."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <aside
      id="gemini-chat-drawer"
      aria-label="Gemini Socratic Assistant"
      className={`fixed bottom-0 right-0 z-50 flex flex-col bg-card/95 backdrop-blur-2xl border-l border-t border-border/80 shadow-2xl shadow-black/40 transition-all duration-300 ${
        isExpanded
          ? "w-full md:w-[720px] h-[92vh] md:rounded-tl-2xl"
          : "w-full sm:w-[460px] h-[640px] max-h-[92vh] sm:rounded-tl-2xl"
      }`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-border/70 px-4 py-3 bg-muted/40 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="relative flex size-8 items-center justify-center rounded-xl bg-primary/15 border border-primary/30 text-primary shadow-xs">
            <Bot className="size-4.5" />
            <span className="absolute -top-0.5 -right-0.5 flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
            </span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-foreground">Gemini DSA Interviewer</span>
              <span className="rounded-full bg-primary/15 border border-primary/25 px-2 py-0.2 font-mono text-[9px] font-bold text-primary">
                PRO AI
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground font-mono">
              Socratic Invariant Guide • Zero-Spoilers
            </p>
          </div>
        </div>

        {/* Header Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleClearChat}
            title="Reset conversation"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <RotateCcw className="size-4" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? "Collapse width" : "Expand width"}
            className="hidden sm:inline-flex rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {isExpanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
          <button
            onClick={closeChat}
            title="Close chat drawer"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="size-4.5" />
          </button>
        </div>
      </div>

      {/* Role & Model Controls Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-2 bg-background/50 text-xs shrink-0">
        {/* Role Selector */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5 scrollbar-none">
          <button
            onClick={() => setSelectedRole("interviewer")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
              selectedRole === "interviewer"
                ? "bg-primary text-primary-foreground font-bold shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Socratic Interviewer
          </button>
          <button
            onClick={() => setSelectedRole("general")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
              selectedRole === "general"
                ? "bg-primary text-primary-foreground font-bold shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            General Coach
          </button>
          <button
            onClick={() => setSelectedRole("step_doubts")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
              selectedRole === "step_doubts"
                ? "bg-primary text-primary-foreground font-bold shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Step Doubts
          </button>
          <button
            onClick={() => setSelectedRole("evaluator")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
              selectedRole === "evaluator"
                ? "bg-primary text-primary-foreground font-bold shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Submission Rater
          </button>
          <button
            onClick={() => setSelectedRole("mistake_analyzer")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
              selectedRole === "mistake_analyzer"
                ? "bg-primary text-primary-foreground font-bold shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Mistakes Lint
          </button>
        </div>

        {/* Model Switcher */}
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value as any)}
          className="rounded-lg border border-border/70 bg-card px-2 py-1 font-mono text-[10px] text-muted-foreground hover:text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
        >
          <option value="gemini-3.8-flash">gemini-3.8-flash (Recommended)</option>
          <option value="gemini-3.5-flash">gemini-3.5-flash (Balanced)</option>
          <option value="gemini-3.1-pro-preview">gemini-3.1-pro (Deep Analysis)</option>
          <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Speed)</option>
        </select>
      </div>

      {/* Active Context Banner (if tied to a problem or simulation step and not dismissed) */}
      {!isContextDismissed && (activeContext?.problemTitle || activeContext?.currentStep !== undefined) && (
        <div className="flex items-center justify-between border-b border-primary/20 bg-primary/5 px-4 py-1.5 text-[11px] text-primary shrink-0 animate-fade">
          <div className="flex items-center gap-1.5 truncate mr-2">
            <Sparkles className="size-3 shrink-0" />
            <span className="font-semibold truncate">
              {activeContext.problemTitle || activeContext.problemSlug}
            </span>
            {activeContext.currentStep !== undefined && (
              <span className="rounded bg-primary/20 px-1.5 py-0.2 font-mono text-[10px] font-bold">
                Step {activeContext.currentStep + 1}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider hidden sm:inline">
              Context Attached
            </span>
            <button
              type="button"
              onClick={handleRemoveContext}
              className="flex size-4.5 items-center justify-center rounded-full bg-primary/10 hover:bg-destructive/20 text-primary hover:text-destructive transition-colors cursor-pointer"
              title="Remove context (switch to unrestricted general mode)"
              aria-label="Remove attached context"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      {/* Detached Context Banner with Quick Re-attach */}
      {isContextDismissed && (activeContext?.problemTitle || activeContext?.currentStep !== undefined) && (
        <div className="flex items-center justify-between border-b border-border/40 bg-muted/20 px-4 py-1 text-[10px] text-muted-foreground shrink-0 animate-fade">
          <span className="truncate">General Mode • Problem context detached</span>
          <button
            type="button"
            onClick={handleReattachContext}
            className="flex items-center gap-1 text-primary hover:underline font-mono text-[10px] font-semibold shrink-0 cursor-pointer ml-2"
          >
            <Sparkles className="size-2.5" /> Re-attach Context
          </button>
        </div>
      )}


      {/* Scrollable Messages Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? "items-end" : "items-start"} gap-1`}
            >
              <div className="flex items-center gap-1.5 px-1 text-[10px] text-muted-foreground">
                <span className="font-semibold">{isUser ? "You" : "Gemini Coach"}</span>
                <span>•</span>
                <span>{msg.timestamp}</span>
                {msg.modelUsed && (
                  <span className="font-mono text-[9px] text-primary/70">[{msg.modelUsed}]</span>
                )}
              </div>

              <div
                className={`group relative max-w-[88%] rounded-2xl p-3.5 leading-relaxed shadow-sm ${
                  isUser
                    ? "bg-primary text-primary-foreground font-medium rounded-br-xs"
                    : "bg-muted/80 text-foreground border border-border/70 rounded-bl-xs"
                }`}
              >
                {/* Copy Button */}
                <button
                  onClick={() => handleCopy(msg.id, msg.content)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-md p-1 bg-background/80 hover:bg-background text-foreground shadow-xs"
                  title="Copy message"
                >
                  {copiedId === msg.id ? (
                    <Check className="size-3 text-emerald-500" />
                  ) : (
                    <Copy className="size-3" />
                  )}
                </button>

                <div className="prose prose-invert prose-xs max-w-none text-xs break-words">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      code: ({ className, children, ...props }: any) => {
                        const isInline = !className;
                        return isInline ? (
                          <code className="rounded bg-background/60 px-1 py-0.5 font-mono text-[11px] text-primary font-bold">
                            {children}
                          </code>
                        ) : (
                          <pre className="my-2 overflow-x-auto rounded-lg bg-background/90 p-2.5 font-mono text-[11px] text-foreground border border-border/60">
                            <code>{children}</code>
                          </pre>
                        );
                      },
                      ul: ({ children }) => <ul className="my-1.5 ml-4 list-disc space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="my-1.5 ml-4 list-decimal space-y-1">{children}</ol>,
                      li: ({ children }) => <li>{children}</li>,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2 rounded-2xl bg-muted/60 p-3 text-muted-foreground w-fit animate-pulse border border-border/60">
            <Sparkles className="size-4 animate-spin text-primary" />
            <span className="text-[11px] font-medium">Gemini is formulating Socratic guidance...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="px-3 py-2 border-t border-border/60 bg-background/40 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
        <button
          onClick={() => {
            setSelectedRole("evaluator");
            void handleSendMessage("Can you rate my recent submission from my profile and give detailed scoring?");
          }}
          className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 hover:bg-primary/20 px-2.5 py-1 text-[10px] font-medium text-primary shrink-0 transition-colors"
        >
          <BarChart2 className="size-3" /> Rate recent submission
        </button>

        <button
          onClick={() => {
            setSelectedRole("interviewer");
            void handleSendMessage("Analyze my complete user activity and give a high-level summary of my progress and patterns.");
          }}
          className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-card hover:bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground shrink-0 transition-colors"
        >
          <TrendingUp className="size-3" /> Complete user activity
        </button>

        {activeContext?.currentStep !== undefined && (
          <button
            onClick={() => {
              setSelectedRole("step_doubts");
              void handleSendMessage(
                `Can you explain what happens at Step ${activeContext.currentStep! + 1} (${activeContext.stepDesc || "current step"}) without spoiling the rest?`
              );
            }}
            className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 text-[10px] font-medium text-amber-300 shrink-0 transition-colors"
          >
            <HelpCircle className="size-3" /> Explain this step
          </button>
        )}

        <button
          onClick={() => {
            setSelectedRole("interviewer");
            void handleSendMessage("Nudge me on my current code: are there any subtle typing, syntax, or edge-case flaws?");
          }}
          className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-card hover:bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground shrink-0 transition-colors"
        >
          <Sparkles className="size-3" /> Nudge my code
        </button>

        <button
          onClick={() => {
            setSelectedRole("mistake_analyzer");
            void handleSendMessage("What are my recurring typing and syntax traps across recent attempts?");
          }}
          className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-card hover:bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground shrink-0 transition-colors"
        >
          <AlertTriangle className="size-3" /> Common mistakes
        </button>
      </div>

      {/* Input Form */}
      <div className="p-3 border-t border-border/80 bg-card/90 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSendMessage();
          }}
          className="relative flex items-end gap-2"
        >
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedRole === "interviewer"
                ? "Ask your doubt or code question (I will nudge, not spoil)..."
                : "Ask anything about the problem, step, or your attempts..."
            }
            rows={2}
            className="w-full resize-none rounded-xl border border-border/80 bg-background/80 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || loading}
            className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            title="Send message (Enter)"
          >
            <Send className="size-4" />
          </button>
        </form>
        <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground px-1">
          <span>Shift + Enter for new line • Enter to submit</span>
          <span className="font-mono text-[9px] text-primary">Zero Spoilers Mode</span>
        </div>
      </div>
    </aside>
  );
}
