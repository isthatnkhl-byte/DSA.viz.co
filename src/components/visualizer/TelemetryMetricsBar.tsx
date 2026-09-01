import React from "react";
import { Activity, Cpu, Gauge, Layers, BarChart3, TrendingUp } from "lucide-react";

interface TelemetryMetricsBarProps {
  step: number;
  totalSteps: number;
  cumulativeOperations: number;
  estimatedBigO: string;
  peakAuxMemory: number;
  showDetails: boolean;
  onToggleDetails: () => void;
  showComplexityVisualizer?: boolean;
  onToggleComplexityVisualizer?: () => void;
}

export function TelemetryMetricsBar({
  step,
  totalSteps,
  cumulativeOperations,
  estimatedBigO,
  peakAuxMemory,
  showDetails,
  onToggleDetails,
  showComplexityVisualizer,
  onToggleComplexityVisualizer,
}: TelemetryMetricsBarProps) {
  const progressPct = totalSteps > 0 ? Math.round(((step + 1) / totalSteps) * 100) : 100;

  return (
    <div className="flex flex-col gap-2">
      {/* Primary Status Banner with Live Telemetry */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card/85 px-4 py-2.5 shadow-sm backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-foreground">
            <Activity className="size-4 text-primary animate-pulse" />
            <span>Telemetry</span>
          </div>

          <div className="flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-primary">
            <Cpu className="size-3" />
            <span>Ops: {cumulativeOperations}</span>
          </div>

          <div className="flex items-center gap-1 rounded-md border border-accent/40 bg-accent/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-accent">
            <Gauge className="size-3" />
            <span>Complexity: {estimatedBigO}</span>
          </div>

          {peakAuxMemory > 0 && (
            <div className="hidden sm:flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-emerald-400">
              <Layers className="size-3" />
              <span>Peak Buffer: {peakAuxMemory}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden md:inline font-mono text-[11px] text-muted-foreground">
            Frame <strong className="text-foreground">{step + 1}</strong> of <strong>{totalSteps}</strong>
          </span>

          {onToggleComplexityVisualizer && (
            <button
              type="button"
              onClick={onToggleComplexityVisualizer}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[10px] font-bold transition-all ${
                showComplexityVisualizer
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
              }`}
              title="Toggle Interactive Asymptotic Complexity Curves & Operation Profiler"
            >
              <TrendingUp className="size-3" />
              <span>Big-O Profiler</span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggleDetails}
            className="flex items-center gap-1 rounded-lg border border-border/60 bg-background/60 px-2 py-1 font-mono text-[10px] text-muted-foreground hover:text-foreground transition-all"
            title="Toggle Live Telemetry Quick Metrics"
          >
            <BarChart3 className="size-3 text-primary" />
            <span>{showDetails ? "Hide Metrics" : "Metrics"}</span>
          </button>
        </div>
      </div>

      {/* Expanded Live Telemetry Drawer */}
      {showDetails && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-2xl border border-primary/30 bg-primary/5 p-3.5 shadow-sm backdrop-blur-sm animate-fade font-mono text-xs">
          <div className="rounded-xl border border-border/60 bg-background/70 p-2.5 text-center">
            <div className="text-[10px] text-muted-foreground uppercase font-bold">Progress</div>
            <div className="mt-0.5 text-sm font-bold text-primary">{progressPct}%</div>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/70 p-2.5 text-center">
            <div className="text-[10px] text-muted-foreground uppercase font-bold">Total Operations</div>
            <div className="mt-0.5 text-sm font-bold text-accent">{cumulativeOperations} steps</div>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/70 p-2.5 text-center">
            <div className="text-[10px] text-muted-foreground uppercase font-bold">Auxiliary Buffer</div>
            <div className="mt-0.5 text-sm font-bold text-emerald-400">{peakAuxMemory} units</div>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/70 p-2.5 text-center">
            <div className="text-[10px] text-muted-foreground uppercase font-bold">Asymptotic Target</div>
            <div className="mt-0.5 text-sm font-bold text-cyan-400">{estimatedBigO}</div>
          </div>
        </div>
      )}
    </div>
  );
}
