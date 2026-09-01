import { memo, useState } from "react";
import { CustomDatasetModal } from "./CustomDatasetModal";
import {
  Layers,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Check,
  Brain,
  Zap,
  Grid,
  ListOrdered,
  ArrowRight,
  PenLine,
  Plus,
} from "lucide-react";
import type { TestDataset } from "@/lib/problems";
import type { ReviewResult } from "@/lib/review.functions";

interface DatasetToolbarProps {
  datasets: TestDataset[];
  currentDataset?: TestDataset;
  onSelectDataset: (d: TestDataset) => void;
  onAddCustomDataset?: (d: TestDataset) => void;
  datasetLoading: boolean;
  result?: ReviewResult | null;
}

export const DatasetToolbar = memo(function DatasetToolbar({
  datasets,
  currentDataset,
  onSelectDataset,
  onAddCustomDataset,
  datasetLoading,
  result,
}: DatasetToolbarProps) {

  const [modalOpen, setModalOpen] = useState(false);

  if (datasets.length <= 1) return null;

  const activeId = currentDataset?.id ?? datasets[0]?.id ?? "dataset_1";

  return (
    <div className="flex flex-col gap-3.5 rounded-2xl border border-border/80 bg-card/85 p-4.5 shadow-sm backdrop-blur-md transition-all">
      {/* Category header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary shadow-xs">
            <Layers className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                Execution Datasets
              </span>
              <span className="rounded-full bg-primary/10 border border-primary/25 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                {datasets.length} Test Cases
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Switch examples to test algorithm scalability and edge cases
            </p>
          </div>
        </div>

        {/* Category Pill Tag */}
        {currentDataset?.category === "longer" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-950/40 px-3 py-1 font-mono text-[11px] font-bold text-amber-300 shadow-xs shadow-amber-500/10">
            <Zap className="size-3.5 text-amber-400 fill-amber-400/30 animate-pulse" /> Longer
            Duration Trace ⚡
          </span>
        ) : currentDataset?.category === "edge" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/40 bg-purple-950/40 px-3 py-1 font-mono text-[11px] font-bold text-purple-300 shadow-xs shadow-purple-500/10">
            <AlertTriangle className="size-3.5 text-purple-400" /> Edge &amp; Boundary Case
          </span>
        ) : currentDataset?.category === "custom" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/40 bg-blue-950/40 px-3 py-1 font-mono text-[11px] font-bold text-blue-300 shadow-xs shadow-blue-500/10">
            <PenLine className="size-3.5 text-blue-400" /> Custom Definition
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-950/40 px-3 py-1 font-mono text-[11px] font-bold text-emerald-300 shadow-xs shadow-emerald-500/10">
            <CheckCircle2 className="size-3.5 text-emerald-400" /> Standard Baseline
          </span>
        )}
      </div>

      {/* Dataset Selection Cards / Buttons */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {datasets.map((d, idx) => {
          const isSelected = activeId === d.id;
          const isLoaded =
            Boolean(result?.dataset_traces?.[d.id]?.viz_steps?.length) ||
            (d.id === datasets[0]?.id && Boolean(result?.viz_steps?.length));
          const isCurrentlyGenerating = datasetLoading && isSelected;

          const isLonger = d.category === "longer" || idx === 1;
          const isEdge = d.category === "edge" || idx === 2;
          const isCustom = d.category === "custom";

          let dimensionSummary = "";
          if (d.matrix && d.matrix.length > 0) {
            dimensionSummary = `${d.matrix.length}×${d.matrix[0]?.length ?? 0} Grid`;
          } else if (d.tree && d.tree.length > 0) {
            dimensionSummary = `${d.tree.length} Tree Nodes`;
          } else if (d.secondaryArray && d.secondaryArray.length > 0 && d.array && d.array.length > 0) {
            dimensionSummary = `2 Arrays (${d.array.length} & ${d.secondaryArray.length})`;
          } else if (d.array && d.array.length > 0) {
            dimensionSummary = `${d.array.length} Elements`;
          }

          return (
            <button
              key={d.id}
              type="button"
              onClick={() => onSelectDataset(d)}
              disabled={datasetLoading && isSelected}
              className={`group relative flex flex-col justify-between rounded-xl border p-3 text-left transition-all duration-200 select-none ${
                isSelected
                  ? isLonger
                    ? "border-amber-500/80 bg-amber-500/10 shadow-md shadow-amber-500/20 ring-1 ring-amber-500/50"
                    : isEdge
                      ? "border-purple-500/80 bg-purple-500/10 shadow-md shadow-purple-500/20 ring-1 ring-purple-500/50"
                      : isCustom
                        ? "border-blue-500/80 bg-blue-500/10 shadow-md shadow-blue-500/20 ring-1 ring-blue-500/50"
                        : "border-primary bg-primary/10 shadow-md shadow-primary/20 ring-1 ring-primary/50"
                  : "border-border/70 bg-card/60 hover:border-primary/50 hover:bg-card/90 active:scale-[0.98]"
              }`}
            >
              {/* Top Row: Category Icon + Status */}
              <div className="flex items-center justify-between gap-1.5 mb-1.5">
                <div className="flex items-center gap-1.5">
                  {isLonger ? (
                    <Zap
                      className={`size-3.5 ${isSelected ? "text-amber-400 fill-amber-400/30" : "text-amber-400/70"}`}
                    />
                  ) : isEdge ? (
                    <AlertTriangle
                      className={`size-3.5 ${isSelected ? "text-purple-400" : "text-purple-400/70"}`}
                    />
                  ) : isCustom ? (
                    <PenLine
                      className={`size-3.5 ${isSelected ? "text-blue-400" : "text-blue-400/70"}`}
                    />
                  ) : (
                    <CheckCircle2
                      className={`size-3.5 ${isSelected ? "text-emerald-400" : "text-emerald-400/70"}`}
                    />
                  )}
                  <span
                    className={`font-mono text-[10px] font-bold uppercase tracking-wider ${
                      isSelected ? "text-foreground font-extrabold" : "text-muted-foreground"
                    }`}
                  >
                    {d.category === "longer"
                      ? "Extended"
                      : d.category === "edge"
                        ? "Boundary"
                        : d.category === "custom"
                          ? "Custom"
                          : "Standard"}
                  </span>
                </div>

                {isCurrentlyGenerating ? (
                  <span className="flex items-center gap-1 font-mono text-[10px] font-bold text-primary animate-pulse">
                    <Brain className="size-3 animate-spin text-primary" /> AI Running
                  </span>
                ) : isLoaded ? (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-emerald-400 border border-emerald-500/20">
                    <Check className="size-2.5" /> Ready
                  </span>
                ) : (
                  <span className="font-mono text-[10px] text-muted-foreground/70 group-hover:text-primary transition-colors flex items-center gap-0.5">
                    Click to run <ArrowRight className="size-2.5" />
                  </span>
                )}
              </div>

              {/* Title */}
              <div className="font-semibold text-xs text-foreground truncate mb-1">{d.label}</div>

              {/* Dimension Chip */}
              {dimensionSummary && (
                <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                  {d.matrix ? (
                    <Grid className="size-3 text-primary" />
                  ) : (
                    <ListOrdered className="size-3 text-primary" />
                  )}
                  <span>{dimensionSummary}</span>
                  {d.target !== undefined && (
                    <span className="text-primary font-bold ml-auto">Target: {d.target}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
        {onAddCustomDataset && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="group relative flex flex-col justify-center items-center gap-2 rounded-xl border border-dashed border-border/70 bg-card/40 p-3 text-center transition-all duration-200 hover:border-primary/50 hover:bg-card/80 active:scale-[0.98]"
          >
            <div className="rounded-full bg-primary/10 p-2 text-primary group-hover:bg-primary/20">
              <Plus className="size-4" />
            </div>
            <span className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
              Custom Dataset
            </span>
          </button>
        )}
      </div>

      {/* Active Dataset Detail Summary Banner */}
      {currentDataset?.description && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-border/60 bg-background/60 px-3.5 py-2.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Sparkles className="size-3.5 text-primary shrink-0" />
            <span className="leading-snug">{currentDataset.description}</span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] shrink-0 ml-auto">
            {currentDataset.matrix ? (
              <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 font-bold text-primary">
                Matrix: {currentDataset.matrix.length} rows ×{" "}
                {currentDataset.matrix[0]?.length ?? 0} cols
              </span>
            ) : currentDataset.secondaryArray && currentDataset.array ? (
              <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 font-bold text-primary">
                Arrays: {currentDataset.array.length} &amp; {currentDataset.secondaryArray.length} items
              </span>
            ) : currentDataset.array ? (
              <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 font-bold text-primary">
                Length: {currentDataset.array.length} values
              </span>
            ) : null}
            {currentDataset.k !== undefined && (
              <span className="rounded-md border border-border bg-muted/50 px-2 py-0.5 font-bold text-foreground">
                n: {currentDataset.k}
              </span>
            )}
            {currentDataset.target !== undefined && (
              <span className="rounded-md border border-border bg-muted/50 px-2 py-0.5 font-bold text-foreground">
                Target: {currentDataset.target}
              </span>
            )}
          </div>
        </div>
      )}
      
      {onAddCustomDataset && datasets[0] && (
        <CustomDatasetModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          template={datasets[0]}
          onSubmit={onAddCustomDataset}
        />
      )}
    </div>
  );
});

