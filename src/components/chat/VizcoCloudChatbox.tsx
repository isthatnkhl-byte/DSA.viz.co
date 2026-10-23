import React, { useState, useEffect, useRef, useCallback } from "react";
import { AiWord } from "@/components/brand/AiWord";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "motion/react";
import {
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
  RefreshCw,
  Bug,
  SlidersHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import { useChat } from "@/context/ChatContext";
import { useAuth } from "@/hooks/useAuth";
import { getAuth } from "firebase/auth";
import { getAuthHeaders } from "@/lib/api-client";
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

function ChatCodeBlock({
  language,
  value,
}: {
  language?: string;
  value: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success("Code copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const displayLang = (language || "code").toUpperCase();

  return (
    <div className="my-2.5 rounded-xl overflow-hidden border border-zinc-700/60 bg-zinc-950 text-zinc-100 shadow-md">
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900/90 border-b border-zinc-800 text-[10px] font-mono text-zinc-400 select-none">
        <span className="flex items-center gap-1.5 font-bold text-zinc-300">
          <Code2 className="size-3 text-primary" />
          {displayLang}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 rounded-md px-2 py-0.5 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="size-3 text-emerald-400" />
              <span className="text-[10px] text-emerald-400 font-semibold">Copied</span>
            </>
          ) : (
            <>
              <Copy className="size-3" />
              <span className="text-[10px]">Copy code</span>
            </>
          )}
        </button>
      </div>
      <div className="p-3 overflow-x-auto text-[11px] font-mono leading-relaxed selection:bg-primary/30 scrollbar-thin">
        <pre className="!m-0 !p-0 bg-transparent whitespace-pre">
          <code>{value}</code>
        </pre>
      </div>
    </div>
  );
}

export function VizcoCloudChatbox() {
  const { isOpen, closeChat, activeContext, clearContext, setCustomContext } = useChat();
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "vizco_welcome",
      role: "assistant",
      content:
        "Hello! I am **Vizco Buddy**, your interactive 3D AI companion for DSA.viz.co! ✨\n\nI have complete freedom to help you with anything related to Data Structures & Algorithms—whether you want full optimal code implementations in C++, Python, or Java, step-by-step state traces, Big-O proofs, bug diagnosis, or interview preparation.\n\nAsk me anything or choose a quick prompt below!",
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
    "interviewer" | "solutions" | "step_doubts" | "evaluator" | "mistake_analyzer"
  >("interviewer");

  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Custom Context management state
  const [showContextManager, setShowContextManager] = useState(false);
  const [customProblemTitle, setCustomProblemTitle] = useState("");
  const [customGoal, setCustomGoal] = useState("");
  const [customUserCode, setCustomUserCode] = useState("");

  // Sync inputs when activeContext changes
  useEffect(() => {
    if (activeContext) {
      if (activeContext.problemTitle) setCustomProblemTitle(activeContext.problemTitle);
      if (activeContext.customGoal) setCustomGoal(activeContext.customGoal);
      if (activeContext.userCode) setCustomUserCode(activeContext.userCode);
    }
  }, [activeContext]);

  // Keyboard shortcut to close chat on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        closeChat();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeChat]);

  const handleRemoveContext = () => {
    clearContext();
    setCustomProblemTitle("");
    setCustomGoal("");
    setCustomUserCode("");
    setShowContextManager(false);
    toast.success("Context detached. Vizco Buddy is now in freeform mode!");
  };

  const handleApplyCustomContext = () => {
    if (!customProblemTitle.trim() && !customGoal.trim() && !customUserCode.trim()) {
      toast.error("Please enter a title, goal, or code snippet for your custom context.");
      return;
    }
    setCustomContext({
      problemTitle: customProblemTitle.trim() || "Custom Topic",
      customGoal: customGoal.trim() || undefined,
      userCode: customUserCode.trim() || undefined,
      isCustom: true,
      route: "Custom Context",
    });
    setShowContextManager(false);
    toast.success("Custom context applied to Vizco Buddy!");
  };

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
          "Conversation reset! ✨ What algorithm puzzle, code question, or simulation step can I help you with?",
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

          const authHeaders = await getAuthHeaders();
          const res = await fetch("/api/chat", {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              ...(idToken ? { Authorization: "Bearer " + idToken } : {}),
              ...authHeaders,
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
        // Offline reply fallback
        const fallbackReply = generateClientOfflineSocraticReply({
          role: selectedRole,
          lastUserMessage: text,
          context: activeContext || {},
        });

        const fallbackMsg: Message = {
          id: "bot_offline_" + Date.now(),
          role: "assistant",
          content: fallbackReply + "\n\n*Note: Operating in offline fallback mode.*",
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
        content: fallbackReply + "\n\n*Note: Local offline assistant response.*",
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

  const handleRegenerate = async () => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUserMsg || loading) return;
    await handleSendMessage(lastUserMsg.content);
  };

  // Generate contextual quick-action chips
  const getContextualChips = () => {
    const chips: { label: string; prompt: string; role?: typeof selectedRole }[] = [];

    if (activeContext?.currentStep !== undefined) {
      const stepIdx = activeContext.currentStep + 1;
      chips.push({
        label: "🔍 Explain Step " + stepIdx,
        prompt: `Can you explain what happens in Step ${stepIdx} and why the pointers or state changed?`,
        role: "step_doubts",
      });
      chips.push({
        label: "🔄 Invariant check",
        prompt: `What invariant is maintained across Step ${stepIdx}?`,
        role: "step_doubts",
      });
    }

    if (activeContext?.problemTitle) {
      chips.push({
        label: "⚡ Optimal C++ Code",
        prompt: `Can you give me the optimal C++ solution for ${activeContext.problemTitle} with clear code and complexity analysis?`,
        role: "solutions",
      });
      chips.push({
        label: "🐍 Python Solution",
        prompt: `Can you provide the clean, optimal Python solution for ${activeContext.problemTitle}?`,
        role: "solutions",
      });
      chips.push({
        label: "💡 Core Intuition",
        prompt: `What is the core intuition, mental model, and algorithmic pattern behind ${activeContext.problemTitle}?`,
        role: "interviewer",
      });
      chips.push({
        label: "⚠️ Edge Cases & Traps",
        prompt: `What are the top edge cases, boundary conditions, and common pitfalls for ${activeContext.problemTitle}?`,
        role: "mistake_analyzer",
      });
      chips.push({
        label: "📊 Complexity Breakdown",
        prompt: `Can you analyze the exact Time and Space complexities for the optimal approach to ${activeContext.problemTitle}?`,
        role: "evaluator",
      });
    }

    if (activeContext?.userCode || activeContext?.route?.includes("/compiler")) {
      chips.push({
        label: "🛠️ Debug My Code",
        prompt: "Can you analyze my code for bugs, off-by-one errors, memory pitfalls, or syntax mistakes?",
        role: "mistake_analyzer",
      });
      chips.push({
        label: "🚀 Optimize Code",
        prompt: "Can this code be optimized for better Big-O time or space performance?",
        role: "evaluator",
      });
    }

    if (chips.length === 0) {
      chips.push({
        label: "🗺️ Top 10 DSA Patterns",
        prompt: "What are the top 10 algorithmic patterns every software engineer must master for technical interviews?",
      });
      chips.push({
        label: "💡 Dynamic Programming Guide",
        prompt: "How can I systematically learn and master Dynamic Programming from 1D to 2D state transitions?",
      });
      chips.push({
        label: "⚡ Two Pointers vs Sliding Window",
        prompt: "Explain the key differences between Two Pointers and Sliding Window techniques with examples.",
      });
      chips.push({
        label: "📊 Review My Submissions",
        prompt: "Can you review my recent solved problems and rate my consistency and progress?",
        role: "evaluator",
      });
    }

    return chips.slice(0, 5);
  };

  const ROLES = [
    { id: "interviewer" as const, label: "💡 Coach", desc: "Intuition & Guidance" },
    { id: "solutions" as const, label: "⚡ Solutions", desc: "Optimal Code" },
    { id: "step_doubts" as const, label: "🔍 Step Doubts", desc: "Visualizer State" },
    { id: "mistake_analyzer" as const, label: "🛠️ Bug Hunter", desc: "Debug Code" },
    { id: "evaluator" as const, label: "📊 Reviewer", desc: "Complexity & Rating" },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-end justify-end sm:p-5">
          {/* Subtle backdrop scrim on mobile */}
          <motion.div
            key="chatbox-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeChat}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs pointer-events-auto sm:hidden"
          />

          {/* Interactive Chatbox Container */}
          <motion.aside
            key="chatbox-window"
            role="dialog"
            aria-modal="true"
            aria-label="Vizco Buddy AI Companion"
            initial={{ opacity: 0, y: 40, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className={
              "relative pointer-events-auto flex flex-col bg-card/95 backdrop-blur-3xl border border-primary/25 shadow-[0_20px_70px_-15px_rgba(0,0,0,0.5)] rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden transition-all duration-300 " +
              (isExpanded
                ? "w-full md:w-[760px] h-[92vh]"
                : "w-full sm:w-[490px] h-[670px] max-h-[92vh]")
            }
          >
            {/* Glowing Top Accent Border */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent pointer-events-none" />

            {/* Header Bar */}
            <div className="relative z-10 flex items-center justify-between border-b border-border/70 px-4 sm:px-5 py-3.5 bg-muted/40 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-3">
                {/* Mini 3D Vizco Buddy */}
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
                  <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1.5">
                    <span className="flex items-center gap-1 text-emerald-500 font-semibold">
                      <span className="size-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                      Live Assistant
                    </span>
                    <span>•</span>
                    <span>Interactive DSA Intelligence</span>
                  </p>
                </div>
              </div>

              {/* Window Controls */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleClearChat}
                  title="Reset conversation"
                  className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                >
                  <RotateCcw className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  title={isExpanded ? "Collapse width" : "Expand width"}
                  className="hidden sm:inline-flex rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                >
                  {isExpanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                </button>
                <button
                  type="button"
                  onClick={closeChat}
                  title="Close chat (Esc)"
                  aria-label="Close chat window"
                  className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                >
                  <X className="size-4.5" />
                </button>
              </div>
            </div>

            {/* Interactive Role Selector Bar */}
            <div className="relative z-10 flex items-center justify-between gap-2 border-b border-border/60 px-4 py-2 bg-background/60 text-xs shrink-0">
              <div className="flex items-center gap-1 overflow-x-auto py-0.5 scrollbar-none">
                {ROLES.map((r) => {
                  const isActive = selectedRole === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedRole(r.id)}
                      className={
                        "px-2.5 py-1 rounded-xl text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap " +
                        (isActive
                          ? "bg-primary text-primary-foreground font-bold shadow-xs scale-100"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground")
                      }
                      title={r.desc}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>

              {/* Model Switcher */}
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value as any)}
                className="rounded-lg border border-border/70 bg-card px-2 py-1 font-mono text-[10px] text-muted-foreground hover:text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer shrink-0"
                title="Select AI Model"
                aria-label="Select AI Model"
              >
                <option value="gemini-3.8-flash">Gemini 3.8 Flash</option>
                <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro</option>
                <option value="gemini-3.1-flash-lite">Gemini 3.1 Lite</option>
              </select>
            </div>

            {/* Interactive Active Context Banner & Remove Context Controls */}
            {(activeContext?.problemTitle || activeContext?.currentStep !== undefined || activeContext?.route || activeContext?.userCode || activeContext?.customGoal) ? (
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-b border-primary/20 bg-primary/5 px-4 py-1.5 text-[11px] text-primary shrink-0">
                <div className="flex items-center gap-1.5 truncate max-w-[65%] sm:max-w-[70%]">
                  <AiWord className="size-3 shrink-0 text-accent animate-spin-slow" />
                  <span className="font-semibold truncate">
                    {activeContext.problemTitle || activeContext.problemSlug || "Active on " + (activeContext.route || "DSA.viz")}
                  </span>
                  {activeContext.difficulty && (
                    <span
                      className={
                        "rounded-full border px-1.5 py-0.1 font-mono text-[9px] font-bold uppercase " +
                        (activeContext.difficulty.toLowerCase() === "easy"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          : activeContext.difficulty.toLowerCase() === "hard"
                          ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                          : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30")
                      }
                    >
                      {activeContext.difficulty}
                    </span>
                  )}
                  {activeContext.currentStep !== undefined && (
                    <span className="rounded-full bg-primary/20 px-2 py-0.2 font-mono text-[10px] font-bold text-primary">
                      Step {activeContext.currentStep + 1}
                      {activeContext.totalSteps ? " / " + activeContext.totalSteps : ""}
                    </span>
                  )}
                  {activeContext.userCode && (
                    <span className="rounded-full bg-accent/15 px-2 py-0.2 font-mono text-[9px] font-semibold text-accent truncate max-w-[90px]">
                      Code ({activeContext.userCode.length}c)
                    </span>
                  )}
                  {activeContext.isCustom && (
                    <span className="rounded-full bg-primary/25 border border-primary/40 px-1.5 py-0.1 font-mono text-[9px] font-bold text-primary">
                      Custom
                    </span>
                  )}
                </div>

                {/* Context Action Controls: Custom Context & Remove Context */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowContextManager((prev) => !prev)}
                    className="flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                    title="Provide your own custom context"
                  >
                    <SlidersHorizontal className="size-2.5" />
                    <span>{showContextManager ? "Close" : "Custom"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveContext}
                    className="flex items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive hover:bg-destructive/20 transition-colors cursor-pointer"
                    title="Remove context (start fresh)"
                  >
                    <Trash2 className="size-2.5" />
                    <span>Remove Context</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative z-10 flex items-center justify-between border-b border-border/40 bg-muted/20 px-4 py-1.5 text-[11px] text-muted-foreground shrink-0">
                <span className="flex items-center gap-1.5 text-[10px]">
                  <AiWord className="size-3 text-muted-foreground" />
                  <span>Freeform Mode (No attached context)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowContextManager((prev) => !prev)}
                  className="flex items-center gap-1 rounded-lg border border-border/70 bg-card px-2 py-0.5 text-[10px] font-semibold text-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                  title="Attach custom context to guide Vizco Buddy"
                >
                  <Plus className="size-3 text-primary" />
                  <span>Add Custom Context</span>
                </button>
              </div>
            )}

            {/* Context Manager Panel Drawer */}
            {showContextManager && (
              <div className="relative z-10 border-b border-primary/20 bg-card/98 p-3 sm:p-4 space-y-2.5 shadow-inner backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-primary">
                    <SlidersHorizontal className="size-3.5" />
                    <span>Agent Context & Focus Manager</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowContextManager(false)}
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title="Close context panel"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Provide custom context (problem topic, custom instructions, or code snippet) for Vizco Buddy, or remove attached context to start fresh.
                </p>

                <div className="space-y-2 pt-1">
                  <div>
                    <label className="text-[10px] font-bold text-foreground">Topic or Problem Title:</label>
                    <input
                      type="text"
                      placeholder="e.g., Two Sum, LRU Cache, Custom Graph DFS"
                      aria-label="Topic or Problem Title"
                      value={customProblemTitle}
                      onChange={(e) => setCustomProblemTitle(e.target.value)}
                      className="w-full mt-0.5 rounded-lg border border-border/80 bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-foreground">Custom Goal or Instructions:</label>
                    <input
                      type="text"
                      placeholder="e.g., Focus on recursive DP with space optimization, or review my syntax"
                      aria-label="Custom Goal or Instructions"
                      value={customGoal}
                      onChange={(e) => setCustomGoal(e.target.value)}
                      className="w-full mt-0.5 rounded-lg border border-border/80 bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-foreground">Custom Code / Notes (Optional):</label>
                    <textarea
                      rows={3}
                      placeholder="Paste your code snippet or pseudocode here..."
                      aria-label="Custom Code or Notes"
                      value={customUserCode}
                      onChange={(e) => setCustomUserCode(e.target.value)}
                      className="w-full mt-0.5 rounded-lg border border-border/80 bg-background px-2.5 py-1.5 font-mono text-[11px] text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary resize-y"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    {activeContext && (
                      <button
                        type="button"
                        onClick={handleRemoveContext}
                        className="px-2.5 py-1 text-xs font-mono font-semibold rounded-lg border border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors cursor-pointer"
                      >
                        Remove Context
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleApplyCustomContext}
                      className="px-3 py-1 text-xs font-mono font-bold rounded-lg bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors cursor-pointer"
                    >
                      Apply Custom Context
                    </button>
                  </div>
                </div>
              </div>
            )}

          {/* Scrollable Messages Thread */}
          <div className="relative z-10 flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {messages.map((msg, index) => {
              const isUser = msg.role === "user";
              const isLatestBot = !isUser && index === messages.length - 1;

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
                    className={
                      "relative group max-w-[90%] sm:max-w-[85%] " +
                      (isUser
                        ? "rounded-2xl rounded-tr-xs bg-gradient-to-r from-primary via-primary/95 to-primary/90 text-primary-foreground px-4 py-3 shadow-md shadow-primary/20"
                        : "rounded-2xl rounded-tl-xs bg-muted/60 dark:bg-muted/40 border border-border/80 px-4 py-3.5 text-foreground shadow-sm backdrop-blur-md")
                    }
                  >
                    {!isUser && (
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isLatestBot && !loading && (
                          <button
                            type="button"
                            onClick={handleRegenerate}
                            className="p-1 rounded-md bg-card/80 text-muted-foreground hover:text-foreground border border-border/50 transition-colors cursor-pointer"
                            title="Regenerate response"
                          >
                            <RefreshCw className="size-3" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="p-1 rounded-md bg-card/80 text-muted-foreground hover:text-foreground border border-border/50 transition-colors cursor-pointer"
                          title="Copy message"
                        >
                          {copiedId === msg.id ? (
                            <Check className="size-3 text-emerald-500" />
                          ) : (
                            <Copy className="size-3" />
                          )}
                        </button>
                      </div>
                    )}

                    <div className="prose prose-xs dark:prose-invert max-w-none break-words leading-relaxed">
                      <ReactMarkdown
                        components={{
                          code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || "");
                            const codeString = String(children).replace(/\n$/, "");
                            const isMultiline = codeString.includes("\n");

                            if (!inline && (match || isMultiline)) {
                              return (
                                <ChatCodeBlock
                                  language={match ? match[1] : undefined}
                                  value={codeString}
                                />
                              );
                            }

                            return (
                              <code
                                className="rounded-md bg-primary/10 border border-primary/20 px-1.5 py-0.5 font-mono text-[11px] text-primary font-semibold"
                                {...props}
                              >
                                {children}
                              </code>
                            );
                          },
                          table({ children }) {
                            return (
                              <div className="my-2 overflow-x-auto rounded-lg border border-border/70">
                                <table className="min-w-full divide-y divide-border/60 text-left text-[11px]">
                                  {children}
                                </table>
                              </div>
                            );
                          },
                          th({ children }) {
                            return <th className="bg-muted/70 px-3 py-1.5 font-bold">{children}</th>;
                          },
                          td({ children }) {
                            return <td className="border-t border-border/50 px-3 py-1.5">{children}</td>;
                          },
                          blockquote({ children }) {
                            return (
                              <blockquote className="my-2 border-l-2 border-primary/60 bg-primary/5 pl-3 py-1 italic text-muted-foreground rounded-r-md">
                                {children}
                              </blockquote>
                            );
                          },
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Quick Starter Cards on Welcome Message */}
            {messages.length === 1 && messages[0]?.id === "vizco_welcome" && (
              <div className="pt-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Interactive Prompts
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole("solutions");
                      handleSendMessage(
                        activeContext?.problemTitle
                          ? `Show me the optimal solution for "${activeContext.problemTitle}" with clean code and Big-O complexity.`
                          : "Can you provide the optimal solution template for Two Pointers in C++?"
                      );
                    }}
                    className="flex flex-col items-start p-3 rounded-xl border border-primary/20 bg-muted/40 hover:bg-primary/10 hover:border-primary/40 text-left transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-foreground group-hover:text-primary">
                      <Code2 className="size-3.5 text-primary" />
                      <span>{activeContext?.problemTitle ? "Optimal Code & Solution" : "Algorithm Solution"}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {activeContext?.problemTitle
                        ? `Full optimal implementation for ${activeContext.problemTitle}`
                        : "Clean code with time & space complexity"}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole("interviewer");
                      handleSendMessage(
                        activeContext?.problemTitle
                          ? `Can you explain the intuition and underlying pattern for "${activeContext.problemTitle}"?`
                          : "What are the top 10 most critical algorithmic patterns for coding interviews?"
                      );
                    }}
                    className="flex flex-col items-start p-3 rounded-xl border border-primary/20 bg-muted/40 hover:bg-primary/10 hover:border-primary/40 text-left transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-foreground group-hover:text-primary">
                      <Brain className="size-3.5 text-accent" />
                      <span>Core Intuition & Pattern</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Mental model, invariant, and trade-off comparison
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole("mistake_analyzer");
                      handleSendMessage(
                        activeContext?.problemTitle
                          ? `What are the most common edge cases, traps, and off-by-one errors for "${activeContext.problemTitle}"?`
                          : "What are the most common off-by-one errors in binary search and two pointers?"
                      );
                    }}
                    className="flex flex-col items-start p-3 rounded-xl border border-primary/20 bg-muted/40 hover:bg-primary/10 hover:border-primary/40 text-left transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-foreground group-hover:text-primary">
                      <Bug className="size-3.5 text-rose-500" />
                      <span>Edge Cases & Bug Traps</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Boundary guards, integer overflow, and indexing pitfalls
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole("evaluator");
                      handleSendMessage(
                        activeContext?.problemTitle
                          ? `Can you break down the Time and Space complexity for "${activeContext.problemTitle}"?`
                          : "How do you systematically analyze time and space complexity with Big-O?"
                      );
                    }}
                    className="flex flex-col items-start p-3 rounded-xl border border-primary/20 bg-muted/40 hover:bg-primary/10 hover:border-primary/40 text-left transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-foreground group-hover:text-primary">
                      <Activity className="size-3.5 text-emerald-500" />
                      <span>Complexity & Big-O</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Rigorous asymptotic analysis and space optimizations
                    </p>
                  </button>
                </div>
              </div>
            )}

            {/* Interactive Loading Indicator */}
            {loading && (
              <div className="flex flex-col items-start gap-1">
                <div className="flex items-center gap-1.5 px-1.5 text-[10px] text-muted-foreground">
                  <span className="font-semibold text-primary">Vizco Buddy</span>
                  <span>•</span>
                  <span>analyzing...</span>
                </div>
                <div className="rounded-2xl rounded-tl-xs bg-muted/60 border border-primary/20 px-4 py-3 text-foreground flex items-center gap-3 shadow-sm">
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
                    {selectedRole === "solutions"
                      ? "Formulating optimal solution & code..."
                      : selectedRole === "step_doubts"
                      ? "Tracing simulation step & pointer transitions..."
                      : selectedRole === "mistake_analyzer"
                      ? "Inspecting logic & hunting edge-case traps..."
                      : "Synthesizing algorithmic insight..."}
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Contextual Quick-Chip Suggestions */}
          <div className="relative z-10 px-4 py-1.5 bg-background/50 border-t border-border/40 shrink-0 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
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

          {/* Interactive Input Composer */}
          <div className="relative z-10 p-3 sm:p-4 bg-muted/40 border-t border-border/60 shrink-0">
            {/* Quick Language Helpers */}
            <div className="mb-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="font-mono text-[9px] opacity-70">Ask in:</span>
              {["C++", "Python", "Java", "JavaScript"].map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => {
                    setSelectedRole("solutions");
                    setInputText((prev) =>
                      prev.trim()
                        ? `${prev} in ${lang}`
                        : `Show optimal solution for ${activeContext?.problemTitle || "this problem"} in ${lang}`
                    );
                    inputRef.current?.focus();
                  }}
                  className="rounded-md border border-border/60 bg-card/60 px-1.5 py-0.5 font-mono text-[9px] hover:border-primary/50 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                >
                  +{lang}
                </button>
              ))}
            </div>

            <div className="relative flex items-end gap-2 rounded-2xl border border-primary/30 bg-background/90 p-1.5 shadow-inner transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
              <textarea
                ref={inputRef}
                aria-label="Chat input: ask Socratic AI assistant a question or request hint"
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                }}
                onKeyDown={handleKeyDown}
                placeholder={
                  selectedRole === "solutions"
                    ? "Ask for full optimal code, templates, or implementations in any language..."
                    : selectedRole === "step_doubts"
                    ? "Ask about this simulation step, pointer transition, or variable state..."
                    : selectedRole === "mistake_analyzer"
                    ? "Ask to debug code, fix bugs, or inspect edge-case traps..."
                    : selectedRole === "evaluator"
                    ? "Ask to analyze time/space complexity or score a solution..."
                    : "Ask Vizco Buddy anything about DSA, solutions, complexity, or edge cases..."
                }
                rows={1}
                className="flex-1 max-h-32 min-h-[38px] resize-none bg-transparent px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden leading-relaxed"
              />

              {inputText.trim() && (
                <button
                  type="button"
                  onClick={() => setInputText("")}
                  className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                  title="Clear input"
                >
                  <X className="size-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || loading}
                className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 cursor-pointer"
                title="Send message (Enter)"
              >
                {loading ? (
                  <RefreshCw className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </button>
            </div>

            <div className="mt-1.5 flex items-center justify-between px-1 text-[9px] text-muted-foreground font-mono">
              <span>Press Enter to send, Shift+Enter for new line</span>
              <span className="hidden sm:inline">⚡ Context Aware & Live Sync</span>
            </div>
          </div>
        </motion.aside>
      </div>
    )}
  </AnimatePresence>
);
}
