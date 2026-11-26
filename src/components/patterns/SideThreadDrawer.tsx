import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  GripVertical,
  Loader2,
  MessageCircleQuestion,
  Pin,
  PinOff,
  Quote,
  RefreshCw,
  Send,
  Square,
  X,
} from "lucide-react";
import type {
  SideChatAnchor,
  SideChatThread,
} from "@/lib/master-patterns/types";

interface SideThreadDrawerProps {
  open: boolean;
  docked: boolean;
  thread: SideChatThread | null;
  pendingAnchor: SideChatAnchor | null;
  pendingQuotes: Array<{ text: string; citation?: string }>;
  activeSegmentId: string;
  streamingText: string;
  answering: boolean;
  draft: string;
  onDraftChange: (text: string) => void;
  onRemoveQuote: (index: number) => void;
  onAsk: (text: string, retry?: boolean) => Promise<void>;
  onStop: () => Promise<void>;
  onToggleDock: () => void;
  onClose: () => void;
  onJumpToCurrentStep: () => void;
  onSwitchThread?: (threadId: string) => void;
  allThreads?: SideChatThread[];
  /** Optional dictation slot mounted next to submit (filled in Wave 3). */
  dictationSlot?: React.ReactNode;
}

export const SideThreadDrawer: React.FC<SideThreadDrawerProps> = ({
  open,
  docked,
  thread,
  pendingAnchor,
  pendingQuotes,
  activeSegmentId,
  streamingText,
  answering,
  draft,
  onDraftChange,
  onRemoveQuote,
  onAsk,
  onStop,
  onToggleDock,
  onClose,
  onJumpToCurrentStep,
  onSwitchThread,
  allThreads = [],
  dictationSlot,
}) => {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const draggingRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [thread?.messages.length, streamingText, open]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = draggingRef.current;
      if (!drag) return;
      const nx = Math.max(
        8,
        Math.min(drag.origX + (e.clientX - drag.startX), window.innerWidth - 360),
      );
      const ny = Math.max(
        8,
        Math.min(drag.origY + (e.clientY - drag.startY), window.innerHeight - 160),
      );
      setPos({ x: nx, y: ny });
    };
    const onUp = () => {
      draggingRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  if (!open) return null;

  const displayAnchor = thread?.anchor ?? pendingAnchor;
  const isViewingOlderSegment =
    Boolean(displayAnchor) && displayAnchor!.segmentId !== activeSegmentId;
  const lastMsg = thread?.messages.at(-1);
  const canRetry = Boolean(
    !answering && lastMsg?.role === "assistant" && lastMsg.error,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = draft.trim();
    if (!cleaned || answering) return;
    await onAsk(cleaned, false);
  };

  const panelBody = (
    <div
      className={`flex flex-col border-2 border-primary bg-card shadow-[6px_6px_0px_0px_var(--border)] ${
        docked
          ? "w-full max-h-[540px]"
          : "w-[390px] max-w-[calc(100vw-24px)] h-[480px] max-h-[calc(100vh-24px)]"
      }`}
    >
      {/* Header */}
      <div
        onPointerDown={(e) => {
          if (docked) return;
          const card = e.currentTarget.parentElement;
          if (!card) return;
          const rect = card.getBoundingClientRect();
          draggingRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            origX: rect.left,
            origY: rect.top,
          };
        }}
        className={`flex items-center justify-between gap-2 border-b border-border bg-primary/10 px-3 py-2 ${
          docked ? "" : "cursor-grab active:cursor-grabbing select-none"
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {!docked && (
            <GripVertical className="size-3.5 text-muted-foreground shrink-0" />
          )}
          <MessageCircleQuestion className="size-3.5 text-primary shrink-0" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] truncate text-primary">
            Side Companion · {displayAnchor?.kind ?? "context"}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            title={docked ? "Unpin to float" : "Dock in side rail"}
            onClick={onToggleDock}
            className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            {docked ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
          </button>
          <button
            type="button"
            title="Close side conversation"
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-rose-500 cursor-pointer"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Segment Breadcrumb & Thread Selector */}
      <div className="border-b border-border bg-muted/30 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
        <span className="truncate text-muted-foreground">
          {displayAnchor?.title || displayAnchor?.segmentId || "Current step"}
        </span>
        <div className="flex items-center gap-2">
          {allThreads.length > 1 && onSwitchThread && (
            <select
              value={thread?.id ?? ""}
              onChange={(e) => {
                if (e.target.value) onSwitchThread(e.target.value);
              }}
              className="border border-border bg-background px-1.5 py-0.5 text-[10px]"
            >
              {allThreads.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.anchor.title?.slice(0, 22) || t.anchor.segmentId} ({t.messages.length})
                </option>
              ))}
            </select>
          )}
          {isViewingOlderSegment && (
            <button
              type="button"
              onClick={onJumpToCurrentStep}
              className="inline-flex items-center gap-1 text-primary hover:underline font-bold cursor-pointer"
            >
              Current step <ArrowRight className="size-3" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 text-xs"
      >
        {(!thread || thread.messages.length === 0) && !answering && (
          <div className="border border-dashed border-border p-3 text-muted-foreground space-y-1">
            <p className="font-mono text-[10px] uppercase font-bold text-foreground">
              Zero-Spoiler Helper
            </p>
            <p className="leading-relaxed">
              Ask why an invariant holds, trace a small counterexample, or highlight any
              sentence and click <strong>Ask</strong>. Answers automatically fold into the
              main AI context next turn without revealing open answer keys.
            </p>
          </div>
        )}

        {thread?.messages.map((msg) => (
          <div
            key={msg.id}
            className={
              msg.role === "user"
                ? "ml-auto max-w-[85%] border border-primary/40 bg-primary/10 p-2.5 space-y-1.5"
                : "border border-border bg-background p-2.5 space-y-1.5"
            }
          >
            {msg.quotes && msg.quotes.length > 0 && (
              <div className="space-y-1">
                {msg.quotes.map((q, i) => (
                  <blockquote
                    key={i}
                    className="border-l-2 border-amber-500 pl-2 text-[11px] italic text-muted-foreground line-clamp-3"
                  >
                    &ldquo;{q}&rdquo;
                  </blockquote>
                ))}
              </div>
            )}
            <p className="whitespace-pre-wrap leading-relaxed text-foreground">
              {msg.text}
            </p>
            {msg.stopped && (
              <span className="inline-block font-mono text-[9px] uppercase text-muted-foreground">
                Stopped early
              </span>
            )}
            {msg.error && (
              <span className="inline-block font-mono text-[10px] text-rose-500">
                {msg.error}
              </span>
            )}
          </div>
        ))}

        {answering && (
          <div className="border border-primary/40 bg-background p-2.5 space-y-1">
            <div className="flex items-center gap-1.5 font-mono text-[10px] text-primary">
              <Loader2 className="size-3 animate-spin" />
              Clarifying...
            </div>
            {streamingText && (
              <p className="whitespace-pre-wrap leading-relaxed text-foreground">
                {streamingText}
              </p>
            )}
          </div>
        )}

        {canRetry && (
          <button
            type="button"
            onClick={() => void onAsk("", true)}
            className="inline-flex items-center gap-1.5 border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 font-mono text-[10px] font-bold text-rose-500 hover:bg-rose-500/20 cursor-pointer"
          >
            <RefreshCw className="size-3" />
            Retry Failed Reply
          </button>
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-border bg-background p-2.5 space-y-2"
      >
        {pendingQuotes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {pendingQuotes.map((pq, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 border border-amber-500/50 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] text-amber-500 max-w-full"
              >
                <Quote className="size-2.5 shrink-0" />
                <span className="truncate max-w-[200px]">{pq.text}</span>
                <button
                  type="button"
                  onClick={() => onRemoveQuote(idx)}
                  className="hover:text-foreground cursor-pointer"
                >
                  <X className="size-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-end gap-1.5">
          <textarea
            rows={2}
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                void handleSubmit(e);
              }
            }}
            placeholder={
              pendingQuotes.length > 0
                ? "Ask about the highlighted passage..."
                : "Ask a quick side question (Enter to send)..."
            }
            className="flex-1 border border-border bg-card px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
          />
          <div className="flex flex-col gap-1">
            {dictationSlot}
            {answering ? (
              <button
                type="button"
                onClick={() => void onStop()}
                title="Stop helper reply"
                className="border border-rose-500 bg-rose-500/15 text-rose-500 p-2 hover:bg-rose-500/25 cursor-pointer"
              >
                <Square className="size-3.5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!draft.trim()}
                title="Send side question"
                className="border border-primary bg-primary text-primary-foreground p-2 disabled:opacity-40 cursor-pointer"
              >
                <Send className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );

  if (docked) return panelBody;

  return (
    <div
      style={
        pos
          ? { position: "fixed", left: pos.x, top: pos.y, zIndex: 60 }
          : { position: "fixed", right: 20, bottom: 20, zIndex: 60 }
      }
    >
      {panelBody}
    </div>
  );
};
