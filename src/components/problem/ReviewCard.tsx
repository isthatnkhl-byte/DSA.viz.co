import { memo } from "react";
import ReactMarkdown from "react-markdown";
import {
  Sparkles,
  CheckCircle2,
  TrendingUp,
  ListChecks,
  Save,
  AlertTriangle,
  Bot,
  Cpu,
  Play,
  Layers,
  ArrowRight,
  ListOrdered,
  Activity,
  ShieldCheck,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReviewResult, ExecutionPlanStep, TraceVerification } from "@/lib/review.functions";

interface ReviewCardProps {
  result: ReviewResult;
  saved: boolean;
  onStartVisualization?: () => void;
  planLoading?: boolean;
  executionPlan?: ExecutionPlanStep[];
  dataStructureName?: string;
  hasVisualizationSteps?: boolean;
  isDatasetLoading?: boolean;
  activeDatasetLabel?: string;
  totalExpectedSteps?: number;
  preparedStepsCount?: number;
  verification?: TraceVerification;
}

const classColor = (c: ReviewResult["classification"]) => {
  switch (c) {
    case "Optimal":
      return "border-emerald-400/60 bg-emerald-500/20 text-emerald-300 shadow-xs shadow-emerald-500/25 font-extrabold";
    case "Better":
      return "border-blue-400/60 bg-blue-500/20 text-blue-300 shadow-xs shadow-blue-500/25 font-extrabold";
    case "Brute Force":
      return "border-amber-400/60 bg-amber-500/20 text-amber-300 shadow-xs shadow-amber-500/25 font-extrabold";
    default:
      return "border-purple-400/60 bg-purple-500/20 text-purple-300 shadow-xs shadow-purple-500/25 font-extrabold";
  }
};

export const ReviewCard = memo(function ReviewCard({
  result,
  saved,
  onStartVisualization,
  planLoading,
  executionPlan,
  dataStructureName,
  hasVisualizationSteps,
  isDatasetLoading,
  activeDatasetLabel,
  totalExpectedSteps,
  preparedStepsCount,
}: ReviewCardProps) {
  const isAiVisualizer = Boolean(
    result.models?.visualizer && result.models.visualizer !== "Simulator Engine",
  );

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card/75 p-5 shadow-sm backdrop-blur-sm animate-fade">
      {/* 3-Stage Workflow Status Indicator */}
      <div className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/50 p-2.5 text-xs font-mono">
        <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
          <CheckCircle2 className="size-3.5" />
          <span>Stage 1: Review</span>
        </div>
        <ArrowRight className="size-3 text-muted-foreground/60" />
        <div
          className={`flex items-center gap-1.5 font-semibold ${
            executionPlan && executionPlan.length > 0
              ? "text-emerald-400"
              : planLoading
                ? "text-primary animate-pulse"
                : "text-muted-foreground"
          }`}
        >
          <Layers className="size-3.5" />
          <span>Stage 2: Datasets & Plan</span>
        </div>
        <ArrowRight className="size-3 text-muted-foreground/60" />
        <div
          className={`flex items-center gap-1.5 font-semibold ${
            hasVisualizationSteps
              ? "text-emerald-400"
              : planLoading
                ? "text-primary animate-pulse"
                : "text-muted-foreground"
          }`}
        >
          <Activity className="size-3.5" />
          <span>Stage 3: Visualizer</span>
        </div>
      </div>

      {/* Verdict & Title Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Interview Evaluation & Complexity</h3>
        </div>
        <span
          className={`rounded-full border px-3 py-0.5 font-mono text-xs ${classColor(
            result.classification,
          )}`}
        >
          {result.classification}
        </span>
      </div>

      {/* Notice Banner */}
      {result.notice && (
        <div className="flex items-start gap-2.5 rounded-xl border border-border/70 bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
          <AlertTriangle className="size-4 shrink-0 text-amber-400 mt-0.5" />
          <span>{result.notice}</span>
        </div>
      )}

      {/* Missing Elements Checklist */}
      {Array.isArray(result.missing_elements) && result.missing_elements.length > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-amber-500/30 bg-amber-950/10 p-3.5 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-amber-300">
            <ListChecks className="size-4 text-amber-400 shrink-0" />
            <span>Logic refinement recommendations:</span>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            {result.missing_elements.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Complexity Meters */}
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="rounded-xl border border-border/60 bg-background/60 p-3 shadow-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Time Complexity
          </div>
          <div className="mt-0.5 font-mono text-base font-bold text-primary">
            {result.complexity?.time ?? "—"}
          </div>
        </div>
        <div className="rounded-xl border border-border/60 bg-background/60 p-3 shadow-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Space Complexity
          </div>
          <div className="mt-0.5 font-mono text-base font-bold text-accent">
            {result.complexity?.space ?? "—"}
          </div>
        </div>
      </div>

      {saved && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-500/15 px-3.5 py-2 text-xs font-bold text-emerald-300 shadow-xs shadow-emerald-500/20 animate-fade">
          <Save className="size-4 text-emerald-400 shrink-0" />
          <span>Saved attempt to your profile dashboard</span>
        </div>
      )}

      {/* Praise & Nudge callouts */}
      <div className="flex flex-col gap-2.5">
        {result.praise && (
          <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-xs leading-relaxed text-foreground shadow-xs shadow-emerald-500/10">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-400 mt-0.5" />
            <div>
              <strong className="text-emerald-300 font-extrabold tracking-wide">Strong Habits: </strong>
              <span className="text-foreground/95">{result.praise}</span>
            </div>
          </div>
        )}

        {result.nudge && (
          <div className="flex items-start gap-2.5 rounded-xl border border-primary/40 bg-primary/10 p-3.5 text-xs leading-relaxed text-foreground shadow-xs shadow-primary/10">
            <TrendingUp className="size-4 shrink-0 text-primary mt-0.5" />
            <div>
              <strong className="text-primary font-extrabold tracking-wide">Optimization Nudge: </strong>
              <span className="text-foreground/95">{result.nudge}</span>
            </div>
          </div>
        )}
      </div>

      {/* Structured Markdown Review */}
      {result.review && (
        <div className="prose prose-sm dark:prose-invert max-w-none border-t border-border/60 pt-3.5 text-xs leading-relaxed text-muted-foreground [&_code]:rounded [&_code]:bg-background/90 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-foreground [&_strong]:text-foreground">
          <ReactMarkdown>{result.review}</ReactMarkdown>
        </div>
      )}

      {/* Start Visualization Action Button (Stage 2 & 3 trigger) */}
      {result.is_complete && onStartVisualization && !hasVisualizationSteps && (
        <div className="flex flex-col gap-2 border-t border-border/60 pt-3">
          <Button
            type="button"
            onClick={onStartVisualization}
            disabled={planLoading}
            className="w-full gap-2 font-mono text-xs font-bold py-5 shadow-md shadow-primary/20"
          >
            {planLoading ? (
              <>
                <Sparkles className="size-4 animate-spin text-primary-foreground" />
                <span>Generating 3 Datasets & Step Plan...</span>
              </>
            ) : (
              <>
                <Play className="size-4 fill-current" />
                <span>Start Multi-Step Visualization</span>
              </>
            )}
          </Button>
          <p className="text-center font-mono text-[10px] text-muted-foreground">
            Stage 2 selects optimal data structure &amp; 3 test cases, Stage 3 animates execution.
          </p>
        </div>
      )}

      {/* Live Streaming Execution Plan */}
      {(executionPlan && executionPlan.length > 0) || isDatasetLoading ? (
        <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-background/50 p-3.5 text-xs border-t transition-all">
          <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              {isDatasetLoading ? (
                <Loader2 className="size-4 text-primary animate-spin" />
              ) : (
                <ListOrdered className="size-4 text-primary" />
              )}
              <span>
                Execution Steps ({executionPlan?.length || 0}
                {totalExpectedSteps ? ` / ~${totalExpectedSteps}` : ""}
                {activeDatasetLabel ? ` • ${activeDatasetLabel}` : ""})
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {isDatasetLoading && (
                <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-500 animate-pulse">
                  <Activity className="size-3 animate-spin" /> Streaming Live
                </span>
              )}
              {totalExpectedSteps ? (
                <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                  {isDatasetLoading ? `Live: ${preparedStepsCount || executionPlan?.length || 0} / ${totalExpectedSteps}` : `${executionPlan?.length || 0} Total Steps`}
                </span>
              ) : null}
              {dataStructureName && (
                <span className="hidden sm:inline-flex rounded-md border border-border/60 bg-muted/30 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {dataStructureName}
                </span>
              )}
            </div>
          </div>

          {executionPlan && executionPlan.length > 0 ? (
            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {executionPlan.map((step) => (
                <div
                  key={step.step_number}
                  className="flex items-start gap-2 rounded-lg bg-card/60 p-2 border border-border/40 hover:border-primary/30 transition-colors"
                >
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-[10px] font-bold text-primary">
                    {step.step_number}
                  </span>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="font-mono text-[11px] font-semibold text-foreground">
                      {step.code_action}
                    </div>
                    {step.description && (
                      <div className="text-[10px] text-muted-foreground leading-relaxed">
                        {step.description}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isDatasetLoading && (
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-2 text-primary">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span className="text-[10px] font-mono animate-pulse">
                    Synthesizing next batch from Step {(executionPlan.length || 0) + 1}...
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="py-3 text-center">
              <p className="text-[11px] text-muted-foreground leading-relaxed flex items-center justify-center gap-1.5">
                <Loader2 className="size-3 animate-spin text-primary" />
                Preparing initial execution steps for {activeDatasetLabel || "dataset"}...
              </p>
            </div>
          )}
        </div>
      ) : null}

      {/* Model & Simulator Provenance Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-3 text-[10px] font-mono text-muted-foreground">
        <div className="flex flex-wrap items-center gap-2">
          {result.models?.reviewer && (
            <span className="flex items-center gap-1 rounded-full border border-border/60 bg-muted/30 px-2.5 py-0.5">
              <Bot className="size-3 text-primary" /> Reviewer: {result.models.reviewer}
            </span>
          )}
          {isAiVisualizer ? (
            <span className="flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-primary">
              <Bot className="size-3" /> Visualizer: {result.models?.visualizer}
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-emerald-300">
              <Cpu className="size-3 text-emerald-400" /> Visualizer: Deterministic Simulator Engine
            </span>
          )}
        </div>
        {!isAiVisualizer && (
          <span className="text-[9px] text-muted-foreground/80 italic">
            Trace verified via algorithmic simulator
          </span>
        )}
      </div>
    </div>
  );
});
