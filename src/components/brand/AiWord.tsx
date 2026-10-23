import React from "react";

export interface AiWordProps {
  className?: string;
  variant?: "inline" | "badge" | "chip" | "gradient" | "tag";
  size?: "xs" | "sm" | "md";
}

/**
 * Replaces the Gemini sparkle icon across the application with
 * a crisp, modern typography badge for "Ai".
 */
export function AiWord({ className = "", variant = "badge" }: AiWordProps) {
  // If className includes "size-" or "w-" or "h-", it's being used as an icon drop-in replacement
  const isIconDropin = /\b(size-\S+|w-\S+|h-\S+)\b/.test(className);

  if (isIconDropin) {
    return (
      <span
        className={`inline-flex items-center justify-center font-mono font-black text-[10px] leading-none select-none tracking-tighter ${className}`}
        aria-label="AI"
      >
        Ai
      </span>
    );
  }

  if (variant === "inline") {
    return (
      <span
        className={`font-mono font-bold tracking-tight text-primary select-none leading-none ${className}`}
        aria-label="AI"
      >
        Ai
      </span>
    );
  }

  if (variant === "chip") {
    return (
      <span
        className={`inline-flex items-center justify-center font-mono font-black tracking-tight text-[10px] leading-none px-1.5 py-0.5 rounded-sm bg-primary/20 text-primary border border-primary/40 select-none ${className}`}
        aria-label="AI"
      >
        Ai
      </span>
    );
  }

  if (variant === "gradient") {
    return (
      <span
        className={`inline-flex items-center justify-center font-mono font-black tracking-tight bg-gradient-to-r from-primary via-amber-500 to-rose-500 bg-clip-text text-transparent select-none leading-none ${className}`}
        aria-label="AI"
      >
        Ai
      </span>
    );
  }

  if (variant === "tag") {
    return (
      <span
        className={`inline-flex items-center justify-center font-mono font-bold text-[9px] uppercase tracking-wider px-1 py-0.5 rounded bg-muted text-muted-foreground border border-border select-none leading-none ${className}`}
        aria-label="AI"
      >
        Ai
      </span>
    );
  }

  // Default: sleek micro badge
  return (
    <span
      className={`inline-flex items-center justify-center font-mono font-bold text-[11px] leading-none px-1 py-0.5 rounded-xs bg-primary/15 text-primary border border-primary/30 select-none ${className}`}
      aria-label="AI"
    >
      Ai
    </span>
  );
}

export default AiWord;
