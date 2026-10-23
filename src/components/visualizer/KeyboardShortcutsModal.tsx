import React from "react";
import { AiWord } from "@/components/brand/AiWord";
import { Keyboard, X, Command } from "lucide-react";
import { Button } from "@/components/ui/button";

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
  category: "Playback" | "Navigation" | "Inspection";
}

const SHORTCUTS: ShortcutItem[] = [
  { keys: ["Space"], description: "Play / Pause playback", category: "Playback" },
  { keys: ["→", "Right Arrow"], description: "Step Forward (+1)", category: "Navigation" },
  { keys: ["←", "Left Arrow"], description: "Step Backward (-1)", category: "Navigation" },
  { keys: ["Home"], description: "Jump to First Step", category: "Navigation" },
  { keys: ["End"], description: "Jump to Final Step", category: "Navigation" },
  { keys: ["R"], description: "Reset to Step 0", category: "Playback" },
  { keys: ["L"], description: "Toggle Continuous Loop Mode", category: "Playback" },
  { keys: ["B"], description: "Jump to Next Breakpoint", category: "Inspection" },
  { keys: ["M"], description: "Toggle Cinematic Motion Blur", category: "Inspection" },
  { keys: ["1", "2", "3"], description: "Switch Dataset / Speed Preset", category: "Playback" },
  { keys: ["?"], description: "Toggle this Shortcuts Guide", category: "Inspection" },
];

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  const categories = ["Playback", "Navigation", "Inspection"] as const;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-5 shadow-2xl backdrop-blur-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/20 text-primary border border-primary/30">
              <Keyboard className="size-4" />
            </div>
            <div>
              <h3 className="font-mono text-sm font-bold text-foreground">Keyboard Shortcuts</h3>
              <p className="text-[11px] text-muted-foreground">Interactive visualizer hotkeys</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="size-7 rounded-lg" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="mt-4 flex flex-col gap-4 max-h-[65vh] overflow-y-auto pr-1">
          {categories.map((cat) => {
            const items = SHORTCUTS.filter((s) => s.category === cat);
            return (
              <div key={cat} className="flex flex-col gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                  {cat}
                </span>
                <div className="flex flex-col gap-1.5 rounded-xl border border-border/50 bg-background/50 p-2">
                  {items.map((item) => (
                    <div
                      key={item.description}
                      className="flex items-center justify-between gap-3 px-2 py-1 text-xs"
                    >
                      <span className="text-foreground/90">{item.description}</span>
                      <div className="flex items-center gap-1">
                        {item.keys.map((k) => (
                          <kbd
                            key={k}
                            className="rounded-md border border-border/80 bg-muted/80 px-2 py-0.5 font-mono text-[11px] font-bold text-foreground shadow-2xs"
                          >
                            {k}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-[11px] text-muted-foreground font-mono">
          <span className="flex items-center gap-1">
            <AiWord className="size-3 text-primary" />
            <span>Hotkeys active while focusing canvas</span>
          </span>
          <Button size="sm" variant="default" className="h-7 px-3 text-xs" onClick={onClose}>
            Got it
          </Button>
        </div>
      </div>
    </div>
  );
}
