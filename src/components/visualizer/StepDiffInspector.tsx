import React, { useMemo } from "react";
import type { VizStep } from "@/lib/problems";
import { ArrowRight, Sparkles, TrendingUp, Layers, CheckCircle2 } from "lucide-react";
import { toText } from "./VisualizerTypes";

interface StepDiffInspectorProps {
  currentStep: VizStep;
  prevStep: VizStep | null;
  stepIndex: number;
}

interface DiffItem {
  id: string;
  label: string;
  before: string;
  after: string;
  type: "pointer" | "mutation" | "stat" | "collection";
}

export function StepDiffInspector({
  currentStep,
  prevStep,
  stepIndex,
}: StepDiffInspectorProps) {
  const diffs = useMemo<DiffItem[]>(() => {
    if (!prevStep || stepIndex === 0) {
      return [
        {
          id: "init",
          label: "Initial State",
          before: "—",
          after: "Loaded",
          type: "stat",
        },
      ];
    }

    const items: DiffItem[] = [];

    // Pointer L
    if (currentStep.left !== prevStep.left) {
      items.push({
        id: "ptr-l",
        label: "Pointer L",
        before: prevStep.left !== null && prevStep.left !== undefined ? `[${prevStep.left}]` : "—",
        after: currentStep.left !== null && currentStep.left !== undefined ? `[${currentStep.left}]` : "—",
        type: "pointer",
      });
    }

    // Pointer R
    if (currentStep.right !== prevStep.right) {
      items.push({
        id: "ptr-r",
        label: "Pointer R",
        before: prevStep.right !== null && prevStep.right !== undefined ? `[${prevStep.right}]` : "—",
        after: currentStep.right !== null && currentStep.right !== undefined ? `[${currentStep.right}]` : "—",
        type: "pointer",
      });
    }

    // Pointer L2 / Right2
    if (currentStep.left2 !== prevStep.left2) {
      items.push({
        id: "ptr-l2",
        label: "Pointer L2",
        before: prevStep.left2 !== null && prevStep.left2 !== undefined ? `[${prevStep.left2}]` : "—",
        after: currentStep.left2 !== null && currentStep.left2 !== undefined ? `[${currentStep.left2}]` : "—",
        type: "pointer",
      });
    }

    // Active Focus / Current Target
    if (currentStep.current !== prevStep.current && currentStep.current !== undefined) {
      items.push({
        id: "focus",
        label: "Focus Target",
        before: toText(prevStep.current),
        after: toText(currentStep.current),
        type: "mutation",
      });
    }

    // Window Sum / wSum
    if (currentStep.wSum !== prevStep.wSum && currentStep.wSum !== undefined) {
      items.push({
        id: "wsum",
        label: "Accumulator / Window",
        before: toText(prevStep.wSum),
        after: toText(currentStep.wSum),
        type: "stat",
      });
    }

    // Max / Optimal / mSum
    if (currentStep.mSum !== prevStep.mSum && currentStep.mSum !== undefined) {
      items.push({
        id: "msum",
        label: "Max / Optimal",
        before: toText(prevStep.mSum),
        after: toText(currentStep.mSum),
        type: "stat",
      });
    }

    // Stack size delta
    const currStackLen = Array.isArray(currentStep.stack) ? currentStep.stack.length : 0;
    const prevStackLen = Array.isArray(prevStep.stack) ? prevStep.stack.length : 0;
    if (currStackLen !== prevStackLen) {
      const isPush = currStackLen > prevStackLen;
      items.push({
        id: "stack-delta",
        label: isPush ? "Stack Push" : "Stack Pop",
        before: `${prevStackLen} items`,
        after: `${currStackLen} items`,
        type: "collection",
      });
    }

    // Queue size delta
    const currQueueLen = Array.isArray(currentStep.queue) ? currentStep.queue.length : 0;
    const prevQueueLen = Array.isArray(prevStep.queue) ? prevStep.queue.length : 0;
    if (currQueueLen !== prevQueueLen) {
      const isEnqueue = currQueueLen > prevQueueLen;
      items.push({
        id: "queue-delta",
        label: isEnqueue ? "Queue Enqueue" : "Queue Dequeue",
        before: `${prevQueueLen} items`,
        after: `${currQueueLen} items`,
        type: "collection",
      });
    }

    // Map size delta
    const currMapLen = currentStep.map ? Object.keys(currentStep.map).length : 0;
    const prevMapLen = prevStep.map ? Object.keys(prevStep.map).length : 0;
    if (currMapLen !== prevMapLen) {
      items.push({
        id: "map-delta",
        label: "Map Size",
        before: `${prevMapLen} keys`,
        after: `${currMapLen} keys`,
        type: "collection",
      });
    }

    // Visited items delta
    const currVisitedLen = Array.isArray(currentStep.visited) ? currentStep.visited.length : 0;
    const prevVisitedLen = Array.isArray(prevStep.visited) ? prevStep.visited.length : 0;
    if (currVisitedLen > prevVisitedLen) {
      items.push({
        id: "visited-delta",
        label: "Visited Nodes",
        before: `${prevVisitedLen}`,
        after: `${currVisitedLen}`,
        type: "stat",
      });
    }

    return items;
  }, [currentStep, prevStep, stepIndex]);

  if (diffs.length === 0) {
    return (
      <div className="flex items-center gap-2 px-1 text-[11px] font-mono text-muted-foreground/70">
        <CheckCircle2 className="size-3 text-primary/60" />
        <span>No state variables mutated in this step</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
        Step Diff:
      </span>
      {diffs.map((diff) => (
        <div
          key={diff.id}
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[11px] shadow-2xs backdrop-blur-sm transition-all animate-fade ${
            diff.type === "pointer"
              ? "border-primary/40 bg-primary/10 text-primary"
              : diff.type === "mutation"
                ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                : diff.type === "collection"
                  ? "border-accent/40 bg-accent/10 text-accent"
                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
          }`}
        >
          <span className="font-semibold text-foreground/80">{diff.label}:</span>
          <span className="opacity-70 line-through text-[10px]">{diff.before}</span>
          <ArrowRight className="size-2.5 opacity-60" />
          <strong className="font-bold">{diff.after}</strong>
        </div>
      ))}
    </div>
  );
}
