import React, { useState } from "react";
import {
  Terminal,
  RotateCcw,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle2,
  Clock,
  HardDrive,
  FileInput,
  Zap,
  Play,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { CppExecutionResult, SupportedLanguage } from "@/lib/compiler.types";

interface CppConsoleProps {
  result: CppExecutionResult | null;
  loading: boolean;
  stdin?: string;
  code?: string;
  language?: SupportedLanguage;
  onStdinChange: (val: string) => void;
  onClear: () => void;
  onRun: () => void;
}

const SAMPLE_INPUT_PRESETS: { label: string; value: string }[] = [
  { label: "Two Nums", value: "10 25" },
  { label: "Array (N=6)", value: "6\n1 4 6 8 11 15\n14" },
  { label: "3x3 Matrix", value: "3 3\n1 2 3\n4 5 6\n7 8 9" },
  { label: "Graph Edges", value: "5 4\n0 1\n1 2\n2 3\n3 4" },
];

export function CppConsole({
  result,
  loading,
  stdin = "",
  language = "cpp",
  onStdinChange,
  onClear,
  onRun,
}: CppConsoleProps) {
  const [copied, setCopied] = useState(false);
  const safeStdin = typeof stdin === "string" ? stdin : "";

  const handleCopyOutput = async () => {
    const textToCopy =
      result?.compile_output ||
      result?.stderr ||
      result?.stdout ||
      "";
    if (!textToCopy) {
      toast.info("Console is empty");
      return;
    }
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast.success("Output copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy output");
    }
  };

  const renderStatusBadge = () => {
    if (loading) {
      return (
        <span className="flex items-center gap-1.5 rounded-full border border-primary/50 bg-primary/15 px-2.5 py-0.5 font-mono text-[11px] font-bold text-primary animate-pulse">
          <Zap className="size-3 animate-spin" />
          <span>Running...</span>
        </span>
      );
    }
    if (!result) {
      return (
        <span className="rounded-full border border-border/70 bg-secondary/60 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-muted-foreground">
          Ready
        </span>
      );
    }
    if (result.status === "success") {
      return (
        <span className="flex items-center gap-1 rounded-full border border-emerald-500/50 bg-emerald-500/15 px-2.5 py-0.5 font-mono text-[11px] font-bold text-emerald-400">
          <CheckCircle2 className="size-3" />
          <span>Exit 0</span>
        </span>
      );
    }
    if (result.status === "compilation_error") {
      return (
        <span className="flex items-center gap-1 rounded-full border border-rose-500/50 bg-rose-500/15 px-2.5 py-0.5 font-mono text-[11px] font-bold text-rose-400">
          <AlertTriangle className="size-3" />
          <span>Compile Error</span>
        </span>
      );
    }
    if (result.status === "timeout") {
      return (
        <span className="flex items-center gap-1 rounded-full border border-amber-500/50 bg-amber-500/15 px-2.5 py-0.5 font-mono text-[11px] font-bold text-amber-400">
          <Clock className="size-3" />
          <span>TLE</span>
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 rounded-full border border-rose-500/50 bg-rose-500/15 px-2.5 py-0.5 font-mono text-[11px] font-bold text-rose-400">
        <AlertTriangle className="size-3" />
        <span>Exit {result.exitCode}</span>
      </span>
    );
  };

  const outputText = result?.stdout || "";
  const errorText = result?.compile_output || result?.stderr || "";

  return (
    <div className="flex flex-col h-full gap-4">
      {/* 1. Standard Output & Compiler Diagnostics Panel (Top / Primary) */}
      <div className="flex flex-col flex-1 min-h-[270px] rounded-2xl border border-border/80 bg-card/90 shadow-xl overflow-hidden backdrop-blur-xl">
        {/* Output Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 bg-secondary/45 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15 border border-primary/30 text-primary">
              <Terminal className="size-3.5" />
            </div>
            <div>
              <span className="font-mono text-xs font-bold text-foreground block leading-none">
                Output Console (stdout)
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                Live execution stream &amp; diagnostics
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {renderStatusBadge()}

            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyOutput}
              title="Copy Output"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground active:scale-95"
            >
              {copied ? (
                <Check className="size-3.5 text-emerald-400" />
              ) : (
                <Copy className="size-3.5" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              title="Clear Output"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive active:scale-95"
            >
              <RotateCcw className="size-3.5" />
            </Button>

            <Button
              size="sm"
              onClick={onRun}
              disabled={loading}
              className="h-7 px-3 font-mono text-[11px] font-bold gap-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all shadow-sm shadow-primary/20 cursor-pointer"
              title={`Run ${language.toUpperCase()} Code (Ctrl+Enter)`}
            >
              <Play className="size-3 fill-current" />
              <span>RUN</span>
            </Button>
          </div>
        </div>

        {/* Output Terminal Body */}
        <div className="flex-1 min-h-0 overflow-auto bg-[#0b0f19] p-4 font-mono text-xs sm:text-[13px] leading-relaxed text-slate-100">
          {loading ? (
            <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-3 text-slate-400">
              <div className="size-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <span className="font-mono text-xs font-bold text-primary">
                {language === "c"
                  ? "Compiling & running C17 binary..."
                  : language === "java"
                    ? "Compiling & running Java 25 bytecode..."
                    : language === "python"
                      ? "Executing Python 3.12 script..."
                      : "Compiling & running C++20 binary..."}
              </span>
            </div>
          ) : errorText ? (
            <div className="space-y-3">
              {outputText && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                    Standard Output:
                  </div>
                  <pre className="text-emerald-300 whitespace-pre-wrap select-text font-mono leading-relaxed font-medium bg-emerald-950/25 border border-emerald-500/20 rounded-xl p-3">
                    {outputText}
                  </pre>
                </div>
              )}
              <div>
                <div className="flex items-center gap-1.5 font-bold text-rose-400 text-xs mb-1.5">
                  <AlertTriangle className="size-3.5 shrink-0" />
                  <span>Compiler / Runtime Diagnostics:</span>
                </div>
                <pre className="text-rose-200 whitespace-pre-wrap select-text font-mono leading-relaxed text-xs bg-rose-950/40 p-3.5 rounded-xl border border-rose-500/30">
                  {errorText}
                </pre>
              </div>
            </div>
          ) : outputText ? (
            <pre className="text-emerald-300 whitespace-pre-wrap select-text font-mono leading-relaxed font-semibold">
              {outputText}
            </pre>
          ) : (
            <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-3 text-center text-slate-400">
              <div className="flex size-10 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/80 text-slate-400">
                <Terminal className="size-5" />
              </div>
              <div className="max-w-[240px]">
                <p className="text-xs font-semibold text-slate-300">
                  No output generated yet
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Press <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">Ctrl+Enter</kbd> or click Run to execute your {language.toUpperCase()} code.
                </p>
              </div>
              <Button
                size="sm"
                onClick={onRun}
                disabled={loading}
                className="rounded-xl font-mono text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 active:scale-95 transition-all cursor-pointer mt-1"
              >
                <Play className="size-3.5 fill-current" />
                <span>RUN {language.toUpperCase()} CODE</span>
              </Button>
            </div>
          )}
        </div>

        {/* Execution Telemetry Footer */}
        <div className="flex items-center justify-between border-t border-border/60 bg-secondary/35 px-4 py-2 font-mono text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Clock className="size-3 text-primary" />
              <strong className="text-foreground">
                {result?.executionTimeMs !== undefined ? `${result.executionTimeMs} ms` : "0 ms"}
              </strong>
            </span>
            {result?.memoryKb !== undefined && (
              <span className="flex items-center gap-1">
                <HardDrive className="size-3 text-complement" />
                <strong className="text-foreground">{result.memoryKb} KB</strong>
              </span>
            )}
          </div>
          <span className="text-[10px] font-semibold">
            {language === "c"
              ? "GCC 14.1 (C17)"
              : language === "java"
                ? "OpenJDK 25"
                : language === "python"
                  ? "Python 3.12"
                  : "GCC 14.1 (C++20)"}
          </span>
        </div>
      </div>

      {/* 2. Standard Input (stdin) Panel (Bottom of Right Column) */}
      <div className="flex flex-col rounded-2xl border border-border/80 bg-card/90 shadow-xl overflow-hidden backdrop-blur-xl shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 bg-secondary/45 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded-lg bg-accent/15 border border-accent/30 text-accent">
              <FileInput className="size-3.5" />
            </div>
            <span className="font-mono text-xs font-bold text-foreground">
              Standard Input (stdin)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {safeStdin.trim() && (
              <button
                type="button"
                onClick={() => onStdinChange("")}
                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
              >
                <Trash2 className="size-2.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Sample Input Presets Bar */}
        <div className="flex items-center gap-1.5 border-b border-border/50 bg-background/60 px-3 py-1.5 overflow-x-auto scrollbar-thin">
          <span className="font-mono text-[10px] font-bold text-muted-foreground shrink-0 flex items-center gap-1">
            <Sparkles className="size-2.5 text-primary" />
            <span>Presets:</span>
          </span>
          {SAMPLE_INPUT_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                onStdinChange(preset.value);
                toast.info(`Loaded "${preset.label}" into stdin`);
              }}
              className="rounded-md border border-border/70 bg-secondary/60 hover:border-primary/50 hover:bg-primary/15 hover:text-primary px-2 py-0.5 font-mono text-[10px] font-semibold text-foreground transition-colors shrink-0 cursor-pointer"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <Textarea
          value={safeStdin}
          onChange={(e) => onStdinChange(e.target.value)}
          placeholder={
            language === "c"
              ? "Enter custom stdin values for scanf() here..."
              : language === "java"
                ? "Enter custom stdin values for Scanner / BufferedReader here..."
                : language === "python"
                  ? "Enter custom stdin values for input() / sys.stdin here..."
                  : "Enter custom stdin values for std::cin >> here..."
          }
          className="h-[135px] resize-none rounded-none border-0 bg-[#0b0f19]/90 p-3.5 font-mono text-xs sm:text-[13px] text-slate-100 leading-relaxed focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-500"
        />

        <div className="flex items-center justify-between border-t border-border/60 bg-secondary/35 px-4 py-1.5 font-mono text-[10px] text-muted-foreground">
          <span>
            Streamed to{" "}
            <code className="text-foreground font-bold">
              {language === "c"
                ? "scanf"
                : language === "java"
                  ? "System.in"
                  : language === "python"
                    ? "sys.stdin"
                    : "std::cin"}
            </code>
          </span>
          <span>{safeStdin ? `${safeStdin.split("\n").length} line(s)` : "Empty stdin"}</span>
        </div>
      </div>
    </div>
  );
}
