import React from "react";
import {
  Layers,
  Eye,
  Table,
  Zap,
  Database,
  Rows,
  Columns,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface VisualizerToolbarProps {
  hasMultipleDatasets: boolean;
  activeDataset?: string;
  showVariableWatch: boolean;
  onToggleVariableWatch: () => void;
  motionBlurEnabled: boolean;
  onToggleMotionBlur: () => void;
  multiDatasetEnabled: boolean;
  onToggleMultiDataset: () => void;
  layoutMode: "stacked" | "grid" | "tabs";
  onSelectLayoutMode: (mode: "stacked" | "grid" | "tabs") => void;
}

export function VisualizerToolbar({
  hasMultipleDatasets,
  activeDataset,
  showVariableWatch,
  onToggleVariableWatch,
  motionBlurEnabled,
  onToggleMotionBlur,
  multiDatasetEnabled,
  onToggleMultiDataset,
  layoutMode,
  onSelectLayoutMode,
}: VisualizerToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-border/80 bg-card/60 px-3.5 py-2 text-xs backdrop-blur-sm">
      <div className="flex items-center gap-2">
        {hasMultipleDatasets ? (
          <div className="flex items-center gap-1.5 rounded-md bg-primary/15 px-2.5 py-1 font-mono text-[11px] font-bold text-primary border border-primary/40 shadow-xs animate-sync-glow">
            <Layers className="size-3.5" />
            <span>Multi-Structure Synchronized</span>
            {activeDataset && (
              <span className="ml-1 text-[10px] text-muted-foreground font-normal">
                (Focus: <strong className="text-primary">{activeDataset}</strong>)
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-muted-foreground font-mono text-[11px]">
            <Eye className="size-3.5 text-primary" />
            <span>Single Structure Canvas</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Variable Watch Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleVariableWatch}
          className={`h-7 gap-1.5 px-2.5 font-mono text-[11px] transition-all ${
            showVariableWatch
              ? "bg-primary/20 text-primary font-bold border border-primary/40 shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
          title="Toggle Live Variable Watch Table"
        >
          <Table className="size-3.5" />
          <span>Watch Table: {showVariableWatch ? "ON" : "OFF"}</span>
        </Button>

        {/* Motion Blur Effect Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleMotionBlur}
          className={`h-7 gap-1.5 px-2.5 font-mono text-[11px] transition-all ${
            motionBlurEnabled
              ? "bg-primary/20 text-primary font-bold border border-primary/40 shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
          title="Toggle Cinematic Motion Blur & Glide Animation (M)"
        >
          <Zap className={`size-3.5 ${motionBlurEnabled ? "fill-primary text-primary" : ""}`} />
          <span>Motion Blur: {motionBlurEnabled ? "ON" : "OFF"}</span>
        </Button>

        {/* Multi-Dataset Toggle */}
        {hasMultipleDatasets && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleMultiDataset}
              className={`h-7 gap-1.5 px-2.5 font-mono text-[11px] transition-all ${
                multiDatasetEnabled
                  ? "bg-accent/20 text-accent font-bold border border-accent/40 shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Toggle Auxiliary Datasets Display"
            >
              <Database className="size-3.5" />
              <span>Auxiliary: {multiDatasetEnabled ? "ON" : "OFF"}</span>
            </Button>

            {/* Layout Switcher (Stacked vs Grid vs Tabs) */}
            <div className="flex items-center rounded-lg border border-border/70 bg-background/60 p-0.5">
              <button
                type="button"
                onClick={() => onSelectLayoutMode("stacked")}
                className={`rounded px-1.5 py-1 text-[10px] font-mono font-semibold transition-all flex items-center gap-1 ${
                  layoutMode === "stacked"
                    ? "bg-card text-primary shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Stacked Vertical Layout"
              >
                <Rows className="size-3.5" />
                <span className="hidden sm:inline">Stack</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectLayoutMode("grid")}
                className={`rounded px-1.5 py-1 text-[10px] font-mono font-semibold transition-all flex items-center gap-1 ${
                  layoutMode === "grid"
                    ? "bg-card text-primary shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Side-by-Side Split Grid"
              >
                <Columns className="size-3.5" />
                <span className="hidden sm:inline">Split</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectLayoutMode("tabs")}
                className={`rounded px-1.5 py-1 text-[10px] font-mono font-semibold transition-all flex items-center gap-1 ${
                  layoutMode === "tabs"
                    ? "bg-card text-primary shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Focused Tabbed Switcher"
              >
                <Layers className="size-3.5" />
                <span className="hidden sm:inline">Tabs</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
