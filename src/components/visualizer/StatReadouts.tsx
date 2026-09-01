import React from "react";
import { toText } from "./VisualizerTypes";
import type { Val } from "./VisualizerTypes";

export interface ReadoutItem {
  label: string;
  value: Val | null | undefined;
  highlight?: boolean;
}

export function StatReadouts({ items }: { items: ReadoutItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {items.map(({ label, value, highlight }) => (
        <div
          key={label}
          className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all duration-300 ${
            highlight
              ? "border-primary/50 bg-primary/15 shadow-sm shadow-primary/20 scale-[1.02] animate-sync-glow"
              : "border-border/80 bg-card/60"
          }`}
        >
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <span
            className={`mt-1 font-mono text-base font-bold ${
              highlight ? "text-primary" : "text-foreground"
            }`}
          >
            {toText(value)}
          </span>
        </div>
      ))}
    </div>
  );
}
