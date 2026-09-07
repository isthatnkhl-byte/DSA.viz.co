import React, { useMemo } from "react";
import type {
  Val,
  LinkedListCycleState,
  LinkedListReversalState,
  LruCacheState,
} from "./VisualizerTypes";
import { safeArray } from "./VisualizerTypes";
import {
  ArrowRight,
  ArrowLeft,
  ArrowLeftRight,
  Link2,
  GitCommit,
  RotateCcw,
  Zap,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Database,
  Layers,
  Sparkles,
  ArrowDown,
  CornerDownRight,
  Repeat,
  Compass,
} from "lucide-react";

interface LinkedListVisualizerProps {
  list: Val[];
  secondaryList?: Val[] | null | undefined;
  current: Val | null;
  predecessor: Val | null;
  visited: Val[];
  pointer_labels?: Record<string, string> | null;
  isDoubly?: boolean;
  dummyNodeVal?: Val | null | undefined;
  slowPointer?: Val | null | undefined;
  fastPointer?: Val | null | undefined;
  prevPointer?: Val | null | undefined;
  currPointer?: Val | null | undefined;
  nextPointer?: Val | null | undefined;
  linkedListCycle?: LinkedListCycleState | null | undefined;
  linkedListReversal?: LinkedListReversalState | null | undefined;
  lruCache?: LruCacheState | null | undefined;
  desc?: string;
  variables?: Record<string, any> | null | undefined;
}

export function LinkedListVisualizer({
  list: rawList,
  secondaryList: rawSecondaryList,
  current: rawCurrent,
  predecessor: rawPredecessor,
  visited: rawVisited,
  pointer_labels,
  isDoubly = false,
  dummyNodeVal,
  slowPointer: rawSlow,
  fastPointer: rawFast,
  prevPointer: rawPrev,
  currPointer: rawCurr,
  nextPointer: rawNext,
  linkedListCycle,
  linkedListReversal,
  lruCache,
  desc = "",
  variables,
}: LinkedListVisualizerProps) {
  const list = useMemo(() => safeArray(rawList), [rawList]);
  const secondaryList = useMemo(
    () => (rawSecondaryList ? safeArray(rawSecondaryList) : null),
    [rawSecondaryList],
  );
  const visited = useMemo(() => safeArray(rawVisited), [rawVisited]);
  const visitedSet = useMemo(() => new Set(visited.map(String)), [visited]);

  // Determine Active Pointers (Slow, Fast, Curr, Prev, Next)
  const current = rawCurr ?? rawCurrent;
  const predecessor = rawPrev ?? rawPredecessor;
  const slow = rawSlow ?? linkedListCycle?.slowVal ?? variables?.slow ?? null;
  const fast = rawFast ?? linkedListCycle?.fastVal ?? variables?.fast ?? null;
  const nextNode = rawNext ?? linkedListReversal?.nextNode ?? variables?.next ?? null;

  // Cycle Mode Detection
  const isCycleMode = useMemo(() => {
    if (linkedListCycle) return true;
    if (slow !== null && fast !== null) return true;
    return /tortoise|hare|cycle|floyd|loop/i.test(desc);
  }, [linkedListCycle, slow, fast, desc]);

  // Reversal Mode Detection
  const isReversalMode = useMemo(() => {
    if (linkedListReversal) return true;
    return /reverse|reversal|invert.*link|prev.*curr/i.test(desc);
  }, [linkedListReversal, desc]);

  // LRU Mode Detection
  const isLruMode = Boolean(lruCache);

  // Helper to find node index by value or numerical index
  const findNodeIndex = (target: Val | null | undefined, targetList = list): number | null => {
    if (target === null || target === undefined) return null;
    const s = String(target);
    const found = targetList.findIndex((v) => String(v) === s);
    if (found !== -1) return found;
    const num = Number(target);
    if (Number.isInteger(num) && num >= 0 && num < targetList.length) return num;
    return null;
  };

  const currentIdx = useMemo(() => findNodeIndex(current), [current, list]);
  const prevIdx = useMemo(() => findNodeIndex(predecessor), [predecessor, list]);
  const slowIdx = useMemo(
    () => (linkedListCycle?.slowIndex !== undefined && linkedListCycle.slowIndex !== null ? linkedListCycle.slowIndex : findNodeIndex(slow)),
    [linkedListCycle, slow, list],
  );
  const fastIdx = useMemo(
    () => (linkedListCycle?.fastIndex !== undefined && linkedListCycle.fastIndex !== null ? linkedListCycle.fastIndex : findNodeIndex(fast)),
    [linkedListCycle, fast, list],
  );
  const nextIdx = useMemo(() => findNodeIndex(nextNode), [nextNode, list]);

  // Cycle collision detection
  const isCollision = useMemo(() => {
    if (linkedListCycle?.collisionIndex !== undefined && linkedListCycle.collisionIndex !== null) return true;
    if (isCycleMode && slowIdx !== null && fastIdx !== null && slowIdx === fastIdx) return true;
    return /collision|meet|intercept/i.test(desc);
  }, [linkedListCycle, isCycleMode, slowIdx, fastIdx, desc]);

  // Cycle entry detection
  const cycleEntryIdx = useMemo(() => {
    if (linkedListCycle?.cycleEntryIndex !== undefined && linkedListCycle.cycleEntryIndex !== null) {
      return linkedListCycle.cycleEntryIndex;
    }
    if (variables?.cycleEntry !== undefined && variables.cycleEntry !== null) {
      return findNodeIndex(variables.cycleEntry);
    }
    return null;
  }, [linkedListCycle, variables, list]);

  // Reversed links set
  const reversedIndicesSet = useMemo(() => {
    if (linkedListReversal?.reversedIndices) {
      return new Set(linkedListReversal.reversedIndices);
    }
    if (isReversalMode && prevIdx !== null) {
      // All nodes up to prevIdx are already reversed
      const s = new Set<number>();
      for (let i = 0; i <= prevIdx; i++) s.add(i);
      return s;
    }
    return new Set<number>();
  }, [linkedListReversal, isReversalMode, prevIdx]);

  // Render Fast / Slow Pointer Floyd's HUD
  const renderCycleHUD = () => {
    if (!isCycleMode) return null;

    const phase = linkedListCycle?.phase || (isCollision ? "collision_detected" : "phase1_detection");

    return (
      <div className="flex flex-col gap-2.5 w-full px-4 py-3 rounded-xl bg-card/80 border border-purple-500/40 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-2">
          <div className="flex items-center gap-2">
            <Compass className="size-4 text-purple-400 animate-spin-slow" />
            <span className="font-mono text-xs font-bold text-foreground uppercase tracking-wider">
              Floyd’s Cycle Finding Engine (Tortoise & Hare)
            </span>
          </div>

          <div className="flex items-center gap-2.5 font-mono text-xs">
            {isCollision ? (
              <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black flex items-center gap-1">
                <CheckCircle2 className="size-3.5 text-emerald-400" />
                COLLISION AT NODE [{slowIdx ?? "meet"}]
              </span>
            ) : linkedListCycle?.hasCycle === false ? (
              <span className="px-2.5 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold flex items-center gap-1">
                <XCircle className="size-3.5 text-rose-400" />
                NO CYCLE (Reached NULL)
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30 font-bold">
                PHASE: {phase === "phase2_entry_find" ? "Finding Loop Entrance" : "Speed Ratio (Slow: 1x, Fast: 2x)"}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-300 border border-sky-500/30">
              <span className="font-bold text-sky-400">🐢 Slow (1x):</span>
              <span>
                {slowIdx !== null ? `Node [${slowIdx}] (val: ${list[slowIdx] ?? slow})` : "Start"}
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30">
              <span className="font-bold text-amber-400">🐇 Fast (2x):</span>
              <span>
                {fastIdx !== null ? `Node [${fastIdx}] (val: ${list[fastIdx] ?? fast})` : "Start"}
              </span>
            </div>
          </div>

          {cycleEntryIdx !== null && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              <Sparkles className="size-3.5 text-emerald-400" />
              <span className="text-[11px] font-bold">Cycle Entry Point:</span>
              <strong className="text-foreground">Node [{cycleEntryIdx}]</strong>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render Reversal Progress HUD
  const renderReversalHUD = () => {
    if (!isReversalMode) return null;

    return (
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-card/80 border border-amber-500/40 shadow-xs">
        <div className="flex items-center gap-2">
          <RotateCcw className="size-4 text-amber-400" />
          <span className="font-mono text-xs font-bold text-foreground uppercase tracking-wider">
            In-Place 3-Pointer Link Inversion
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-background border border-border">
            <span className="text-muted-foreground">Inverted Links:</span>
            <span className="text-amber-300 font-bold">{reversedIndicesSet.size} / {Math.max(1, list.length - 1)}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold">
              PREV: {predecessor !== null ? String(predecessor) : "NULL"}
            </span>
            <span className="px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/40 font-black">
              CURR: {current !== null ? String(current) : "NULL"}
            </span>
            <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold">
              NEXT: {nextNode !== null ? String(nextNode) : "NULL"}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Render LRU Cache HUD & Visualizer
  const renderLruCache = () => {
    if (!lruCache) return null;

    const { capacity, hashMap, dllOrder, mruKey, lruKey, evictedKey, evictedVal, action, hitOrMiss } = lruCache;

    return (
      <div className="flex flex-col gap-4 w-full p-4 rounded-xl bg-card/70 border border-primary/30 shadow-inner">
        {/* Header HUD */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Database className="size-4 text-primary" />
            <span className="font-mono text-xs font-bold text-foreground uppercase tracking-wider">
              LRU Cache Engine (O(1) Hash Map + Doubly Linked List)
            </span>
          </div>

          <div className="flex items-center gap-2.5 font-mono text-xs">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-background border border-border">
              <span className="text-muted-foreground">Capacity:</span>
              <strong className="text-foreground">{capacity}</strong>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-background border border-border">
              <span className="text-muted-foreground">Occupancy:</span>
              <strong className="text-primary">{dllOrder.length}</strong> / {capacity}
            </div>

            {hitOrMiss === "hit" && (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black flex items-center gap-1">
                <CheckCircle2 className="size-3.5 text-emerald-400" /> CACHE HIT
              </span>
            )}
            {hitOrMiss === "miss" && (
              <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold flex items-center gap-1">
                <XCircle className="size-3.5 text-rose-400" /> CACHE MISS
              </span>
            )}
          </div>
        </div>

        {/* Action Callout */}
        {action && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-background border border-border text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Current Op:</span>
              <span className="px-2 py-0.5 rounded bg-primary/15 text-primary font-bold border border-primary/30 uppercase">
                {action}
              </span>
            </div>
            {evictedKey !== undefined && evictedKey !== null && (
              <span className="text-rose-400 font-bold flex items-center gap-1">
                <ShieldAlert className="size-3.5" /> Evicted LRU Key: <strong className="text-rose-200">{String(evictedKey)}</strong>
              </span>
            )}
          </div>
        )}

        {/* Dual Layout: 1. Hash Map Table  2. Doubly Linked List Pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Hash Map Key -> Node Reference Lookup */}
          <div className="flex flex-col gap-2 p-3 rounded-xl bg-background/80 border border-border/80">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-muted-foreground border-b border-border/60 pb-2">
              <span className="flex items-center gap-1.5 text-foreground">
                <Layers className="size-3.5 text-indigo-400" />
                Hash Map (O(1) Lookups)
              </span>
              <span>{Object.keys(hashMap).length} keys</span>
            </div>

            <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto">
              {Object.keys(hashMap).length === 0 ? (
                <span className="text-xs font-mono text-muted-foreground italic py-4 text-center">
                  Map is empty
                </span>
              ) : (
                Object.entries(hashMap).map(([k, v]) => {
                  const isMru = String(k) === String(mruKey);
                  const isLru = String(k) === String(lruKey);

                  return (
                    <div
                      key={`hashmap-${k}`}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border font-mono text-xs transition-all ${
                        isMru
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-bold shadow-xs"
                          : isLru
                            ? "bg-amber-500/15 border-amber-500/40 text-amber-300 font-bold shadow-xs"
                            : "bg-card/90 border-border text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">key:</span>
                        <strong className="text-foreground">{k}</strong>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">➔ node val:</span>
                        <span className="px-1.5 py-0.2 rounded bg-muted text-foreground font-bold">
                          {String(v)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Doubly Linked List Order (Head = MRU, Tail = LRU) */}
          <div className="lg:col-span-2 flex flex-col gap-2 p-3 rounded-xl bg-background/80 border border-border/80 overflow-hidden">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-muted-foreground border-b border-border/60 pb-2">
              <span className="flex items-center gap-1.5 text-foreground">
                <ArrowLeftRight className="size-3.5 text-primary" />
                Doubly Linked List (MRU ⟷ LRU)
              </span>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-emerald-400 font-bold">MRU (Head)</span>
                <span className="text-muted-foreground">⟷</span>
                <span className="text-amber-400 font-bold">LRU (Tail)</span>
              </div>
            </div>

            {/* DLL Node Chain */}
            <div className="flex items-center gap-2 overflow-x-auto py-3 px-1 scrollbar-thin">
              {/* Dummy Head Sentinel */}
              <div className="flex flex-col items-center min-w-[50px]">
                <span className="font-mono text-[9px] font-bold text-muted-foreground mb-1">SENTINEL</span>
                <div className="rounded-lg border border-dashed border-border px-2 py-1.5 bg-muted/30 font-mono text-[11px] text-muted-foreground font-bold">
                  HEAD
                </div>
              </div>

              <ArrowLeftRight className="size-4 text-border shrink-0" />

              {dllOrder.length === 0 ? (
                <span className="text-xs font-mono text-muted-foreground italic px-6">
                  List is currently empty
                </span>
              ) : (
                dllOrder.map((node, i) => {
                  const isMru = i === 0 || String(node.key) === String(mruKey);
                  const isLru = i === dllOrder.length - 1 || String(node.key) === String(lruKey);

                  return (
                    <React.Fragment key={`dll-node-${node.key}-${i}`}>
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1 mb-1 font-mono text-[9px]">
                          {isMru && (
                            <span className="px-1 py-0.2 rounded bg-emerald-500 text-emerald-950 font-black uppercase shadow-xs">
                              MRU
                            </span>
                          )}
                          {isLru && (
                            <span className="px-1 py-0.2 rounded bg-amber-500 text-amber-950 font-black uppercase shadow-xs">
                              LRU
                            </span>
                          )}
                        </div>

                        <div
                          className={`flex items-center rounded-xl border font-mono text-xs shadow-xs transition-all ${
                            isMru
                              ? "border-emerald-500/70 bg-emerald-500/20 text-emerald-200 font-extrabold shadow-md shadow-emerald-500/20 scale-105"
                              : isLru
                                ? "border-amber-500/70 bg-amber-500/20 text-amber-200 font-extrabold shadow-md shadow-amber-500/20"
                                : "border-border/80 bg-card text-foreground font-semibold"
                          }`}
                        >
                          <div className="px-2.5 py-1.5 border-r border-border/50 text-[11px] text-muted-foreground">
                            k: <strong className="text-foreground">{String(node.key)}</strong>
                          </div>
                          <div className="px-2.5 py-1.5 text-sm font-black">
                            {String(node.val)}
                          </div>
                        </div>
                      </div>

                      {i < dllOrder.length - 1 && (
                        <ArrowLeftRight className="size-4 text-primary shrink-0" />
                      )}
                    </React.Fragment>
                  );
                })
              )}

              <ArrowLeftRight className="size-4 text-border shrink-0" />

              {/* Dummy Tail Sentinel */}
              <div className="flex flex-col items-center min-w-[50px]">
                <span className="font-mono text-[9px] font-bold text-muted-foreground mb-1">SENTINEL</span>
                <div className="rounded-lg border border-dashed border-border px-2 py-1.5 bg-muted/30 font-mono text-[11px] text-muted-foreground font-bold">
                  TAIL
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render a Single Linked List Node Sequence
  const renderListNodes = (
    nodes: Val[],
    listLabel = "Primary Singly-Linked List",
    isSecondaryList = false,
  ) => {
    const hasDummy = Boolean(dummyNodeVal !== null && dummyNodeVal !== undefined && !isSecondaryList);

    return (
      <div className="flex flex-col gap-2 w-full">
        {/* List Title & Header */}
        <div className="flex items-center justify-between px-2 text-[11px] font-mono font-bold text-muted-foreground">
          <span className={isSecondaryList ? "text-indigo-300 flex items-center gap-1.5" : "text-primary flex items-center gap-1.5"}>
            <Link2 className="size-3.5" />
            {listLabel}
          </span>
          <span className="bg-muted px-2 py-0.5 rounded text-foreground font-mono">
            Length: {nodes.length}
          </span>
        </div>

        {/* Nodes Memory Track */}
        <div className="relative flex w-max min-w-full items-center justify-start sm:justify-center gap-2 py-7 px-4 m-auto overflow-x-auto">
          {/* Optional Dummy / Sentinel Head Node */}
          {hasDummy && (
            <div className="flex items-center gap-2">
              <div className="relative flex flex-col items-center">
                <div className="absolute -top-7 flex items-center gap-1">
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[9px] font-bold text-muted-foreground border border-border">
                    DUMMY HEAD
                  </span>
                </div>

                <div className="flex rounded-xl border border-dashed border-border/80 bg-muted/30 text-muted-foreground font-mono text-xs">
                  <div className="flex min-w-10 items-center justify-center border-r border-border/50 px-2.5 py-2 font-bold">
                    {String(dummyNodeVal)}
                  </div>
                  <div className="flex items-center justify-center px-2 py-2">
                    <div className="size-2 rounded-full bg-muted-foreground/60" />
                  </div>
                </div>
                <span className="mt-1.5 font-mono text-[9px] text-muted-foreground/60">Sentinel</span>
              </div>

              <div className="flex items-center text-muted-foreground/80 px-1">
                <ArrowRight className="size-4 text-border" />
              </div>
            </div>
          )}

          {nodes.length === 0 ? (
            <span className="mx-auto font-mono text-sm text-muted-foreground italic py-4">
              Empty list (NULL ∅)
            </span>
          ) : (
            nodes.map((val, i) => {
              const isCurrent =
                !isSecondaryList &&
                (currentIdx === i ||
                  (current !== null && String(val) === String(current) && (currentIdx === null || currentIdx === i)));

              const isPrev = !isSecondaryList && prevIdx === i && !isCurrent;
              const isSlow = !isSecondaryList && slowIdx === i;
              const isFast = !isSecondaryList && fastIdx === i;
              const isNext = !isSecondaryList && nextIdx === i && !isCurrent && !isPrev;
              const isCycleEntry = !isSecondaryList && cycleEntryIdx === i;
              const isReversed = !isSecondaryList && reversedIndicesSet.has(i);

              const isVisited =
                !isSecondaryList &&
                (visitedSet.has(String(val)) || (currentIdx !== null && i < currentIdx));

              const isHead = i === 0;
              const isTail = i === nodes.length - 1;

              return (
                <React.Fragment key={`node-${listLabel}-${i}`}>
                  <div className="flex items-center gap-2">
                    {/* Node Capsule Container */}
                    <div className="relative flex flex-col items-center">
                      {/* Floating Pointer Badges Above Node */}
                      <div className="absolute -top-7 flex items-center gap-1">
                        {isHead && !hasDummy && (
                          <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-emerald-400 border border-emerald-500/30">
                            HEAD
                          </span>
                        )}

                        {/* Slow / Fast Pointers for Cycle Detection */}
                        {isCycleMode && isSlow && isFast && (
                          <span className="rounded bg-purple-500 text-purple-950 px-1.5 py-0.5 font-mono text-[9px] font-black border border-purple-400 shadow-md animate-bounce">
                            SLOW & FAST ⚡
                          </span>
                        )}
                        {isCycleMode && isSlow && !isFast && (
                          <span className="rounded bg-sky-500/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-sky-300 border border-sky-500/40 shadow-xs flex items-center gap-0.5">
                            🐢 SLOW
                          </span>
                        )}
                        {isCycleMode && isFast && !isSlow && (
                          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber-300 border border-amber-500/40 shadow-xs flex items-center gap-0.5">
                            🐇 FAST
                          </span>
                        )}

                        {/* Cycle Entry Badge */}
                        {isCycleEntry && (
                          <span className="rounded bg-emerald-500/25 px-1.5 py-0.5 font-mono text-[9px] font-black text-emerald-300 border border-emerald-500/50 shadow-xs">
                            ENTRY ★
                          </span>
                        )}

                        {/* Standard Curr / Prev / Next Pointers */}
                        {!isCycleMode && isPrev && (
                          <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-indigo-300 border border-indigo-500/30">
                            {pointer_labels?.predecessor ?? "PREV"}
                          </span>
                        )}
                        {!isCycleMode && isCurrent && (
                          <span className="rounded bg-primary/20 px-1.5 py-0.5 font-mono text-[9px] font-extrabold text-primary border border-primary/40 shadow-xs">
                            {pointer_labels?.current ?? "CURR"}
                          </span>
                        )}
                        {!isCycleMode && isNext && (
                          <span className="rounded bg-sky-500/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-sky-300 border border-sky-500/30">
                            NEXT
                          </span>
                        )}

                        {isTail && !isHead && (
                          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[9px] font-medium text-muted-foreground border border-border">
                            TAIL
                          </span>
                        )}
                      </div>

                      {/* Dual-Compartment Node [ Value | Next • ] */}
                      <div
                        className={`flex rounded-xl border transition-all duration-300 shadow-sm ${
                          isCurrent || (isCycleMode && isSlow && isFast)
                            ? "scale-105 border-primary bg-primary/20 shadow-md shadow-primary/30 ring-2 ring-primary/60"
                            : isCycleEntry
                              ? "border-emerald-400 bg-emerald-500/15 text-emerald-200 ring-2 ring-emerald-400/40"
                              : isVisited
                                ? "border-accent/60 bg-accent/15 text-foreground"
                                : "border-border/80 bg-card/90 text-foreground"
                        }`}
                      >
                        {/* Prev Pointer Compartment (if Doubly Linked List) */}
                        {isDoubly && (
                          <div className="flex items-center justify-center border-r border-border/50 px-2 py-2 text-xs text-muted-foreground">
                            <div className="size-2 rounded-full bg-muted-foreground/60" />
                          </div>
                        )}

                        {/* Value Compartment */}
                        <div
                          className={`flex min-w-12 items-center justify-center border-r px-3.5 py-2 font-mono text-sm font-bold transition-all duration-300 ${
                            isCurrent
                              ? "text-primary border-primary/40"
                              : isCycleEntry
                                ? "text-emerald-300 border-emerald-400/40"
                                : isVisited
                                  ? "text-accent border-accent/40"
                                  : "text-foreground border-border/60"
                          }`}
                        >
                          {String(val)}
                        </div>

                        {/* Next Pointer Compartment */}
                        <div className="flex items-center justify-center px-2.5 py-2 text-xs text-muted-foreground">
                          <div
                            className={`size-2.5 rounded-full transition-all duration-300 ${
                              isCurrent
                                ? "bg-primary shadow-xs shadow-primary/60"
                                : isVisited
                                  ? "bg-accent"
                                  : "bg-muted-foreground/60"
                            }`}
                          />
                        </div>
                      </div>

                      {/* Node Index label */}
                      <span className="mt-1.5 font-mono text-[9px] text-muted-foreground">
                        Node [{i}]
                      </span>
                    </div>

                    {/* Connecting Arrow: Forward, Backward (Reversed), or Bidirectional */}
                    {i < nodes.length - 1 && (
                      <div className="flex items-center text-muted-foreground/80 px-1">
                        {isDoubly ? (
                          <ArrowLeftRight className="size-5 text-primary/70 stroke-[2.5]" />
                        ) : isReversed ? (
                          <div className="flex items-center gap-0.5 text-amber-400">
                            <ArrowLeft className="size-5 animate-pulse stroke-[2.5]" />
                            <span className="text-[8px] font-mono font-bold uppercase">REV</span>
                          </div>
                        ) : (
                          <ArrowRight
                            className={`size-5 transition-all ${
                              isVisited || isCurrent ? "text-primary stroke-[2.5]" : "text-border"
                            }`}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </React.Fragment>
              );
            })
          )}

          {/* Cycle Loop Back-Arc Indicator OR NULL Terminator */}
          {isCycleMode && cycleEntryIdx !== null ? (
            <div className="flex items-center gap-2 ml-2">
              <div className="flex items-center text-purple-400 px-1">
                <CornerDownRight className="size-5 rotate-90 stroke-[2.5]" />
              </div>
              <div className="flex flex-col items-center">
                <div className="rounded-xl border border-purple-500/60 bg-purple-500/20 px-3 py-2 font-mono text-xs font-bold text-purple-300 shadow-xs flex items-center gap-1.5">
                  <Repeat className="size-3.5 text-purple-400 animate-spin-slow" />
                  <span>LOOP ➔ Node [{cycleEntryIdx}]</span>
                </div>
                <span className="mt-1.5 font-mono text-[9px] text-purple-400/80">Cycle Back-Arc</span>
              </div>
            </div>
          ) : (
            /* NULL Terminator Node */
            <div className="flex items-center gap-2">
              <div className="flex items-center text-muted-foreground/80 px-1">
                <ArrowRight className="size-5 text-border" />
              </div>
              <div className="flex flex-col items-center">
                <div className="rounded-xl border border-dashed border-border/80 bg-background/50 px-3 py-2 font-mono text-xs font-bold text-muted-foreground">
                  NULL ∅
                </div>
                <span className="mt-1.5 font-mono text-[9px] text-muted-foreground/60">end</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3.5 w-full">
      {/* Dynamic Algorithmic HUDs */}
      {renderCycleHUD()}
      {renderReversalHUD()}

      {/* LRU Cache View if active */}
      {lruCache && renderLruCache()}

      {/* Primary Linked List Visualizer Container */}
      {!lruCache && (
        <div className="flex min-h-[240px] flex-col justify-center overflow-x-auto rounded-xl border border-border/80 bg-gradient-to-b from-card/90 via-card/50 to-background/90 p-5 shadow-inner">
          {/* Header Banner */}
          <div className="mb-4 flex flex-wrap w-full items-center justify-between gap-2 border-b border-border/60 pb-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Link2 className="size-4 text-primary" />
              <span className="font-mono uppercase tracking-wider text-[11px] font-bold text-foreground">
                {isDoubly
                  ? "Doubly-Linked List Memory Architecture"
                  : secondaryList
                    ? "Dual Linked List Interleaving / Merging Pipeline"
                    : isCycleMode
                      ? "Circular Linked List Cycle Detection"
                      : isReversalMode
                        ? "Pointer Inversion (Reverse Linked List)"
                        : "Singly-Linked List Memory Architecture"}
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-primary" /> Current (Active)
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-accent" /> Visited
              </span>
              {isCycleMode && (
                <span className="flex items-center gap-1 text-purple-400">
                  <span className="size-2 rounded-full bg-purple-500" /> Cycle Nodes
                </span>
              )}
            </div>
          </div>

          {/* Primary List Nodes */}
          {renderListNodes(list, secondaryList ? "List 1 (L1)" : "Linked List Chain", false)}

          {/* Secondary List if Merging / Interleaving */}
          {secondaryList && (
            <div className="mt-6 pt-4 border-t border-border/60">
              {renderListNodes(secondaryList, "List 2 (L2)", true)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
