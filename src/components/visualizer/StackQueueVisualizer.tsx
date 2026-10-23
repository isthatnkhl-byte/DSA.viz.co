import React, { useMemo } from "react";
import type {
  Val,
  BracketPair,
  EvalExpression,
  MonotonicDequeState,
  CircularBufferState,
  QueueBfsLevel,
} from "./VisualizerTypes";
import { safeArray } from "./VisualizerTypes";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Layers,
  Shuffle,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Calculator,
  Binary,
  Flame,
  RotateCw,
  Trophy,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Clock,
  Sliders,
  ChevronRight,
} from "lucide-react";

interface StackQueueVisualizerProps {
  items: Val[];
  secondaryItems?: Val[] | null | undefined;
  current: Val | null;
  visited: Val[];
  type: "stack" | "queue" | "deque";
  label1?: string;
  label2?: string;
  stream?: Val[] | null | undefined;
  bracketPair?: BracketPair | null | undefined;
  evalExpression?: EvalExpression | null | undefined;
  variables?: Record<string, any> | null | undefined;
  desc?: string;
  left?: number | null | undefined;
  monotonicDeque?: MonotonicDequeState | null | undefined;
  circularBuffer?: CircularBufferState | null | undefined;
  bfsLevel?: QueueBfsLevel | null | undefined;
}

const BRACKET_MAP: Record<string, { type: "paren" | "bracket" | "brace"; isClose: boolean; pair: string }> = {
  "(": { type: "paren", isClose: false, pair: ")" },
  ")": { type: "paren", isClose: true, pair: "(" },
  "[": { type: "bracket", isClose: false, pair: "]" },
  "]": { type: "bracket", isClose: true, pair: "[" },
  "{": { type: "brace", isClose: false, pair: "}" },
  "}": { type: "brace", isClose: true, pair: "{" },
};

function getBracketStyle(val: Val): string {
  const s = String(val).trim();
  const info = BRACKET_MAP[s];
  if (!info) return "";
  if (info.type === "paren") {
    return "text-sky-400 bg-sky-500/15 border-sky-500/40 ring-sky-500/30";
  }
  if (info.type === "bracket") {
    return "text-violet-400 bg-violet-500/15 border-violet-500/40 ring-violet-500/30";
  }
  return "text-amber-400 bg-amber-500/15 border-amber-500/40 ring-amber-500/30";
}

export function StackQueueVisualizer({
  items: rawItems,
  secondaryItems: rawSecondaryItems,
  current,
  visited: rawVisited,
  type,
  label1,
  label2,
  stream: rawStream,
  bracketPair,
  evalExpression,
  variables,
  desc = "",
  left,
  monotonicDeque,
  circularBuffer,
  bfsLevel,
}: StackQueueVisualizerProps) {
  const items = useMemo(() => safeArray(rawItems), [rawItems]);
  const secondaryItems = useMemo(
    () => (rawSecondaryItems ? safeArray(rawSecondaryItems) : null),
    [rawSecondaryItems],
  );
  const visited = useMemo(() => safeArray(rawVisited), [rawVisited]);
  const stream = useMemo(
    () => (rawStream && Array.isArray(rawStream) ? safeArray(rawStream) : null),
    [rawStream],
  );

  const isStack = type === "stack";
  const isQueue = type === "queue";
  const isDeque = type === "deque" || Boolean(monotonicDeque);
  const hasDualContainers = secondaryItems !== null && secondaryItems !== undefined;

  // Bracket Mode
  const isBracketMode = useMemo(() => {
    if (bracketPair) return true;
    const all = [...items, ...(stream ?? []), ...(visited ?? [])];
    return all.length > 0 && all.some((v) => typeof v === "string" && Boolean(BRACKET_MAP[v.trim()]));
  }, [bracketPair, items, stream, visited]);

  // Min Stack Mode
  const minVal = useMemo(() => {
    if (variables?.min !== undefined && variables.min !== null) return variables.min;
    if (variables?.minVal !== undefined && variables.minVal !== null) return variables.minVal;
    if (variables?.currentMin !== undefined && variables.currentMin !== null) return variables.currentMin;
    if (hasDualContainers && secondaryItems && secondaryItems.length > 0) {
      return secondaryItems[secondaryItems.length - 1];
    }
    return null;
  }, [variables, hasDualContainers, secondaryItems]);

  const isMinStackMode = minVal !== null && minVal !== undefined;

  // RPN / Arithmetic Operator Mode
  const isArithmeticMode = useMemo(() => {
    if (evalExpression) return true;
    const ops = new Set(["+", "-", "*", "/", "%", "^"]);
    return (
      (current !== null && typeof current === "string" && ops.has(current.trim())) ||
      /rpn|reverse polish|postfix|calculate|evaluate/i.test(desc)
    );
  }, [evalExpression, current, desc]);

  // Derived Arithmetic Operation
  const activeEval = useMemo(() => {
    if (evalExpression) return evalExpression;
    const match = desc.match(/(\d+(?:\.\d+)?)\s*([\+\-\*\/%^])\s*(\d+(?:\.\d+)?)\s*=\s*(-?\d+(?:\.\d+)?)/);
    if (match && match[1] && match[2] && match[3] && match[4]) {
      return {
        leftOperand: match[1],
        op: match[2],
        rightOperand: match[3],
        result: match[4],
      };
    }
    return null;
  }, [evalExpression, desc]);

  // Active Action Detection (Push vs Pop vs Dequeue vs Enqueue)
  const actionType = useMemo(() => {
    const d = desc.toLowerCase();
    if (/dequeue|pop front|poll|remove front/.test(d)) return "dequeue";
    if (/pop back|pop|remove/.test(d)) return "pop";
    if (/enqueue|push back|offer|insert rear/.test(d)) return "enqueue";
    if (/push front|push/.test(d)) return "push";
    if (/match|equal|pair/.test(d)) return "match";
    return "neutral";
  }, [desc]);

  // Render Bracket Live Ribbon
  const renderBracketHUD = () => {
    if (!isBracketMode) return null;

    const matched = bracketPair ? bracketPair.matched : /match|valid match|pair/i.test(desc);
    const isMismatch = bracketPair ? bracketPair.mismatch : /mismatch|invalid/i.test(desc);

    return (
      <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-card/80 border border-border/80 shadow-xs">
        <div className="flex items-center gap-2">
          <Binary className="size-4 text-sky-400" />
          <span className="font-mono text-xs font-bold text-foreground uppercase tracking-wider">
            Bracket Validation Engine
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          {bracketPair ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background border border-border">
              <span className={`px-1.5 py-0.5 rounded font-bold border ${getBracketStyle(bracketPair.open)}`}>
                {bracketPair.open}
              </span>
              <span className="text-muted-foreground">⟷</span>
              <span className={`px-1.5 py-0.5 rounded font-bold border ${getBracketStyle(bracketPair.close)}`}>
                {bracketPair.close}
              </span>
              {matched ? (
                <span className="flex items-center gap-1 text-emerald-400 font-bold ml-1.5 text-[11px]">
                  <CheckCircle2 className="size-3.5" /> Matched Pair
                </span>
              ) : isMismatch ? (
                <span className="flex items-center gap-1 text-rose-400 font-bold ml-1.5 text-[11px]">
                  <XCircle className="size-3.5" /> Mismatch
                </span>
              ) : (
                <span className="text-muted-foreground ml-1.5 text-[11px]">Checking...</span>
              )}
            </div>
          ) : current && BRACKET_MAP[String(current).trim()] ? (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-background border border-border">
              <span className="text-muted-foreground text-[11px]">Active Bracket:</span>
              <span className={`px-2 py-0.5 rounded font-bold border ${getBracketStyle(current)}`}>
                {String(current)}
              </span>
              {isMismatch ? (
                <span className="flex items-center gap-1 text-rose-400 font-bold text-[11px]">
                  <XCircle className="size-3.5" /> Mismatch Error
                </span>
              ) : matched ? (
                <span className="flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                  <CheckCircle2 className="size-3.5" /> Matched
                </span>
              ) : BRACKET_MAP[String(current).trim()]?.isClose ? (
                <span className="text-amber-400 text-[11px]">Popping stack to match</span>
              ) : (
                <span className="text-sky-400 text-[11px]">Pushing open bracket</span>
              )}
            </div>
          ) : (
            <span className="text-[11px] text-muted-foreground italic">
              Stack tracking open brackets LIFO
            </span>
          )}
        </div>
      </div>
    );
  };

  // Render Arithmetic / RPN Evaluation Banner
  const renderArithmeticHUD = () => {
    if (!isArithmeticMode || !activeEval) return null;

    return (
      <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-card/80 border border-primary/40 shadow-xs">
        <div className="flex items-center gap-2">
          <Calculator className="size-4 text-primary" />
          <span className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
            Postfix / RPN Arithmetic Evaluator
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-background border border-primary/30 shadow-inner">
            <span className="px-2 py-0.5 rounded bg-muted text-foreground font-bold border border-border">
              {String(activeEval.leftOperand)}
            </span>
            <span className="px-2 py-0.5 rounded bg-primary/20 text-primary font-black border border-primary/40 text-sm">
              {activeEval.op}
            </span>
            <span className="px-2 py-0.5 rounded bg-muted text-foreground font-bold border border-border">
              {String(activeEval.rightOperand)}
            </span>
            <span className="text-muted-foreground font-bold">=</span>
            <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-extrabold border border-emerald-500/40 text-sm shadow-xs">
              {String(activeEval.result)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Render BFS Level Banner
  const renderBfsLevelHUD = () => {
    if (!bfsLevel) return null;

    return (
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-card/80 border border-cyan-500/40 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="flex size-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="font-mono text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="size-3.5" />
            BFS Level {bfsLevel.level} Traversal
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          {bfsLevel.levelSize !== undefined && (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-background border border-border">
              <span className="text-muted-foreground text-[11px]">Level Progress:</span>
              <span className="font-bold text-foreground">
                {bfsLevel.processedInLevel ?? 0} / {bfsLevel.levelSize} Nodes
              </span>
              <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-cyan-400 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.round(((bfsLevel.processedInLevel ?? 0) / (bfsLevel.levelSize || 1)) * 100))}%`,
                  }}
                />
              </div>
            </div>
          )}

          {bfsLevel.isLevelComplete && (
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold flex items-center gap-1">
              <CheckCircle2 className="size-3 text-emerald-400" /> Level Completed
            </span>
          )}
        </div>
      </div>
    );
  };

  // Render Monotonic Deque Sliding Window HUD
  const renderMonotonicDequeHUD = () => {
    if (!monotonicDeque) return null;

    const { windowRange, k, incomingVal, incomingIdx, frontEviction, backEvictions, windowMax } = monotonicDeque;

    return (
      <div className="flex flex-col gap-2.5 w-full px-4 py-3 rounded-xl bg-gradient-to-r from-card/90 via-card/70 to-card/90 border border-amber-500/40 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2">
          <div className="flex items-center gap-2">
            <Sliders className="size-4 text-amber-400" />
            <span className="font-mono text-xs font-bold text-foreground uppercase tracking-wider">
              Monotonic Deque (Sliding Window Maximum)
            </span>
            {k !== undefined && (
              <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                Window Size: k = {k}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            {windowRange && (
              <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-background border border-border">
                <span className="text-muted-foreground text-[11px]">Window Range:</span>
                <span className="font-bold text-amber-300">
                  [{windowRange[0]} .. {windowRange[1]}]
                </span>
              </div>
            )}

            {windowMax !== undefined && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black shadow-xs">
                <Trophy className="size-3.5 text-emerald-400" />
                <span>Max: {String(windowMax)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Action Alerts: Incoming, Front Eviction, Back Evictions */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          {incomingVal !== undefined && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-300 border border-sky-500/30">
              <span className="text-[10px] text-muted-foreground">Incoming:</span>
              <strong className="text-sky-200">
                A[{incomingIdx ?? "i"}] = {String(incomingVal)}
              </strong>
            </div>
          )}

          {frontEviction && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30">
              <XCircle className="size-3 text-rose-400" />
              <span className="text-[10px] uppercase font-bold">Front Expired:</span>
              <span>
                A[{frontEviction.index ?? "—"}] = {String(frontEviction.val)}
              </span>
              <span className="text-[10px] text-muted-foreground opacity-80">
                ({frontEviction.reason || "Out of window"})
              </span>
            </div>
          )}

          {backEvictions && backEvictions.length > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30">
              <ArrowDownLeft className="size-3 text-purple-400" />
              <span className="text-[10px] uppercase font-bold">Back Popped:</span>
              <span>{backEvictions.length} smaller element(s)</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render Circular Ring Buffer View
  const renderCircularBufferView = () => {
    if (!circularBuffer) return null;

    const { capacity, front, rear, size, buffer, isFull, isEmpty, lastOperation, reason } = circularBuffer;

    return (
      <div className="flex flex-col gap-4 w-full p-4 rounded-xl bg-card/70 border border-cyan-500/30 shadow-inner">
        {/* Header HUD */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <RotateCw className="size-4 text-cyan-400 animate-spin-slow" />
            <span className="font-mono text-xs font-bold text-foreground uppercase tracking-wider">
              Circular Ring Buffer Engine
            </span>
          </div>

          <div className="flex items-center gap-2.5 font-mono text-xs">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-background border border-border">
              <span className="text-muted-foreground">Capacity:</span>
              <strong className="text-foreground">{capacity}</strong>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-background border border-border">
              <span className="text-muted-foreground">Size:</span>
              <strong className="text-cyan-300">{size}</strong> / {capacity}
            </div>
            {isFull ? (
              <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">
                BUFFER FULL
              </span>
            ) : isEmpty ? (
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                BUFFER EMPTY
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                AVAILABLE ({capacity - size})
              </span>
            )}
          </div>
        </div>

        {/* Modulo Indexing Formula Card */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2 rounded-lg bg-background/80 border border-border text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">Modulo Invariant:</span>
            <span className="px-2 py-0.5 rounded bg-muted text-cyan-300 font-bold border border-border">
              rear = (rear + 1) % {capacity}
            </span>
            <span className="px-2 py-0.5 rounded bg-muted text-emerald-300 font-bold border border-border">
              front = (front + 1) % {capacity}
            </span>
          </div>

          {lastOperation && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="uppercase font-bold text-foreground">Action:</span>
              <span className="px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/30">
                {lastOperation}
              </span>
              {reason && <span className="italic text-muted-foreground">({reason})</span>}
            </div>
          )}
        </div>

        {/* Circular Slot Ribbon */}
        <div className="flex items-center justify-center gap-2 overflow-x-auto py-3 px-2">
          {Array.from({ length: capacity }).map((_, idx) => {
            const val = buffer[idx];
            const isOccupied = val !== null && val !== undefined;
            const isFront = idx === front && !isEmpty;
            const isRear = idx === rear && !isEmpty;

            return (
              <div
                key={`circ-slot-${idx}`}
                className={`relative flex flex-col items-center justify-center min-w-[70px] w-auto px-3 min-h-[85px] py-2 rounded-xl border-2 whitespace-nowrap transition-all duration-300 ${
                  isFront && isRear
                    ? "border-amber-400 bg-amber-500/20 text-amber-200 font-black scale-105 shadow-lg shadow-amber-500/20 ring-2 ring-amber-400/50"
                    : isFront
                      ? "border-emerald-400 bg-emerald-500/20 text-emerald-200 font-black scale-105 shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-400/50"
                      : isRear
                        ? "border-cyan-400 bg-cyan-500/20 text-cyan-200 font-black scale-105 shadow-lg shadow-cyan-500/20 ring-2 ring-cyan-400/50"
                        : isOccupied
                          ? "border-border bg-card/90 text-foreground font-bold shadow-xs"
                          : "border-dashed border-border/60 bg-muted/20 text-muted-foreground/40 font-normal"
                }`}
              >
                {/* Top Cursor: Front / Rear */}
                <div className="absolute -top-3.5 flex items-center gap-1 font-mono text-[9px] font-black">
                  {isFront && isRear ? (
                    <span className="px-1.5 py-0.2 rounded bg-amber-500 text-amber-950 uppercase shadow-xs">
                      F & R
                    </span>
                  ) : isFront ? (
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500 text-emerald-950 uppercase shadow-xs">
                      FRONT
                    </span>
                  ) : isRear ? (
                    <span className="px-1.5 py-0.2 rounded bg-cyan-500 text-cyan-950 uppercase shadow-xs">
                      REAR
                    </span>
                  ) : null}
                </div>

                <span className="text-base font-black">
                  {isOccupied ? String(val) : "∅"}
                </span>

                <div className="mt-1 flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                  <span>idx {idx}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render Input Stream / Character Tape
  const renderStreamTape = () => {
    if (!stream || stream.length === 0) return null;

    const activeIndex = typeof left === "number" ? left : visited.length;

    return (
      <div className="flex flex-col gap-2 w-full px-3.5 py-2.5 rounded-xl bg-card/50 border border-border/70">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-bold flex items-center gap-1.5 text-foreground">
              <Layers className="size-3.5 text-primary" />
              INPUT STREAM TRAVERSAL TAPE
            </span>
            {isBracketMode && (
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold">
                Nesting Scope: <strong className="text-foreground">Level {items.length}</strong>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span>
              Progress: <strong className="text-foreground">{Math.min(activeIndex, stream.length)}</strong> / {stream.length}
            </span>
            <span className="text-border">|</span>
            <span className="text-[10px] text-primary font-bold">
              {activeIndex < stream.length ? `Next: "${stream[activeIndex]}"` : "EOF (Completed)"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto py-2 px-1 scrollbar-thin">
          {stream.map((tok, idx) => {
            const isPast = idx < activeIndex;
            const isCurr = idx === activeIndex || (current !== null && String(tok) === String(current) && idx === activeIndex);
            const isNext = idx === activeIndex + 1;
            const bracketStyle = isBracketMode ? getBracketStyle(tok) : "";

            return (
              <div
                key={`stream-${idx}`}
                className={`relative flex flex-col items-center justify-center min-w-[42px] w-auto px-2.5 py-1.5 rounded-lg font-mono text-xs font-bold whitespace-nowrap border transition-all ${
                  isCurr
                    ? "bg-primary text-primary-foreground border-primary scale-110 shadow-md ring-2 ring-primary/40 z-10"
                    : isPast
                      ? "bg-muted/40 text-muted-foreground/60 border-border/40"
                      : isNext
                        ? "bg-muted/70 text-foreground border-primary/40 ring-1 ring-primary/20"
                        : bracketStyle
                          ? bracketStyle
                          : "bg-background text-foreground border-border"
                }`}
              >
                {isCurr ? (
                  <span className="absolute -top-3.5 px-1.5 py-0.2 rounded-full bg-primary text-primary-foreground text-[8px] font-extrabold uppercase shadow-xs flex items-center gap-0.5">
                    <ArrowDown className="size-2 animate-bounce stroke-[3]" />
                    <span>i</span>
                  </span>
                ) : isNext ? (
                  <span className="absolute -top-3 px-1 rounded bg-muted text-[7px] text-muted-foreground font-mono">
                    NEXT
                  </span>
                ) : null}

                <span>{String(tok)}</span>
                <span className="text-[8px] opacity-60 font-mono">[{idx}]</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSingleStack = (
    stackItems: Val[],
    stackLabel: string,
    isSecondary = false,
  ) => {
    const isTopPop = actionType === "pop" && !isSecondary;
    const isTopPush = actionType === "push" && !isSecondary;

    return (
      <div className="relative flex flex-1 flex-col items-center min-w-[240px] max-w-full sm:max-w-[520px]">
        {/* Header with size and minimum if applicable */}
        <div className="mb-2.5 flex items-center justify-between w-full px-2 text-[11px] font-mono font-bold text-muted-foreground">
          <span className={isSecondary ? "text-indigo-300 flex items-center gap-1" : "text-primary flex items-center gap-1"}>
            {isSecondary ? <ShieldCheck className="size-3.5 text-indigo-400" /> : <Layers className="size-3.5 text-primary" />}
            {stackLabel}
          </span>
          <span className="bg-muted px-2 py-0.5 rounded text-foreground font-mono">Depth: {stackItems.length}</span>
        </div>

        {/* Top of Stack Pointer Arrow & Event Badge */}
        <div className="h-10 mb-2 flex flex-col items-center justify-end">
          {stackItems.length > 0 ? (
            <div className={`flex flex-col items-center ${isSecondary ? "text-indigo-400" : "text-primary"} transition-all duration-300`}>
              <span
                className={`rounded-md px-2.5 py-0.5 font-mono text-[10px] font-black border shadow-xs flex items-center gap-1 ${
                  isTopPush
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 scale-105"
                    : isTopPop
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/50 scale-105"
                      : isSecondary
                        ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                        : "bg-primary/20 text-primary border-primary/40"
                }`}
              >
                {isTopPush && <ArrowDown className="size-3 text-emerald-400 animate-bounce" />}
                {isTopPop && <ArrowUp className="size-3 text-rose-400 animate-bounce" />}
                <span>
                  {isTopPush ? "PUSH ➔ " : isTopPop ? "POP ➔ " : "TOS ➔ "} (idx {stackItems.length - 1})
                </span>
              </span>
              <ArrowDown className="size-4 stroke-[2.5] mt-0.5 animate-bounce" />
            </div>
          ) : (
            <div className="text-[10px] font-mono text-muted-foreground/60 italic flex items-center gap-1">
              <span>(TOS - Empty Stack)</span>
            </div>
          )}
        </div>

        {/* Stack Glass Beaker Container */}
        <div className="flex min-h-[220px] max-h-[380px] w-full flex-col-reverse justify-start gap-2 overflow-y-auto rounded-b-2xl border-x-4 border-b-4 border-t-0 border-border/80 bg-card/50 p-4 shadow-inner">
          {stackItems.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center font-mono text-xs text-muted-foreground/60 italic py-10">
              <Layers className="size-6 mb-1 opacity-40" />
              <span>Stack is currently empty</span>
            </div>
          ) : (
            stackItems.map((val, i) => {
              const isTop = i === stackItems.length - 1;
              const isBottom = i === 0;
              const isCurrent =
                current !== null &&
                current !== undefined &&
                (String(val) === String(current) || current === val);

              const bracketStyle = isBracketMode ? getBracketStyle(val) : "";
              const pairedMin = hasDualContainers && secondaryItems && secondaryItems[i] !== undefined ? secondaryItems[i] : null;

              return (
                <div
                  key={`stack-${stackLabel}-${i}`}
                  className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 font-mono transition-all duration-300 ${
                    isCurrent
                      ? isSecondary
                        ? "scale-105 border-indigo-400 bg-indigo-500/30 text-indigo-200 font-black shadow-xl shadow-indigo-500/40 ring-2 ring-indigo-400/60"
                        : "scale-105 border-primary bg-primary/30 text-primary font-black shadow-xl shadow-primary/40 ring-2 ring-primary/60"
                      : isTop
                        ? isSecondary
                          ? "border-indigo-400/70 bg-indigo-500/15 text-indigo-300 font-bold shadow-xs ring-1 ring-indigo-400/40"
                          : "border-primary/70 bg-primary/15 text-primary font-bold shadow-xs ring-1 ring-primary/40"
                        : bracketStyle
                          ? bracketStyle
                          : "border-border/80 bg-background/90 text-foreground font-semibold"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[11px] text-muted-foreground font-mono shrink-0">[{i}]</span>
                    <span className="text-base font-extrabold break-all">
                      {String(val)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Paired Minimum Badge for Min Stack */}
                    {pairedMin !== null && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                        <ShieldCheck className="size-3 text-amber-400" />
                        min: {String(pairedMin)}
                      </span>
                    )}

                    {isTop ? (
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          isSecondary
                            ? "bg-indigo-500/30 text-indigo-200 border border-indigo-400/40"
                            : "bg-primary/30 text-primary border border-primary/40"
                        }`}
                      >
                        TOS
                      </span>
                    ) : isBottom ? (
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                        BASE
                      </span>
                    ) : (
                      <span className="text-[8px] text-muted-foreground font-mono">
                        L{i + 1}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="mt-2.5 font-mono text-[10px] text-muted-foreground/70 uppercase tracking-widest">
          ▼ Bottom Anchor (LIFO Base)
        </div>
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

        {/* Tunnel Ingress / Egress Ports */}
        <div className="flex w-full items-center justify-between px-4 text-xs font-mono font-semibold text-muted-foreground">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <ArrowLeft className="size-4 animate-pulse" />
            <span className="font-bold">{isDeque ? "FRONT (POP/PUSH LEFT)" : "FRONT (DEQUEUE EXIT)"}</span>
          </div>
          <div className="flex items-center gap-1.5 text-cyan-400">
            <span className="font-bold">{isDeque ? "REAR (PUSH/POP RIGHT)" : "REAR (ENQUEUE INGRESS)"}</span>
            <ArrowLeft className="size-4 animate-pulse" />
          </div>
        </div>

        {/* Queue Tunnel */}
        <div className="flex min-h-[120px] w-full overflow-x-auto rounded-2xl border-y-4 border-x-0 border-border/80 bg-card/40 p-4 shadow-inner">
          {queueItems.length === 0 ? (
            <span className="mx-auto font-mono text-xs text-muted-foreground/60 italic self-center">
              Queue is currently empty
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
                    className={`relative flex min-w-[72px] w-auto px-3.5 py-3 flex-col items-center justify-center rounded-xl border font-mono whitespace-nowrap transition-all duration-300 ${
                      isCurrent
                        ? isSecondary
                          ? "scale-110 border-indigo-400 bg-indigo-500/30 text-indigo-200 font-black shadow-xl shadow-indigo-500/40 ring-4 ring-indigo-400/60 z-10"
                          : "scale-110 border-primary bg-primary/30 text-primary font-black shadow-xl shadow-primary/40 ring-4 ring-primary/60 z-10"
                        : isFront
                          ? "border-emerald-500/70 bg-emerald-500/15 text-emerald-300 font-bold shadow-xs ring-1 ring-emerald-500/40"
                          : isRear
                            ? "border-cyan-500/70 bg-cyan-500/15 text-cyan-300 font-bold shadow-xs ring-1 ring-cyan-500/40"
                            : "border-border/80 bg-background/80 text-foreground font-semibold"
                    }`}
                  >
                    {isFront && (
                      <span className="absolute -top-3 rounded bg-emerald-500 text-emerald-950 px-1.5 py-0.2 font-mono text-[8px] font-black uppercase shadow-xs">
                        FRONT
                      </span>
                    )}
                    {isRear && !isFront && (
                      <span className="absolute -top-3 rounded bg-cyan-500 text-cyan-950 px-1.5 py-0.2 font-mono text-[8px] font-black uppercase shadow-xs">
                        REAR
                      </span>
                    )}

                    <span className="text-base font-extrabold">{String(val)}</span>
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
    <div className="flex flex-col gap-3.5 w-full">
      {/* Dynamic HUDs */}
      {renderBracketHUD()}
      {renderArithmeticHUD()}
      {renderBfsLevelHUD()}
      {renderMonotonicDequeHUD()}

      {/* Input Token Stream Tape */}
      {renderStreamTape()}

      {/* Circular Buffer View if active */}
      {circularBuffer && renderCircularBufferView()}

      {/* Primary Stack or Queue Container View */}
      {!circularBuffer && (
        <div className="flex min-h-[260px] flex-col items-center justify-center overflow-x-auto rounded-xl border border-border/80 bg-gradient-to-b from-card/90 via-card/50 to-background/90 p-5 shadow-inner">
          {/* Header / Mode Banner */}
          <div className="mb-4 flex flex-wrap w-full items-center justify-between gap-2 border-b border-border/60 pb-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              {isStack ? (
                <Layers className="size-4 text-primary" />
              ) : isDeque ? (
                <Sliders className="size-4 text-amber-400" />
              ) : (
                <Shuffle className="size-4 text-primary" />
              )}
              <span className="font-mono uppercase tracking-wider text-[11px] font-bold text-foreground">
                {hasDualContainers
                  ? isStack
                    ? "Dual Stack Pipeline (e.g. In-Stack / Out-Stack)"
                    : "Dual Queue Pipeline"
                  : isMinStackMode
                    ? "Min Stack Engine (O(1) Running Minimum Tracker)"
                    : isBracketMode
                      ? "LIFO Bracket Matching Stack"
                      : isStack
                        ? "LIFO Stack Container (Last-In First-Out)"
                        : isDeque
                          ? "Double-Ended Queue (Deque Container)"
                          : "FIFO Queue Conveyor (First-In First-Out)"}
              </span>
            </div>

            <div className="flex items-center gap-3 font-mono text-xs">
              {isMinStackMode && minVal !== null && (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                  <ShieldCheck className="size-3.5 text-amber-400" />
                  Current Min: <strong>{String(minVal)}</strong>
                </span>
              )}

              <span className="text-muted-foreground font-semibold">
                Total Elements: <span className="text-foreground font-bold">{items.length + (secondaryItems?.length ?? 0)}</span>
              </span>
            </div>
          </div>

          {/* Stack Container View */}
          {isStack ? (
            <div className="flex w-full flex-wrap items-start justify-center gap-8 py-2">
              {renderSingleStack(items, label1 ?? (hasDualContainers ? "Primary Stack (In)" : "Stack Container"), false)}
              {hasDualContainers &&
                renderSingleStack(secondaryItems, label2 ?? (isMinStackMode ? "Auxiliary Min Stack" : "Secondary Stack (Out)"), true)}
            </div>
          ) : (
            /* Queue / Deque Tunnel View */
            <div className="flex w-full flex-col gap-6 py-2">
              {renderSingleQueue(items, label1 ?? (hasDualContainers ? "Primary Queue" : isDeque ? "Double-Ended Deque Tunnel" : "Queue Conveyor"), false)}
              {hasDualContainers &&
                renderSingleQueue(secondaryItems, label2 ?? "Secondary Queue", true)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
