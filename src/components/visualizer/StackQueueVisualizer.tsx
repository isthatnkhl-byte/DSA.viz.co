import React, { useMemo } from "react";
import type { Val } from "./VisualizerTypes";
import { safeArray } from "./VisualizerTypes";
import { ArrowDown, ArrowLeft, ArrowRight, Layers, Shuffle } from "lucide-react";

interface StackQueueVisualizerProps {
  items: Val[];
  current: Val | null;
  visited: Val[];
  type: "stack" | "queue" | "deque";
}

export function StackQueueVisualizer({
  items: rawItems,
  current,
  visited: rawVisited,
  type,
}: StackQueueVisualizerProps) {
  const items = useMemo(() => safeArray(rawItems), [rawItems]);
  const visited = useMemo(() => safeArray(rawVisited), [rawVisited]);

  const isStack = type === "stack";
  const isQueue = type === "queue";
  const isDeque = type === "deque";

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
              {isStack
                ? "LIFO Stack Container (Last-In First-Out)"
                : isQueue
                  ? "FIFO Queue Conveyor (First-In First-Out)"
                  : "Double-Ended Queue (Deque)"}
            </span>
          </div>

          <span className="font-mono text-xs font-semibold text-muted-foreground">
            Size: <span className="text-foreground font-bold">{items.length}</span>
          </span>
        </div>

        {/* Stack Container View */}
        {isStack ? (
          <div className="relative flex flex-col items-center">
            {/* Top of Stack Pointer Arrow */}
            {items.length > 0 && (
              <div className="mb-2 flex flex-col items-center text-primary animate-bounce">
                <span className="rounded bg-primary/20 px-2 py-0.5 font-mono text-[10px] font-extrabold text-primary border border-primary/40 shadow-xs">
                  ▼ TOP (index {items.length - 1})
                </span>
                <ArrowDown className="size-4 text-primary stroke-[2.5]" />
              </div>
            )}

            {/* Stack Glass Beaker / Wall Container */}
            <div className="flex min-h-[160px] min-w-[200px] flex-col-reverse justify-start gap-2 rounded-b-2xl border-x-4 border-b-4 border-t-0 border-border/80 bg-card/40 p-4 shadow-inner">
              {items.length === 0 ? (
                <div className="flex flex-1 items-center justify-center font-mono text-xs text-muted-foreground italic">
                  Stack is empty
                </div>
              ) : (
                items.map((val, i) => {
                  const isTop = i === items.length - 1;
                  const isCurrent =
                    current !== null &&
                    current !== undefined &&
                    (String(val) === String(current) || current === val);

                  return (
                    <div
                      key={`stack-item-${i}`}
                      className={`flex items-center justify-between rounded-xl border px-4 py-2.5 font-mono transition-all duration-300 ${
                        isTop || isCurrent
                          ? "scale-[1.02] border-primary bg-primary/20 text-primary font-bold shadow-md shadow-primary/30 ring-2 ring-primary/60 constant-glow-primary"
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
        ) : (
          /* Queue / Deque Horizontal Tunnel View */
          <div className="flex w-full flex-col items-center gap-4">
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
              {items.length === 0 ? (
                <span className="mx-auto font-mono text-xs text-muted-foreground italic self-center">
                  Queue is empty
                </span>
              ) : (
                <div className="flex w-max min-w-full items-center justify-start sm:justify-center gap-3 m-auto px-2">
                  {items.map((val, i) => {
                    const isFront = i === 0;
                    const isRear = i === items.length - 1;
                    const isCurrent =
                      current !== null &&
                      current !== undefined &&
                      (String(val) === String(current) || current === val);

                    return (
                      <div
                        key={`queue-item-${i}`}
                        className={`relative flex min-w-16 flex-col items-center justify-center rounded-xl border p-3 font-mono transition-all duration-300 ${
                          isFront || isCurrent
                            ? "border-primary bg-primary/20 text-primary font-bold shadow-md shadow-primary/30 ring-2 ring-primary/60 scale-105 constant-glow-primary"
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
        )}
      </div>
    </div>
  );
}
