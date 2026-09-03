import React from "react";
import { Bot, Sparkles } from "lucide-react";
import { useChat } from "@/context/ChatContext";

export function GeminiChatTrigger() {
  const { isOpen, openChat } = useChat();

  if (isOpen) return null;

  return (
    <button
      onClick={() => openChat()}
      aria-label="Open Gemini Socratic Interviewer"
      className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 rounded-full border border-primary/40 bg-card/90 px-4 py-2.5 text-xs font-semibold text-foreground shadow-xl shadow-black/20 backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:border-primary hover:bg-card hover:shadow-primary/25 active:scale-95 group"
    >
      <div
        className="relative flex size-6.5 items-center justify-center rounded-full text-primary-foreground shadow-xs transition-transform duration-300 group-hover:rotate-12"
        style={{ backgroundImage: "var(--gradient-primary)" }}
      >
        <Bot className="size-3.5" />
        <span className="absolute -top-0.5 -right-0.5 flex size-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
        </span>
      </div>
      <div className="flex flex-col text-left">
        <div className="flex items-center gap-1">
          <span className="font-bold text-xs">Gemini Interviewer</span>
          <span className="rounded bg-primary/15 px-1 py-0.2 font-mono text-[8px] font-extrabold text-primary">
            AI
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">Socratic Nudges &amp; Rating</span>
      </div>
    </button>
  );
}
