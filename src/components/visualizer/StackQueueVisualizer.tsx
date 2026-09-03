import React, { useMemo } from "react";
import type { Val } from "./VisualizerTypes";
import { safeArray } from "./VisualizerTypes";
import { ArrowDown, ArrowLeft, ArrowRight, Layers, Shuffle } from "lucide-react";

interface StackQueueVisualizerProps {
  items: Val[];
  secondaryItems?: Val[] | null | undefined;
  current: Val | null;
  visited: Val[];
  type: "stack" | "queue" | "deque";
  label1?: string;
  label2?: string;
}

export function StackQueueVisualizer({
  items: rawItems,
  secondaryItems: rawSecondaryItems,
  current,
  visited: rawVisited,
  type,
  label1,
  label2,
}: StackQueueVisualizerProps) {
  const items = useMemo(() => safeArray(rawItems), [rawItems]);
  const secondaryItems = useMemo(
    () => (rawSecondaryItems ? safeArray(rawSecondaryItems) : null),
    [rawSecondaryItems],
  );
  const visited = useMemo(() => safeArray(rawVisited), [rawVisited]);

  const isStack = type === "stack";
  const isQueue = type === "queue";
  const isDeque = type === "deque";
  const hasDualContainers = secondaryItems !== null && secondaryItems !== undefined;

  const renderSingleStack = (
    stackItems: Val[],
    stackLabel: string,
    isSecondary = false,
  ) => {
    return (
      <div className="relative flex flex-1 flex-col items-center min-w-[200px]">
        <div className="mb-2 flex items-center justify-between w-full px-2 text-[11px] font-mono font-bold text-muted-foreground">
          <span className={isSecondary ? "text-indigo-300" : "text-primary"}>
            {stackLabel}
          </span>
          <span>Size: {stackItems.length}</span>
        </div>

        {/* Top of Stack Pointer Arrow */}
        {stackItems.length > 0 && (
          <div className={`mb-2 flex flex-col items-center ${isSecondary ? "text-indigo-400" : "text-primary"} animate-bounce`}>
            <span className={`rounded px-2 py-0.5 font-mono text-[10px] font-extrabold border shadow-xs ${
              isSecondary
                ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                : "bg-primary/20 text-primary border-primary/40"
            }`}>
              ▼ TOP (index {stackItems.length - 1})
            </span>
            <ArrowDown className="size-4 stroke-[2.5]" />
          </div>
        )}

        {/* Stack Glass Beaker / Wall Container */}
        <div className="flex min-h-[160px] w-full flex-col-reverse justify-start gap-2 rounded-b-2xl border-x-4 border-b-4 border-t-0 border-border/80 bg-card/40 p-4 shadow-inner">
          {stackItems.length === 0 ? (
            <div className="flex flex-1 items-center justify-center font-mono text-xs text-muted-foreground italic">
              Stack is empty
            </div>
          ) : (
            stackItems.map((val, i) => {
              const isTop = i === stackItems.length - 1;
              const isCurrent =
                current !== null &&
                current !== undefined &&
                (String(val) === String(current) || current === val);

              return (
                <div
                  key={`stack-${stackLabel}-${i}`}
                  className={`flex items-center justify-between rounded-xl border px-4 py-2.5 font-mono transition-all duration-300 ${
                    isTop || isCurrent
                      ? isSecondary
                        ? "scale-[1.02] border-indigo-400 bg-indigo-500/20 text-indigo-300 font-bold shadow-md shadow-indigo-500/30 ring-2 ring-indigo-400/60"
                        : "scale-[1.02] border-primary bg-primary/20 text-primary font-bold shadow-md shadow-primary/30 ring-2 ring-primary/60 constant-glow-primary"
                      : "border-border/80 bg-background/80 text-foreground font-semibold"
                  }`}
                >
                  <span className="text-xs text-muted-foreground">[{i}]</span>
                  <span className="text-base">{String(val)}</span>
                </div>
              );
            })
          )}
        </div>
        <div className="mt-2 font-mono text-[10px] text-muted-foreground">Bottom (Anchor)</div>
      </div>
    );
  };

  const renderSingleQueue = (
    queueItems: Val[],
    queueLabel: string,
    isSecondary = false,
  ) => {
    return (
      <div className="flex w-full flex-col items-center gap-3">
        <div className="flex w-full items-center justify-between px-2 text-[11px] font-mono font-bold text-muted-foreground">
          <span className={isSecondary ? "text-indigo-300" : "text-primary"}>
            {queueLabel}
          </span>
          <span>Size: {queueItems.length}</span>
        </div>

        <div className="flex w-full items-center justify-between px-4 text-xs font-mono font-semibold text-muted-foreground">
          <div className="flex items-center gap-1 text-accent">
            <ArrowLeft className="size-4" />
            <span>{isDeque ? "POP / PUSH LEFT" : "FRONT (DEQUEUE)"}</span>
          </div>
          <div className="flex items-center gap-1 text-primary">
            <span>{isDeque ? "PUSH / POP RIGHT" : "REAR (ENQUEUE)"}</span>
            <ArrowLeft className="size-4" />
          </div>
        </div>

        {/* Queue Tunnel */}
        <div className="flex min-h-[100px] w-full overflow-x-auto rounded-2xl border-y-4 border-x-0 border-border/80 bg-card/40 p-4 shadow-inner">
          {queueItems.length === 0 ? (
            <span className="mx-auto font-mono text-xs text-muted-foreground italic self-center">
              Queue is empty
            </span>
          ) : (
            <div className="flex w-max min-w-full items-center justify-start sm:justify-center gap-3 m-auto px-2">
              {queueItems.map((val, i) => {
                const isFront = i === 0;
                const isRear = i === queueItems.length - 1;
                const isCurrent =
                  current !== null &&
                  current !== undefined &&
                  (String(val) === String(current) || current === val);

                return (
                  <div
                    key={`queue-${queueLabel}-${i}`}
                    className={`relative flex min-w-16 flex-col items-center justify-center rounded-xl border p-3 font-mono transition-all duration-300 ${
                      isFront || isCurrent
                        ? isSecondary
                          ? "border-indigo-400 bg-indigo-500/20 text-indigo-300 font-bold shadow-md shadow-indigo-500/30 ring-2 ring-indigo-400/60 scale-105"
                          : "border-primary bg-primary/20 text-primary font-bold shadow-md shadow-primary/30 ring-2 ring-primary/60 scale-105 constant-glow-primary"
                        : "border-border/80 bg-background/80 text-foreground font-semibold"
                    }`}
                  >
                    {/* Front/Rear indicators */}
                    {isFront && (
                      <span className="absolute -top-3 rounded bg-accent/20 px-1 font-mono text-[8px] font-bold text-accent border border-accent/40">
                        FRONT
                      </span>
                    )}
                    {isRear && !isFront && (
                      <span className="absolute -top-3 rounded bg-primary/20 px-1 font-mono text-[8px] font-bold text-primary border border-primary/40">
                        REAR
                      </span>
                    )}

                    <span className="text-base">{String(val)}</span>
                    <span className="text-[9px] text-muted-foreground mt-0.5">[{i}]</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-h-[240px] flex-col items-center justify-center overflow-x-auto rounded-xl border border-border/80 bg-gradient-to-b from-card/90 via-card/50 to-background/90 p-6 shadow-inner">
        {/* Header / Mode Banner */}
        <div className="mb-6 flex w-full items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            {isStack ? (
              <Layers className="size-4 text-primary" />
            ) : (
              <Shuffle className="size-4 text-primary" />
            )}
            <span className="font-mono uppercase tracking-wider text-[11px]">
              {hasDualContainers
                ? isStack
                  ? "Dual Stack Pipeline (e.g. In-Stack / Out-Stack)"
                  : "Dual Queue Pipeline"
                : isStack
                  ? "LIFO Stack Container (Last-In First-Out)"
                  : isQueue
                    ? "FIFO Queue Conveyor (First-In First-Out)"
                    : "Double-Ended Queue (Deque)"}
            </span>
          </div>

          <span className="font-mono text-xs font-semibold text-muted-foreground">
            Total Elements: <span className="text-foreground font-bold">{items.length + (secondaryItems?.length ?? 0)}</span>
          </span>
        </div>

        {/* Stack Container View */}
        {isStack ? (
          <div className="flex w-full flex-wrap items-start justify-center gap-6">
            {renderSingleStack(items, label1 ?? (hasDualContainers ? "Primary Stack (In)" : "Stack Container"), false)}
            {hasDualContainers &&
              renderSingleStack(secondaryItems, label2 ?? "Secondary Stack (Out)", true)}
          </div>
        ) : (
          /* Queue / Deque Tunnel View */
          <div className="flex w-full flex-col gap-6">
            {renderSingleQueue(items, label1 ?? (hasDualContainers ? "Primary Queue" : "Queue Conveyor"), false)}
            {hasDualContainers &&
              renderSingleQueue(secondaryItems, label2 ?? "Secondary Queue", true)}
          </div>
        )}
      </div>
    </div>
  );
}
