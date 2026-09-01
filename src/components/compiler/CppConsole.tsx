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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { CppExecutionResult } from "@/lib/compiler.types";

interface CppConsoleProps {
  result: CppExecutionResult | null;
  loading: boolean;
  stdin?: string;
  code?: string;
  onStdinChange: (val: string) => void;
  onClear: () => void;
  onRun: () => void;
}

export function CppConsole({
  result,
  loading,
  stdin = "",
  onStdinChange,
  onClear,
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
        <span className="flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-primary animate-pulse">
          <Zap className="size-3 animate-spin" />
          <span>Running...</span>
        </span>
      );
    }
    if (!result) {
      return (
        <span className="rounded-full border border-border/60 bg-muted/40 px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground">
          Idle
        </span>
      );
    }
    if (result.status === "success") {
      return (
        <span className="flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-emerald-500">
          <CheckCircle2 className="size-3" />
          <span>Exit 0</span>
        </span>
      );
    }
    if (result.status === "compilation_error") {
      return (
        <span className="flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-rose-400">
          <AlertTriangle className="size-3" />
          <span>Compilation Error</span>
        </span>
      );
    }
    if (result.status === "timeout") {
      return (
        <span className="flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-amber-400">
          <Clock className="size-3" />
          <span>Timed Out</span>
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-rose-400">
        <AlertTriangle className="size-3" />
        <span>Exit {result.exitCode}</span>
      </span>
    );
  };

  const outputText = result?.stdout || "";
  const errorText = result?.compile_output || result?.stderr || "";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 1. Single Input Box (stdin) */}
      <div className="flex flex-col rounded-2xl border border-border/60 bg-card/60 shadow-lg overflow-hidden backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-border/50 bg-card/40 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <FileInput className="size-3.5 text-primary" />
            <span className="font-mono text-xs font-bold text-foreground">
              Input (stdin)
            </span>
          </div>
          {safeStdin.trim() && (
            <button
              type="button"
              onClick={() => onStdinChange("")}
              className="font-mono text-[10px] text-muted-foreground hover:text-destructive transition-colors"
            >
              Clear Input
            </button>
          )}
        </div>

        <Textarea
          value={safeStdin}
          onChange={(e) => onStdinChange(e.target.value)}
          placeholder="Enter input values for standard cin >> here..."
          className="min-h-[180px] max-h-[260px] resize-y rounded-none border-0 bg-transparent p-4 font-mono text-xs leading-relaxed focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/40"
        />

        <div className="border-t border-border/40 bg-muted/20 px-4 py-1.5 font-mono text-[10px] text-muted-foreground">
          Passed to <code className="text-foreground font-semibold">std::cin</code> on Run
        </div>
      </div>

      {/* 2. Single Output Box (stdout & diagnostics) */}
      <div className="flex flex-col rounded-2xl border border-border/60 bg-card/60 shadow-lg overflow-hidden backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-border/50 bg-card/40 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Terminal className="size-3.5 text-primary" />
            <span className="font-mono text-xs font-bold text-foreground">
              Output (stdout)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {renderStatusBadge()}

            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyOutput}
              title="Copy Output"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground active:scale-95"
            >
              {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              title="Clear Output"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive active:scale-95"
            >
              <RotateCcw className="size-3" />
            </Button>
          </div>
        </div>

        <div className="min-h-[180px] max-h-[260px] overflow-auto p-4 font-mono text-xs leading-relaxed">
          {loading ? (
            <div className="flex min-h-[140px] flex-col items-center justify-center gap-2 text-muted-foreground">
              <div className="size-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <span className="font-mono text-xs text-primary">Executing C++ code...</span>
            </div>
          ) : errorText ? (
            <div className="space-y-2">
              {outputText && (
                <pre className="text-foreground whitespace-pre-wrap select-text font-mono leading-6 font-medium">
                  {outputText}
                </pre>
              )}
              <div className="flex items-center gap-1.5 font-bold text-rose-400 text-[11px] pt-1">
                <AlertTriangle className="size-3.5 shrink-0" />
                <span>Compiler / Runtime Diagnostics:</span>
              </div>
              <pre className="text-rose-600 dark:text-rose-300 whitespace-pre-wrap select-text font-mono leading-5 text-[11px] bg-rose-500/10 dark:bg-rose-950/20 p-2.5 rounded-lg border border-rose-500/20">
                {errorText}
              </pre>
            </div>
          ) : outputText ? (
            <pre className="text-emerald-600 dark:text-emerald-300 whitespace-pre-wrap select-text font-mono leading-6 font-medium">
              {outputText}
            </pre>
          ) : (
            <div className="flex min-h-[140px] flex-col items-center justify-center gap-1.5 text-center text-muted-foreground/50">
              <Terminal className="size-6 text-muted-foreground/30" />
              <p className="text-xs">No output yet. Click &quot;Run Code&quot; (Ctrl+Enter) to execute.</p>
            </div>
          )}
        </div>

        {/* Telemetry info */}
        <div className="flex items-center justify-between border-t border-border/40 bg-muted/20 px-4 py-1.5 font-mono text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Clock className="size-2.5" />
              {result?.executionTimeMs !== undefined ? `${result.executionTimeMs} ms` : "0 ms"}
            </span>
            {result?.memoryKb !== undefined && (
              <span className="flex items-center gap-1">
                <HardDrive className="size-2.5" />
                {result.memoryKb} KB
              </span>
            )}
          </div>
          <span>GCC 13.2 (C++20)</span>
        </div>
      </div>
    </div>
  );
}
