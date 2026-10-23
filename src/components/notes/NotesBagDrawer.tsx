import React from "react";
import { Link } from "@tanstack/react-router";
import { useNotesBag } from "@/context/NotesBagContext";
import {
  X,
  Trash2,
  FileText,
  Sparkles,
  ArrowRight,
  Printer,
  Code2,
  Layers,
  Palette,
  ExternalLink,
} from "lucide-react";

interface NotesBagDrawerProps {
  onOpenPdfModal?: () => void;
}

export const NotesBagDrawer: React.FC<NotesBagDrawerProps> = ({ onOpenPdfModal }) => {
  const { items, isDrawerOpen, setIsDrawerOpen, removeItem, clearBag } = useNotesBag();

  if (!isDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs font-mono animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-card border-l-4 border-border h-full flex flex-col shadow-2xl p-5 text-card-foreground overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between pb-4 border-b-2 border-border">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-primary/10 border-2 border-primary/40 flex items-center justify-center text-primary font-bold text-sm">
              🎒
            </div>
            <div>
              <h2 className="font-extrabold text-sm uppercase tracking-wider">AI Notes Bag</h2>
              <p className="text-[10px] text-muted-foreground">{items.length} items collected across sessions</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsDrawerOpen(false)}
            className="p-1.5 rounded-lg border-2 border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Action Buttons Top Strip */}
        <div className="py-3 flex items-center justify-between gap-2 border-b border-border">
          <Link
            to={"/ai-notes" as any}
            onClick={() => setIsDrawerOpen(false)}
            className="flex-1 py-2 px-3 rounded-lg border-2 border-primary bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-primary/90 transition-all cursor-pointer"
          >
            <span>Open AI Notes Dashboard</span>
            <ArrowRight className="size-3.5" />
          </Link>
          {items.length > 0 && (
            <button
              type="button"
              onClick={clearBag}
              className="p-2 rounded-lg border-2 border-border hover:border-rose-500/60 hover:text-rose-500 text-muted-foreground transition-colors cursor-pointer"
              title="Clear all collected notes"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>

        {/* Item List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5 scrollbar-thin">
          {items.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
              <span className="text-3xl mb-2">🎒</span>
              <p className="font-bold text-xs text-foreground">Your Notes Bag is Empty</p>
              <p className="text-[11px] mt-1">
                Click <strong>"Add to Notes Bag"</strong> on the Compiler, Visualizer, Smartboard, or AI Learning to collect items for your handwritten revision booklet.
              </p>
            </div>
          ) : (
            items.map((item, idx) => (
              <div
                key={item.id}
                className="p-3 rounded-lg border-2 border-border bg-background flex flex-col gap-2 relative group hover:border-primary/50 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <span className="text-primary font-mono text-[11px]">#{idx + 1}</span>
                    <span className="truncate max-w-[260px]">{item.title}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="opacity-60 hover:opacity-100 text-muted-foreground hover:text-rose-500 transition-opacity p-0.5"
                    title="Remove item"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>

                {/* Content Peek */}
                {item.codeSnippet && (
                  <pre className="text-[10px] font-mono bg-muted/60 p-2 rounded border border-border/80 text-foreground overflow-x-hidden max-h-16 line-clamp-2">
                    <code>{item.codeSnippet.slice(0, 100)}...</code>
                  </pre>
                )}

                {item.invariantText && (
                  <div className="text-[10px] font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 p-1.5 rounded border border-amber-500/30">
                    📌 {item.invariantText.slice(0, 90)}...
                  </div>
                )}

                <div className="flex items-center justify-between text-[9px] text-muted-foreground pt-1 border-t border-border/60">
                  <span className="uppercase font-semibold tracking-wider">{item.sourceType}</span>
                  <span>{new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Bottom Action: Quick Synthesis */}
        {items.length > 0 && (
          <div className="pt-3 border-t-2 border-border flex flex-col gap-2">
            <Link
              to={"/ai-notes" as any}
              onClick={() => setIsDrawerOpen(false)}
              className="w-full py-2.5 rounded-lg border-2 border-border bg-card hover:bg-muted font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer text-foreground"
            >
              <FileText className="size-4 text-primary" />
              <span>Synthesize Handwritten PDF ({items.length} items)</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
