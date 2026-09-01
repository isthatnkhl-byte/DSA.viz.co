import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Code,
  Bookmark,
  Copy,
  Check,
  Info,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  getMultiLanguageCode,
  type LineExplanation,
} from "@/lib/multiLanguageCode";

interface PseudocodeTraceInspectorProps {
  codeLines: string[];
  currentLine?: number;
  breakpoints: Set<number>;
  onToggleBreakpoint: (lineIdx: number) => void;
  onJumpToLine: (lineIdx: number) => void;
}

export function PseudocodeTraceInspector({
  codeLines,
  currentLine = 0,
  breakpoints,
  onToggleBreakpoint,
  onJumpToLine,
}: PseudocodeTraceInspectorProps) {
  const [copied, setCopied] = useState(false);
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);
  const [selectedLineInfo, setSelectedLineInfo] = useState<number | null>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  // Bundle lines and explanations directly as pseudocode
  const bundle = useMemo(() => {
    return getMultiLanguageCode(codeLines, "pseudocode");
  }, [codeLines]);

  const targetCurrentLine = useMemo(() => {
    if (currentLine === undefined || currentLine === null) return 0;
    return bundle.lineToTargetLine[currentLine] ?? currentLine;
  }, [bundle, currentLine]);

  // Keep active line scrolled smoothly into view
  useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [targetCurrentLine]);

  // Handle Copy Code to clipboard
  const handleCopyCode = async () => {
    try {
      const textToCopy = bundle.lines.join("\n");
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  // Active line explanation
  const activeExplanation: LineExplanation | undefined =
    bundle.explanations[targetCurrentLine] ||
    bundle.explanations[selectedLineInfo ?? targetCurrentLine];

  if (codeLines.length === 0) return null;

  return (
    <div className="flex flex-col rounded-2xl border border-border/80 bg-gradient-to-b from-card/90 to-background/95 p-4 shadow-sm">
      {/* Header Bar with Action Controls */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-foreground">
            <Code className="size-4 text-primary" />
            <span className="font-mono uppercase tracking-wider text-[11px]">
              Code Trace Inspector
            </span>
          </div>

          {breakpoints.size > 0 && (
            <span className="flex items-center gap-1 rounded-md bg-rose-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-rose-400 border border-rose-500/30">
              <Bookmark className="size-3 fill-rose-500 text-rose-500" />
              <span>{breakpoints.size} Breakpoints Active</span>
            </span>
          )}
        </div>

        {/* Copy Button */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopyCode}
            className="flex items-center gap-1 rounded-xl border border-border/60 bg-background/80 px-2.5 py-1.5 font-mono text-[11px] text-muted-foreground hover:text-foreground transition-all"
            title="Copy current code to clipboard"
          >
            {copied ? (
              <>
                <Check className="size-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-bold">Copied</span>
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                <span className="hidden sm:inline">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Lines Container */}
      <div className="max-h-64 overflow-y-auto rounded-xl border border-border/60 bg-background/95 p-2 font-mono text-xs shadow-inner">
        {bundle.lines.map((line, i) => {
          const isActiveLine = i === targetCurrentLine;
          const baseIndex = Object.entries(bundle.lineToTargetLine).find(
            ([, targetIdx]) => targetIdx === i,
          )?.[0];
          const hasBreakpoint = baseIndex !== undefined && breakpoints.has(Number(baseIndex));

          return (
            <div
              key={`codeline-${i}`}
              ref={isActiveLine ? activeLineRef : undefined}
              onMouseEnter={() => setHoveredLine(i)}
              onMouseLeave={() => setHoveredLine(null)}
              className={`group relative flex items-center rounded-lg px-2 py-1 transition-all duration-200 ${
                isActiveLine
                  ? "border-l-4 border-primary bg-primary/15 text-foreground font-bold constant-glow-line"
                  : "text-muted-foreground/80 hover:bg-muted/30"
              }`}
            >
              {/* Breakpoint Toggle Button on Line Number */}
              <button
                type="button"
                onClick={() => {
                  const bIdx = baseIndex !== undefined ? Number(baseIndex) : i;
                  onToggleBreakpoint(bIdx);
                }}
                className="mr-2 flex items-center justify-center size-5 rounded hover:bg-rose-500/20 transition-colors"
                title={
                  hasBreakpoint
                    ? `Clear Breakpoint at line ${i + 1}`
                    : `Set Breakpoint at line ${i + 1}`
                }
              >
                {hasBreakpoint ? (
                  <span className="size-2.5 rounded-full bg-rose-500 shadow-xs shadow-rose-500 ring-2 ring-rose-400 animate-pulse" />
                ) : (
                  <span className="size-2 rounded-full bg-transparent group-hover:bg-rose-500/40 transition-all" />
                )}
              </button>

              {/* Line Number */}
              <span
                className={`mr-3 w-5 select-none text-right font-mono text-[10px] ${
                  isActiveLine
                    ? "text-primary font-bold"
                    : hasBreakpoint
                      ? "text-rose-400 font-bold"
                      : "text-muted-foreground/50"
                }`}
              >
                {String(i + 1).padStart(2, "0")}
              </span>

              {/* Formatted Code Text with Syntax Coloring & Click-to-Jump */}
              <span
                onClick={() => {
                  const bIdx = baseIndex !== undefined ? Number(baseIndex) : i;
                  onJumpToLine(bIdx);
                }}
                className="flex-1 cursor-pointer whitespace-pre hover:underline hover:text-primary transition-colors"
                title={`Jump stepper to line ${i + 1}`}
              >
                {formatCodeSyntax(line)}
              </span>

              {/* Line Explanation Trigger Icon */}
              {bundle.explanations[i] && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedLineInfo(selectedLineInfo === i ? null : i);
                  }}
                  className={`ml-1.5 flex items-center justify-center size-4 rounded text-muted-foreground/60 hover:text-primary transition-colors ${
                    isActiveLine ? "text-primary font-bold" : "opacity-0 group-hover:opacity-100"
                  }`}
                  title="View algorithmic invariant & complexity explanation for this line"
                >
                  <Info className="size-3" />
                </button>
              )}

              {isActiveLine && (
                <span className="ml-1.5 size-2 rounded-full bg-primary shadow-xs shadow-primary animate-pulse" />
              )}
            </div>
          );
        })}
      </div>

      {/* Algorithmic Invariant & Step Explanation Drawer */}
      {activeExplanation && (
        <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-3 font-mono text-xs animate-fade">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <Sparkles className="size-3.5 text-primary" />
              <span>{activeExplanation.title}</span>
            </div>
            {activeExplanation.complexity && (
              <span className="rounded-md bg-accent/20 border border-accent/30 px-2 py-0.5 text-[10px] font-bold text-accent">
                {activeExplanation.complexity}
              </span>
            )}
          </div>

          {activeExplanation.invariant && (
            <div className="mt-1.5 text-[11px] text-primary/90 font-medium flex items-center gap-1">
              <Zap className="size-3 shrink-0 text-primary" />
              <span>
                <strong>Invariant:</strong> {activeExplanation.invariant}
              </span>
            </div>
          )}

          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground font-sans">
            {activeExplanation.rationale}
          </p>
        </div>
      )}

      {/* Footer Helper Text */}
      <div className="mt-2.5 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
        <span className="hidden sm:inline text-muted-foreground/60">
          Click line number to set Breakpoint • Click code to jump stepper • Click (i) for line invariant
        </span>
        <span>
          Line {targetCurrentLine + 1} of {bundle.lines.length}
        </span>
      </div>
    </div>
  );
}

/**
 * Lightweight syntax highlighter applying token colors for keywords, numbers, and types
 */
function formatCodeSyntax(line: string): React.ReactNode {
  if (!line || line.trim().length === 0) return "\u00a0";

  // Check for comments
  if (line.trim().startsWith("#") || line.trim().startsWith("//")) {
    return <span className="text-muted-foreground/60 italic">{line}</span>;
  }

  // Tokenize words
  const parts = line.split(/(\b(?:def|function|class|public|int|void|return|while|for|if|else|elif|const|let|var|new|this|vector|unordered_map|Map|Set|List|ArrayList|HashMap|HashSet|true|false|null|None|and|or|not)\b|[0-9]+|"[^"]*"|'[^']*'|[{}()[\];,=<>+*\-/])/g);

  return (
    <span>
      {parts.map((part, idx) => {
        if (!part) return null;
        if (
          /^(?:def|function|class|public|void|return|while|for|if|else|elif|const|let|var|new|this|and|or|not)$/.test(
            part,
          )
        ) {
          return (
            <span key={idx} className="text-purple-400 font-semibold">
              {part}
            </span>
          );
        }
        if (
          /^(?:int|vector|unordered_map|Map|Set|List|ArrayList|HashMap|HashSet|true|false|null|None)$/.test(
            part,
          )
        ) {
          return (
            <span key={idx} className="text-cyan-400 font-semibold">
              {part}
            </span>
          );
        }
        if (/^[0-9]+$/.test(part)) {
          return (
            <span key={idx} className="text-amber-400">
              {part}
            </span>
          );
        }
        if (/^"[^"]*"|'[^']*'$/.test(part)) {
          return (
            <span key={idx} className="text-emerald-400">
              {part}
            </span>
          );
        }
        if (/^[{}()[\];,]$/.test(part)) {
          return (
            <span key={idx} className="text-muted-foreground">
              {part}
            </span>
          );
        }
        return <span key={idx}>{part}</span>;
      })}
    </span>
  );
}
