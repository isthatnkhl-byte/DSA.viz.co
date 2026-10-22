import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { useAgUiAgent } from "@/lib/ag-ui/client/useAgUiAgent";
import {
  Activity,
  Brain,
  Terminal,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Sparkles,
  Play,
  Square,
  RotateCcw,
  Layers,
  Cpu,
  ArrowRight,
  Code2,
  Zap,
  Sliders,
  Check,
  Copy,
} from "lucide-react";
import { toast } from "sonner";

interface AgUiAgentPanelProps {
  className?: string;
  initialPrompt?: string;
  onStateUpdate?: (state: Record<string, any>) => void;
}

export const AgUiAgentPanel: React.FC<AgUiAgentPanelProps> = ({
  className = "",
  initialPrompt = "Explain and trace QuickSort partition with pointers",
}) => {
  const {
    isRunning,
    statusText,
    steps,
    reasoning,
    streamingText,
    activeTools,
    uiState,
    error,
    durationMs,
    triggerAgent,
    cancel,
    reset,
  } = useAgUiAgent("/api/ag-ui/stream");

  const [prompt, setPrompt] = useState(initialPrompt);
  const [showReasoning, setShowReasoning] = useState(true);
  const [showStateInspector, setShowStateInspector] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleRun = (customPrompt?: string) => {
    const textToRun = customPrompt || prompt;
    if (!textToRun.trim() || isRunning) return;
    triggerAgent(textToRun);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(streamingText);
    setCopiedCode(true);
    toast.success("Streaming response copied");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const quickPrompts = [
    { label: "⚡ QuickSort Invariant Trace", prompt: "Explain QuickSort partition invariant with pointers and frame trace." },
    { label: "🔍 Binary Search Convergence", prompt: "Trace Binary Search step-by-step with low, mid, and high pointers." },
    { label: "🔄 2-Sum Hash Map Probe", prompt: "Decompose 2-Sum using a complement hash table with memory metrics." },
    { label: "🌲 AVL Tree Balance Factor", prompt: "Demonstrate Left-Right rotation state transition for an unbalanced AVL tree." },
  ];

  const currentFrame = uiState?.currentFrame;
  const currentArray = Array.isArray(currentFrame?.array) ? currentFrame.array : [4, 2, 9, 1, 7, 5];
  const highlightIndices: number[] = Array.isArray(currentFrame?.highlightIndices) ? currentFrame.highlightIndices : [];
  const telemetry = uiState?.telemetry || {};

  return (
    <div className={`flex flex-col gap-4 font-mono text-xs rounded-xl border-2 border-border bg-card text-card-foreground p-5 shadow-2xl relative overflow-hidden ${className}`}>
      {/* Neo-brutalist corner registration crosses */}
      <span className="absolute top-2 left-2 text-muted-foreground/30 font-bold select-none">+</span>
      <span className="absolute top-2 right-2 text-muted-foreground/30 font-bold select-none">+</span>
      <span className="absolute bottom-2 left-2 text-muted-foreground/30 font-bold select-none">+</span>
      <span className="absolute bottom-2 right-2 text-muted-foreground/30 font-bold select-none">+</span>

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
            <Zap className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-sm uppercase">AG-UI Protocol Middleware</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary text-primary-foreground font-semibold">
                RFC 6902 Live
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Real-time Token Streaming • AI Cognitive Trace • Reactive State Sync
            </p>
          </div>
        </div>

        {/* Live Status Badge */}
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-semibold ${
            isRunning
              ? "bg-amber-500/10 text-amber-500 border-amber-500/30 animate-pulse"
              : error
              ? "bg-rose-500/10 text-rose-500 border-rose-500/30"
              : "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
          }`}>
            <span className={`size-2 rounded-full ${isRunning ? "bg-amber-500 animate-ping" : error ? "bg-rose-500" : "bg-emerald-500"}`} />
            <span>{statusText}</span>
          </div>

          {durationMs && (
            <span className="text-[10px] text-muted-foreground px-2 py-0.5 bg-muted/60 rounded border border-border">
              {durationMs}ms
            </span>
          )}
        </div>
      </div>

      {/* Quick Prompt Selector */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
          <Sliders className="size-3" /> Presets:
        </span>
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            type="button"
            disabled={isRunning}
            onClick={() => {
              setPrompt(qp.prompt);
              handleRun(qp.prompt);
            }}
            className="px-2.5 py-1 rounded-md border border-border bg-muted/40 hover:bg-muted text-[10px] font-medium transition-colors hover:border-primary/50 cursor-pointer disabled:opacity-50"
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Input & Action Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleRun();
        }}
        className="flex gap-2 items-center"
      >
        <div className="relative flex-1">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isRunning}
            placeholder="Ask agent to solve, debug, or trace algorithmic state..."
            className="w-full bg-background border-2 border-border rounded-lg px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-mono transition-colors"
          />
        </div>
        {isRunning ? (
          <button
            type="button"
            onClick={cancel}
            className="px-4 py-2.5 rounded-lg border-2 border-rose-600 bg-rose-600/10 text-rose-500 hover:bg-rose-600 hover:text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Square className="size-3.5 fill-current" />
            <span>Stop</span>
          </button>
        ) : (
          <button
            type="submit"
            className="px-4 py-2.5 rounded-lg border-2 border-primary bg-primary text-primary-foreground hover:bg-primary/90 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Play className="size-3.5 fill-current" />
            <span>Run Agent</span>
          </button>
        )}
        <button
          type="button"
          onClick={reset}
          disabled={isRunning}
          className="p-2.5 rounded-lg border-2 border-border hover:bg-muted text-muted-foreground transition-colors cursor-pointer disabled:opacity-50"
          title="Reset Agent State"
        >
          <RotateCcw className="size-4" />
        </button>
      </form>

      {/* Step Progress Pipeline */}
      {steps.length > 0 && (
        <div className="flex flex-col gap-1.5 bg-muted/20 border border-border p-3 rounded-lg">
          <div className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5">
            <Layers className="size-3 text-primary" />
            <span>AG-UI Lifecycle Pipeline ({steps.length} Steps)</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {steps.map((st) => (
              <div
                key={st.id}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-[10px] font-semibold transition-all ${
                  st.status === "running"
                    ? "bg-amber-500/10 border-amber-500/40 text-amber-500 animate-pulse"
                    : st.status === "failed"
                    ? "bg-rose-500/10 border-rose-500/40 text-rose-500"
                    : "bg-emerald-500/10 border-emerald-500/40 text-emerald-500"
                }`}
              >
                {st.status === "running" ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-3" />
                )}
                <span>{st.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Cognitive Trace / Reasoning Drawer */}
      {reasoning && (
        <div className="border-2 border-amber-500/30 bg-amber-500/5 rounded-lg overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => setShowReasoning(!showReasoning)}
            className="w-full flex items-center justify-between px-3 py-2 bg-amber-500/10 hover:bg-amber-500/15 border-b border-amber-500/20 text-amber-500 text-[11px] font-bold select-none cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Brain className="size-3.5" />
              <span>AI Cognitive Reasoning & Invariant Analysis</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400">
                {reasoning.length} chars
              </span>
              {isRunning && <span className="size-1.5 rounded-full bg-amber-400 animate-ping" />}
            </div>
            {showReasoning ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </button>
          {showReasoning && (
            <div className="p-3 text-[11px] font-mono text-amber-200/90 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed scrollbar-thin">
              {reasoning}
            </div>
          )}
        </div>
      )}

      {/* Active Tool Executions */}
      {activeTools.length > 0 && (
        <div className="flex flex-col gap-2 p-3 bg-muted/30 border border-border rounded-lg">
          <div className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5">
            <Terminal className="size-3 text-primary" />
            <span>Active Sandbox Tools</span>
          </div>
          <div className="flex flex-col gap-2">
            {activeTools.map((tool) => (
              <div
                key={tool.id}
                className="p-2 rounded border border-border bg-background flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {tool.status === "running" ? (
                      <Loader2 className="size-3 text-amber-500 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-3 text-emerald-500" />
                    )}
                    <span className="font-bold text-foreground">{tool.name}</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                    ID: {tool.id.slice(-6)}
                  </span>
                </div>
                {tool.result && (
                  <pre className="text-[10px] text-emerald-400 bg-zinc-950 p-2 rounded overflow-x-auto">
                    {typeof tool.result === "string" ? tool.result : JSON.stringify(tool.result, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Synchronized Reactive Visualizer Widget (Driven by RFC 6902 STATE_DELTA) */}
      <div className="border-2 border-border rounded-lg p-4 bg-muted/10 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="size-3.5 text-primary" />
            <span className="font-bold uppercase tracking-tight text-[11px]">
              Live Reactive Canvas (RFC 6902 State Stream)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowStateInspector(!showStateInspector)}
            className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
          >
            <span>{showStateInspector ? "Hide Patch Inspector" : "View Patch Inspector"}</span>
            {showStateInspector ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
          </button>
        </div>

        {/* Dynamic Array Bars Visualizer */}
        <div className="bg-background border-2 border-border rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-end justify-center gap-3 h-28 pt-4">
            {currentArray.map((val: number, idx: number) => {
              const isHighlighted = highlightIndices.includes(idx);
              const heightPercent = Math.min(Math.max((val / 10) * 100, 20), 100);
              return (
                <div key={idx} className="flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground">{val}</span>
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-7 rounded-t-md transition-all duration-300 flex items-center justify-center font-bold text-[10px] ${
                      isHighlighted
                        ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 scale-105"
                        : "bg-muted-foreground/30 text-foreground hover:bg-muted-foreground/50"
                    }`}
                  />
                  <span className="text-[9px] text-muted-foreground/80">[{idx}]</span>
                </div>
              );
            })}
          </div>

          {currentFrame?.explanation && (
            <div className="text-[11px] text-foreground bg-muted/40 p-2.5 rounded border border-border/80 flex items-center gap-2">
              <ArrowRight className="size-3.5 text-primary shrink-0" />
              <span>{currentFrame.explanation}</span>
            </div>
          )}

          {/* Telemetry Strip */}
          <div className="flex flex-wrap gap-4 pt-1 border-t border-border text-[10px] text-muted-foreground">
            <div>Step: <span className="font-bold text-foreground">{uiState.activeStep || 0} / {uiState.totalSteps || 0}</span></div>
            <div>Status: <span className="font-bold text-foreground">{uiState.status || "idle"}</span></div>
            {telemetry.executionTimeMs ? <div>Latency: <span className="font-bold text-emerald-500">{telemetry.executionTimeMs}ms</span></div> : null}
            {telemetry.activePointers ? (
              <div>Active Pointers: <span className="font-bold text-primary">{JSON.stringify(telemetry.activePointers)}</span></div>
            ) : null}
          </div>
        </div>

        {/* JSON State Tree Inspector */}
        {showStateInspector && (
          <div className="bg-zinc-950 text-zinc-100 p-3 rounded-lg border border-zinc-800 text-[10px] overflow-x-auto max-h-36 scrollbar-thin">
            <div className="text-zinc-400 mb-1 font-bold">Current Synchronized State Object:</div>
            <pre className="text-emerald-400 whitespace-pre">{JSON.stringify(uiState, null, 2)}</pre>
          </div>
        )}
      </div>

      {/* Streaming Markdown Response Card */}
      <div className="border-2 border-border rounded-lg bg-background p-4 min-h-[140px] relative">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Code2 className="size-3 text-primary" />
            <span>Live Token Stream (AG-UI Output)</span>
          </div>
          {streamingText && (
            <button
              type="button"
              onClick={handleCopyCode}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer px-2 py-0.5 rounded hover:bg-muted"
            >
              {copiedCode ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
              <span>{copiedCode ? "Copied" : "Copy"}</span>
            </button>
          )}
        </div>

        {streamingText ? (
          <div className="prose prose-invert prose-xs max-w-none text-foreground leading-relaxed">
            <ReactMarkdown>{streamingText}</ReactMarkdown>
            {isRunning && <span className="inline-block size-2.5 ml-1 bg-primary rounded-full animate-ping" />}
          </div>
        ) : (
          <div className="text-muted-foreground text-[11px] italic py-6 text-center">
            {isRunning ? "Agent is reasoning and synthesizing tokens..." : "Submit a prompt or click a preset above to stream tokens and AI state progress."}
          </div>
        )}
      </div>

      {error && (
        <div className="text-xs text-rose-500 bg-rose-500/10 border-2 border-rose-500/30 p-3 rounded-lg font-bold">
          ⚠️ AG-UI Stream Error: {error}
        </div>
      )}
    </div>
  );
};
