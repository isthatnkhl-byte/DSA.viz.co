import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Send,
  X,
  RotateCcw,
  Check,
  Copy,
  Lightbulb,
  Maximize2,
  Minimize2,
  Code2,
  Brain,
  HelpCircle,
  FileCode,
  Terminal,
  Activity,
  Layers,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { useChat } from "@/context/ChatContext";
import { useAuth } from "@/hooks/useAuth";
import { getAuth } from "firebase/auth";
import { toast } from "sonner";
import { generateClientOfflineSocraticReply } from "@/lib/client-socratic-chat";
import { VizcoBuddyAvatar } from "@/components/brand/VizcoBuddyAvatar";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  modelUsed?: string;
}

export function VizcoCloudChatbox() {
  const { isOpen, closeChat, activeContext } = useChat();
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "vizco_welcome",
      role: "assistant",
      content:
        "Hello! I am **Vizco Buddy**, your 3D AI companion and Socratic DSA Mentor! ☁️✨\n\nI float beside you across all 1500+ algorithms, the online C++ sandbox, and your interview practice. Ask me about simulation steps, code edge-cases, invariants, or complexity!",
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
    "interviewer" | "step_doubts" | "evaluator" | "mistake_analyzer"
  >("interviewer");

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
      setTimeout(() => inputRef.current?.focus(), 160);
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
        id: "vizco_cleared",
        role: "assistant",
        content:
          "Clouds cleared! ☁️ What algorithm puzzle or simulation step can I help guide you through right now?",
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
        .filter((m) => m.id !== "vizco_welcome" && m.id !== "vizco_cleared")
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      let data: any = null;

      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 20000);

          const res = await fetch("/api/chat", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(idToken ? { Authorization: "Bearer " + idToken } : {}),
            },
            body: JSON.stringify({
              messages: apiMessages.length ? apiMessages : [{ role: "user", content: text }],
              model: selectedModel,
              role: selectedRole,
              context: {
                ...(activeContext || {}),
                assistantName: "Vizco Buddy",
              },
              sessionId,
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            throw new Error(errBody.error || "Server responded with status " + res.status);
          }

          data = await res.json();
          break;
        } catch (attemptErr: any) {
          if (attempt === 0) {
            await new Promise((resolve) => setTimeout(resolve, 600));
          }
        }
      }

      if (data && data.content) {
        if (data.sessionId) {
          setSessionId(data.sessionId);
        }

        const botMsg: Message = {
          id: "bot_" + Date.now(),
          role: "assistant",
          content: data.content,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          modelUsed: data.modelUsed || selectedModel,
        };

        setMessages((prev) => [...prev, botMsg]);
      } else {
        // Seamless offline Socratic reply fallback
        const fallbackReply = generateClientOfflineSocraticReply({
          role: selectedRole,
          lastUserMessage: text,
          context: activeContext || {},
        });

        const fallbackMsg: Message = {
          id: "bot_offline_" + Date.now(),
          role: "assistant",
          content: fallbackReply + "\n\n*Note: Operating in local cloud Socratic mode.*",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          modelUsed: "vizco-offline-companion",
        };

        setMessages((prev) => [...prev, fallbackMsg]);
      }
    } catch (err: any) {
      console.error("Vizco Chat error:", err);
      const fallbackReply = generateClientOfflineSocraticReply({
        role: selectedRole,
        lastUserMessage: text,
        context: activeContext || {},
      });
      const errMsg: Message = {
        id: "err_" + Date.now(),
        role: "assistant",
        content: fallbackReply + "\n\n*Note: Local cloud mentor response.*",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        modelUsed: "vizco-offline-companion",
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

  // Generate contextual quick-action cloud chips
  const getContextualChips = () => {
    const chips: { label: string; prompt: string; role?: typeof selectedRole }[] = [];

    if (activeContext?.currentStep !== undefined) {
      const stepIdx = activeContext.currentStep + 1;
      chips.push({
        label: "🔍 Explain Step " + stepIdx,
        prompt: "Can you explain what happens in Step " + stepIdx + " and why the pointers or state changed?",
        role: "step_doubts",
      });
      chips.push({
        label: "🧠 Invariant check",
        prompt: "What invariant is this algorithm maintaining at Step " + stepIdx + "?",
        role: "interviewer",
      });
    }

    if (activeContext?.problemTitle) {
      chips.push({
        label: "💡 Socratic hint",
        prompt: "Can you provide a gentle Socratic nudge for " + activeContext.problemTitle + " without revealing the direct solution?",
        role: "interviewer",
      });
      chips.push({
        label: "⚡ Edge cases & traps",
        prompt: "What are the top edge cases (empty, duplicates, extreme bounds) for " + activeContext.problemTitle + "?",
        role: "mistake_analyzer",
      });
    }

    if (activeContext?.route?.includes("/compiler") || activeContext?.userCode) {
      chips.push({
        label: "🛠️ Analyze my code",
        prompt: "Can you analyze my code for logical pitfalls, off-by-one errors, or memory constraints?",
        role: "mistake_analyzer",
      });
    }

    if (chips.length === 0) {
      chips.push({
        label: "✨ How does DSA.viz work?",
        prompt: "Can you explain how to get the most out of DSA.viz.co visualizers and practice features?",
      });
      chips.push({
        label: "🗺️ Recommend next problem",
        prompt: "What classic algorithmic problem should I practice next?",
      });
      chips.push({
        label: "📊 Rate my progress",
        prompt: "Can you review my recent solved problems and rate my consistency?",
        role: "evaluator",
      });
    }

    return chips.slice(0, 4);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 pointer-events-none flex items-end justify-end sm:p-5">
        {/* Subtle backdrop scrim on mobile */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeChat}
          className="fixed inset-0 bg-black/30 backdrop-blur-xs pointer-events-auto sm:hidden"
        />

        {/* Cloud Chatbox Container */}
        <motion.aside
          initial={{ opacity: 0, y: 40, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.94 }}
          transition={{ type: "spring", stiffness: 280, damping: 25 }}
          aria-label="Vizco Buddy Cloud Assistant"
          className={"relative pointer-events-auto flex flex-col bg-card/95 backdrop-blur-3xl border border-primary/25 shadow-[0_20px_70px_-15px_rgba(0,0,0,0.45)] rounded-t-[2.2rem] sm:rounded-[2.5rem] overflow-hidden transition-all duration-300 " +
            (isExpanded
              ? "w-full md:w-[740px] h-[92vh]"
              : "w-full sm:w-[480px] h-[660px] max-h-[92vh]")}
        >
          {/* Cloud decoration scallops */}
          <div className="absolute -top-3 left-8 right-8 flex justify-between pointer-events-none opacity-40 dark:opacity-60">
            <div className="w-20 h-6 rounded-full bg-primary/20 blur-[3px]" />
            <div className="w-28 h-8 rounded-full bg-accent/20 blur-[4px] -mt-1" />
            <div className="w-24 h-6 rounded-full bg-primary/20 blur-[3px]" />
          </div>

          {/* Ethereal Sky & Cloud Ambient Gradient */}
          <div
            className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-60"
            style={{
              backgroundImage:
                "radial-gradient(ellipse at top left, rgba(var(--primary-rgb, 120, 119, 198), 0.18), transparent 60%), radial-gradient(ellipse at bottom right, rgba(var(--accent-rgb, 244, 114, 182), 0.12), transparent 50%)",
            }}
          />

          {/* Cloud Header Bar */}
          <div className="relative z-10 flex items-center justify-between border-b border-border/70 px-4 sm:px-5 py-3.5 bg-muted/40 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-3">
              {/* Mini 3D Vizco Buddy on Cloud */}
              <div className="relative flex size-10 items-center justify-center rounded-2xl bg-primary/15 border border-primary/30 text-primary shadow-xs">
                <VizcoBuddyAvatar
                  size="sm"
                  mood={loading ? "thinking" : "happy"}
                  showCloudBase={false}
                  showHalo={false}
                  interactive={false}
                />
                <span className="absolute -top-0.5 -right-0.5 flex size-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full size-2.5 bg-emerald-500"></span>
                </span>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm sm:text-base tracking-tight bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                    Vizco Buddy
                  </span>
                  <span className="rounded-full bg-primary/20 border border-primary/30 px-2 py-0.2 font-mono text-[9px] font-bold text-primary">
                    AI 3D
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                  <span>☁️ Floating beside you</span>
                  <span>•</span>
                  <span>Zero-spoilers coach</span>
                </p>
              </div>
            </div>

            {/* Header Window Controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClearChat}
                title="Clear clouds / reset conversation"
                className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <RotateCcw className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Collapse width" : "Expand width"}
                className="hidden sm:inline-flex rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                {isExpanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              </button>
              <button
                type="button"
                onClick={closeChat}
                title="Return Vizco Buddy to float"
                className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="size-4.5" />
              </button>
            </div>
          </div>

          {/* Role & Model Controls Strip */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-2 bg-background/50 text-xs shrink-0">
            {/* Role Pills */}
            <div className="flex items-center gap-1 overflow-x-auto py-0.5 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedRole("interviewer")}
                className={"px-2.5 py-1 rounded-xl text-[11px] font-medium transition-all " +
                  (selectedRole === "interviewer"
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground")}
              >
                ☁️ Socratic Coach
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole("step_doubts")}
                className={"px-2.5 py-1 rounded-xl text-[11px] font-medium transition-all " +
                  (selectedRole === "step_doubts"
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground")}
              >
                🔍 Step Doubts
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole("evaluator")}
                className={"px-2.5 py-1 rounded-xl text-[11px] font-medium transition-all " +
                  (selectedRole === "evaluator"
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground")}
              >
                📊 Reviewer
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole("mistake_analyzer")}
                className={"px-2.5 py-1 rounded-xl text-[11px] font-medium transition-all " +
                  (selectedRole === "mistake_analyzer"
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground")}
              >
                🛠️ Bug Hunter
              </button>
            </div>

            {/* Model Switcher */}
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as any)}
              className="rounded-lg border border-border/70 bg-card px-2 py-1 font-mono text-[10px] text-muted-foreground hover:text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="gemini-3.8-flash">Gemini 3.8 Flash (Fast & Smart)</option>
              <option value="gemini-3.5-flash">Gemini 3.5 Flash (Balanced)</option>
              <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Deep Analysis)</option>
              <option value="gemini-3.1-flash-lite">Gemini 3.1 Lite (Speed)</option>
            </select>
          </div>

          {/* Full Frontend Live Context Banner */}
          {(activeContext?.problemTitle || activeContext?.currentStep !== undefined || activeContext?.route) && (
            <div className="relative z-10 flex items-center justify-between border-b border-primary/20 bg-primary/5 px-4 py-1.5 text-[11px] text-primary shrink-0">
              <div className="flex items-center gap-1.5 truncate">
                <Sparkles className="size-3 shrink-0 text-accent animate-spin-slow" />
                <span className="font-semibold truncate">
                  {activeContext.problemTitle || activeContext.problemSlug || "Active on " + (activeContext.route || "DSA.viz")}
                </span>
                {activeContext.currentStep !== undefined && (
                  <span className="rounded-full bg-primary/20 px-2 py-0.2 font-mono text-[10px] font-bold text-primary">
                    Step {activeContext.currentStep + 1}
                    {activeContext.totalSteps ? " / " + activeContext.totalSteps : ""}
                  </span>
                )}
                {activeContext.userCode && (
                  <span className="rounded-full bg-accent/15 px-2 py-0.2 font-mono text-[9px] font-semibold text-accent">
                    Code attached
                  </span>
                )}
              </div>
              <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest shrink-0">
                Live State Active
              </span>
            </div>
          )}

          {/* Scrollable Messages Thread */}
          <div className="relative z-10 flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className={"flex flex-col " + (isUser ? "items-end" : "items-start") + " gap-1"}
                >
                  <div className="flex items-center gap-1.5 px-1.5 text-[10px] text-muted-foreground">
                    <span className="font-semibold">{isUser ? "You" : "Vizco Buddy"}</span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                    {msg.modelUsed && (
                      <span className="font-mono text-[9px] opacity-60">({msg.modelUsed})</span>
                    )}
                  </div>

                  <div
                    className={"relative group max-w-[88%] sm:max-w-[84%] " +
                      (isUser
                        ? "rounded-[1.4rem] rounded-tr-xs bg-gradient-to-r from-primary via-primary/95 to-primary/90 text-primary-foreground px-4 py-3 shadow-md shadow-primary/20"
                        : "rounded-[1.6rem] rounded-tl-xs bg-muted/60 dark:bg-muted/40 border border-primary/20 px-4 py-3.5 text-foreground shadow-sm backdrop-blur-md")}
                  >
                    {!isUser && (
                      <button
                        type="button"
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md bg-card/80 text-muted-foreground hover:text-foreground border border-border/50"
                        title="Copy answer"
                      >
                        {copiedId === msg.id ? (
                          <Check className="size-3 text-emerald-500" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </button>
                    )}

                    <div className="prose prose-xs dark:prose-invert max-w-none break-words leading-relaxed">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex flex-col items-start gap-1">
                <div className="flex items-center gap-1.5 px-1.5 text-[10px] text-muted-foreground">
                  <span className="font-semibold">Vizco Buddy</span>
                  <span>•</span>
                  <span>thinking in clouds...</span>
                </div>
                <div className="rounded-[1.4rem] rounded-tl-xs bg-muted/60 border border-primary/20 px-4 py-3 text-foreground flex items-center gap-2.5 shadow-sm">
                  <div className="flex space-x-1.5">
                    <div className="size-2 rounded-full bg-primary animate-bounce"></div>
                    <div
                      className="size-2 rounded-full bg-accent animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                    <div
                      className="size-2 rounded-full bg-primary animate-bounce"
                      style={{ animationDelay: "0.4s" }}
                    ></div>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    Synthesizing Socratic insight...
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Cloud Quick-Chip Suggestions */}
          <div className="relative z-10 px-4 py-1.5 bg-background/40 border-t border-border/40 shrink-0 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {getContextualChips().map((chip, idx) => (
              <button
                key={idx}
                type="button"
                disabled={loading}
                onClick={() => {
                  if (chip.role) setSelectedRole(chip.role);
                  handleSendMessage(chip.prompt);
                }}
                className="shrink-0 flex items-center gap-1 rounded-full border border-primary/25 bg-card/80 hover:bg-primary/15 hover:border-primary/50 px-3 py-1 text-[10px] font-semibold text-foreground transition-all duration-200 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <span>{chip.label}</span>
              </button>
            ))}
          </div>

          {/* Cloud Pill Input Composer */}
          <div className="relative z-10 p-3 sm:p-4 bg-muted/40 border-t border-border/60 shrink-0">
            <div className="relative flex items-end gap-2 rounded-2xl border border-primary/30 bg-background/90 p-1.5 shadow-inner transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  selectedRole === "step_doubts"
                    ? "Ask Vizco about this simulation step or variable change..."
                    : "Ask Vizco Buddy anything about DSA, complexity, or edge cases..."
                }
                rows={1}
                className="flex-1 max-h-32 min-h-[38px] resize-none bg-transparent px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden leading-relaxed"
              />
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || loading}
                className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 cursor-pointer"
                title="Send message (Enter)"
              >
                <Send className="size-4" />
              </button>
            </div>
            <div className="mt-1.5 flex items-center justify-between px-1 text-[9px] text-muted-foreground font-mono">
              <span>Press Enter to send, Shift+Enter for new line</span>
              <span className="hidden sm:inline">☁️ Full Website Context Aware</span>
            </div>
          </div>
        </motion.aside>
      </div>
    </AnimatePresence>
  );
}
