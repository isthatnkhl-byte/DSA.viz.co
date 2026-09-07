import React, { useMemo, useState } from "react";
import type {
  LfuCacheState,
  SkipListState,
  SkipListNode,
  DisjointIntervalSetState,
} from "./VisualizerTypes";
import {
  Database,
  Layers,
  ArrowRight,
  ArrowLeftRight,
  Sparkles,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Zap,
  TrendingUp,
  Activity,
  GitCommit,
  CornerDownRight,
  Compass,
  Maximize2,
  RotateCw,
  Hash,
  FastForward,
} from "lucide-react";

export interface DesignDataStructureVisualizerProps {
  lfuCache?: LfuCacheState | null;
  skipList?: SkipListState | null;
  disjointIntervals?: DisjointIntervalSetState | null;
  desc?: string;
  variables?: Record<string, any> | null;
}

export function DesignDataStructureVisualizer({
  lfuCache,
  skipList,
  disjointIntervals,
  desc = "",
  variables,
}: DesignDataStructureVisualizerProps) {
  const [activeTab, setActiveTab] = useState<"lfu" | "skiplist" | "intervals">(
    lfuCache ? "lfu" : skipList ? "skiplist" : disjointIntervals ? "intervals" : "lfu"
  );

  // Sync tab with available props if needed
  const effectiveTab = useMemo(() => {
    if (lfuCache) return "lfu";
    if (skipList) return "skiplist";
    if (disjointIntervals) return "intervals";
    return activeTab;
  }, [lfuCache, skipList, disjointIntervals, activeTab]);

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Tab Switcher if multiple are present or for preview */}
      {(Number(Boolean(lfuCache)) + Number(Boolean(skipList)) + Number(Boolean(disjointIntervals)) > 1) && (
        <div className="flex items-center gap-1.5 p-1 bg-card/60 border border-border/80 rounded-xl w-fit">
          {lfuCache && (
            <button
              onClick={() => setActiveTab("lfu")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                effectiveTab === "lfu"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Database className="size-3.5" />
              LFU Cache Engine
            </button>
          )}
          {skipList && (
            <button
              onClick={() => setActiveTab("skiplist")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                effectiveTab === "skiplist"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FastForward className="size-3.5" />
              Skip List Expressways
            </button>
          )}
          {disjointIntervals && (
            <button
              onClick={() => setActiveTab("intervals")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                effectiveTab === "intervals"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers className="size-3.5" />
              Disjoint Intervals
            </button>
          )}
        </div>
      )}

      {/* 1. LFU Cache Component */}
      {effectiveTab === "lfu" && lfuCache && <LfuCacheRenderer lfu={lfuCache} />}

      {/* 2. Skip List Component */}
      {effectiveTab === "skiplist" && skipList && <SkipListRenderer skiplist={skipList} />}

      {/* 3. Disjoint Intervals Component */}
      {effectiveTab === "intervals" && disjointIntervals && (
        <DisjointIntervalsRenderer intervalsState={disjointIntervals} />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// 1. LFU CACHE RENDERER
// -------------------------------------------------------------
function LfuCacheRenderer({ lfu }: { lfu: LfuCacheState }) {
  const {
    capacity,
    size,
    minFreq,
    keyTable = {},
    freqTable = {},
    activeKey,
    activeVal,
    activeFreq,
    evictedKey,
    evictedVal,
    evictedFreq,
    action,
    hitOrMiss,
    reason,
  } = lfu;

  // Extract sorted frequencies
  const sortedFreqs = useMemo(() => {
    const freqs = Object.keys(freqTable)
      .map(Number)
      .filter((n) => !isNaN(n))
      .sort((a, b) => a - b);
    // Ensure minFreq is represented even if 1
    if (freqs.length === 0 && minFreq > 0) freqs.push(minFreq);
    return freqs;
  }, [freqTable, minFreq]);

  return (
    <div className="flex flex-col gap-4 w-full p-4.5 rounded-2xl bg-gradient-to-b from-card/90 via-card/50 to-background/90 border border-primary/30 shadow-inner">
      {/* Header HUD */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/25">
            <Database className="size-4 text-primary" />
          </div>
          <div>
            <h4 className="font-mono text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              LFU Cache (O(1) Frequency Buckets + Doubly Linked Lists)
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Key Table for O(1) value lookup &middot; Freq Table for O(1) eviction of least frequently &amp; least recently used item
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {/* Capacity & Occupancy */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-background border border-border shadow-xs">
            <span className="text-muted-foreground text-[11px]">Size / Cap:</span>
            <strong className="text-foreground">{size ?? Object.keys(keyTable).length}</strong>
            <span className="text-muted-foreground">/</span>
            <strong className="text-primary">{capacity}</strong>
          </div>

          {/* Min Frequency Tracker Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 shadow-xs">
            <Sparkles className="size-3 text-amber-400" />
            <span className="text-[11px] font-bold">min_freq:</span>
            <strong className="text-amber-200 font-extrabold text-sm">{minFreq}</strong>
          </div>

          {/* Hit or Miss Indicator */}
          {hitOrMiss === "hit" && (
            <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black flex items-center gap-1 shadow-xs">
              <CheckCircle2 className="size-3.5 text-emerald-400" /> HIT
            </span>
          )}
          {hitOrMiss === "miss" && (
            <span className="px-3 py-1 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold flex items-center gap-1 shadow-xs">
              <XCircle className="size-3.5 text-rose-400" /> MISS
            </span>
          )}
        </div>
      </div>

      {/* Action / Eviction Callout Bar */}
      {(action || reason || evictedKey !== undefined) && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-background/90 border border-border text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-semibold">Active Operation:</span>
            {action && (
              <span className="px-2.5 py-0.5 rounded-md bg-primary/15 text-primary font-bold border border-primary/30 uppercase text-[11px]">
                {action}
              </span>
            )}
            {activeKey !== undefined && activeKey !== null && (
              <span className="text-foreground font-medium">
                Key <strong className="text-primary font-bold">[{String(activeKey)}]</strong>
                {activeVal !== undefined && <> = <strong className="text-emerald-400 font-bold">{String(activeVal)}</strong></>}
                {activeFreq !== undefined && activeFreq !== null && (
                  <span className="ml-1 text-muted-foreground">
                    (freq &rarr; <span className="text-amber-300 font-bold">{activeFreq}</span>)
                  </span>
                )}
              </span>
            )}
          </div>

          {evictedKey !== undefined && evictedKey !== null && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 font-bold text-[11px]">
              <ShieldAlert className="size-3.5 text-rose-400 shrink-0" />
              <span>Evicted LFU Key: <strong className="text-rose-200">[{String(evictedKey)}]</strong> (freq: {evictedFreq ?? minFreq})</span>
            </div>
          )}

          {reason && <span className="text-muted-foreground italic text-[11px]">{reason}</span>}
        </div>
      )}

      {/* Core Dual Structure Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 1. Key Table: key -> { val, freq } */}
        <div className="flex flex-col gap-2.5 p-3.5 rounded-xl bg-background/80 border border-border/80 shadow-xs">
          <div className="flex items-center justify-between text-xs font-mono font-bold text-muted-foreground border-b border-border/60 pb-2">
            <span className="flex items-center gap-1.5 text-foreground">
              <Layers className="size-3.5 text-indigo-400" />
              Key Table (O(1) Access)
            </span>
            <span className="text-[11px]">{Object.keys(keyTable).length} entries</span>
          </div>

          <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto">
            {Object.keys(keyTable).length === 0 ? (
              <span className="text-xs font-mono text-muted-foreground italic py-6 text-center">
                Key Table is currently empty
              </span>
            ) : (
              Object.entries(keyTable).map(([k, item]) => {
                const isActive = String(k) === String(activeKey);
                const isMin = item.freq === minFreq;

                return (
                  <div
                    key={`lfu-key-${k}`}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl border font-mono text-xs transition-all ${
                      isActive
                        ? "bg-primary/20 border-primary text-primary font-bold shadow-xs ring-1 ring-primary/50 scale-[1.02]"
                        : isMin
                          ? "bg-amber-500/10 border-amber-500/30 text-foreground"
                          : "bg-card/80 border-border text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground text-[11px]">key:</span>
                      <strong className="text-foreground text-sm font-black">{k}</strong>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center gap-1 text-[11px]">
                        <span className="text-muted-foreground">val:</span>
                        <span className="px-1.5 py-0.5 rounded bg-muted text-foreground font-bold">
                          {String(item.val)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px]">
                        <span className="text-muted-foreground">freq:</span>
                        <span
                          className={`px-1.5 py-0.5 rounded font-black ${
                            isMin
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                          }`}
                        >
                          {item.freq}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 2. Frequency Buckets with Doubly Linked Lists (freq -> DLL) */}
        <div className="lg:col-span-2 flex flex-col gap-3 p-3.5 rounded-xl bg-background/80 border border-border/80 shadow-xs overflow-hidden">
          <div className="flex flex-wrap items-center justify-between text-xs font-mono font-bold text-muted-foreground border-b border-border/60 pb-2 gap-2">
            <span className="flex items-center gap-1.5 text-foreground">
              <ArrowLeftRight className="size-3.5 text-primary" />
              Frequency Buckets (freq &rarr; Doubly Linked List)
            </span>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-emerald-400 font-bold">Head (Most Recent)</span>
              <span className="text-muted-foreground">&harr;</span>
              <span className="text-rose-400 font-bold">Tail (Eviction Candidate)</span>
            </div>
          </div>

          {/* Frequency Rows */}
          <div className="flex flex-col gap-3 max-h-[320px] overflow-y-auto pr-1">
            {sortedFreqs.length === 0 ? (
              <span className="text-xs font-mono text-muted-foreground italic py-6 text-center">
                No frequency buckets populated
              </span>
            ) : (
              sortedFreqs.map((freq) => {
                const nodes = freqTable[freq] || [];
                const isMin = freq === minFreq;

                return (
                  <div
                    key={`freq-bucket-${freq}`}
                    className={`flex flex-col gap-2 p-2.5 rounded-xl border transition-all ${
                      isMin
                        ? "bg-amber-500/10 border-amber-500/40 shadow-xs"
                        : "bg-card/60 border-border/70"
                    }`}
                  >
                    {/* Bucket Label Header */}
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-md font-extrabold text-[11px] ${
                            isMin
                              ? "bg-amber-500 text-amber-950 shadow-xs"
                              : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                          }`}
                        >
                          Freq = {freq}
                        </span>
                        {isMin && (
                          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1">
                            <Sparkles className="size-2.5 text-amber-400" />
                            min_freq bucket
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground font-semibold">
                        {nodes.length} node{nodes.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    {/* Doubly Linked List Chain for this frequency */}
                    <div className="flex items-center gap-2 overflow-x-auto py-1 px-1 scrollbar-thin">
                      {/* Head Sentinel */}
                      <div className="flex flex-col items-center min-w-[42px]">
                        <span className="font-mono text-[8px] font-bold text-muted-foreground">SENTINEL</span>
                        <div className="rounded-md border border-dashed border-emerald-500/40 px-1.5 py-1 bg-emerald-500/10 font-mono text-[10px] text-emerald-300 font-bold">
                          HEAD
                        </div>
                      </div>

                      <ArrowLeftRight className="size-3.5 text-border shrink-0" />

                      {nodes.length === 0 ? (
                        <span className="text-[11px] font-mono text-muted-foreground italic px-3">
                          (empty bucket)
                        </span>
                      ) : (
                        nodes.map((node, idx) => {
                          const isActive = String(node.key) === String(activeKey);
                          const isTail = idx === nodes.length - 1;
                          const isHead = idx === 0;

                          return (
                            <React.Fragment key={`lfu-node-${freq}-${node.key}-${idx}`}>
                              <div className="flex flex-col items-center">
                                {/* Badge */}
                                <div className="flex items-center gap-0.5 mb-0.5 font-mono text-[8px]">
                                  {isHead && (
                                    <span className="px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold uppercase">
                                      MRU
                                    </span>
                                  )}
                                  {isTail && isMin && (
                                    <span className="px-1 py-0.2 rounded bg-rose-500 text-rose-950 font-black uppercase">
                                      EVICT NEXT
                                    </span>
                                  )}
                                </div>

                                <div
                                  className={`flex items-center rounded-xl border font-mono text-xs shadow-xs transition-all ${
                                    isActive
                                      ? "border-primary bg-primary/20 text-primary font-black shadow-md shadow-primary/20 ring-2 ring-primary/60 scale-105"
                                      : isTail && isMin
                                        ? "border-rose-500/60 bg-rose-500/15 text-rose-200 font-bold"
                                        : "border-border/80 bg-card text-foreground font-semibold"
                                  }`}
                                >
                                  <div className="px-2 py-1 border-r border-border/50 text-[11px] text-muted-foreground">
                                    k: <strong className="text-foreground">{String(node.key)}</strong>
                                  </div>
                                  <div className="px-2 py-1 text-xs font-black">
                                    {String(node.val)}
                                  </div>
                                </div>
                              </div>

                              {idx < nodes.length - 1 && (
                                <ArrowLeftRight className="size-3.5 text-primary shrink-0" />
                              )}
                            </React.Fragment>
                          );
                        })
                      )}

                      <ArrowLeftRight className="size-3.5 text-border shrink-0" />

                      {/* Tail Sentinel */}
                      <div className="flex flex-col items-center min-w-[42px]">
                        <span className="font-mono text-[8px] font-bold text-muted-foreground">SENTINEL</span>
                        <div className="rounded-md border border-dashed border-rose-500/40 px-1.5 py-1 bg-rose-500/10 font-mono text-[10px] text-rose-300 font-bold">
                          TAIL
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 2. SKIP LIST RENDERER
// -------------------------------------------------------------
function SkipListRenderer({ skiplist }: { skiplist: SkipListState }) {
  const {
    maxLevel,
    currentLevel,
    levels = [],
    searchPath = [],
    targetVal,
    found,
    operation,
    probabilisticHeight,
    reason,
  } = skiplist;

  // Track search path set for quick lookup: `${level}:${val}`
  const searchPathSet = useMemo(() => {
    const set = new Set<string>();
    searchPath.forEach((p) => {
      set.add(`${p.level}:${p.val}`);
    });
    return set;
  }, [searchPath]);

  return (
    <div className="flex flex-col gap-4 w-full p-4.5 rounded-2xl bg-gradient-to-b from-card/90 via-card/50 to-background/90 border border-primary/30 shadow-inner">
      {/* Header HUD */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/25">
            <FastForward className="size-4 text-primary" />
          </div>
          <div>
            <h4 className="font-mono text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              Skip List (Multi-Level Probabilistic Expressways)
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Level $K$ skips exponentially more nodes &middot; Expected $O(\log n)$ search, insertion, and deletion
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-background border border-border shadow-xs">
            <span className="text-muted-foreground text-[11px]">Max Levels:</span>
            <strong className="text-foreground">{maxLevel}</strong>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 shadow-xs">
            <span className="text-[11px]">Active Level:</span>
            <strong className="text-indigo-200 font-bold">{currentLevel}</strong>
          </div>

          {targetVal !== undefined && targetVal !== null && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary/15 border border-primary/40 text-primary shadow-xs font-bold">
              <span>Target:</span>
              <strong className="text-foreground">{String(targetVal)}</strong>
            </div>
          )}

          {found === true && (
            <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black flex items-center gap-1 shadow-xs">
              <CheckCircle2 className="size-3.5 text-emerald-400" /> FOUND
            </span>
          )}
          {found === false && (
            <span className="px-3 py-1 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold flex items-center gap-1 shadow-xs">
              <XCircle className="size-3.5 text-rose-400" /> NOT FOUND
            </span>
          )}
        </div>
      </div>

      {/* Operation & Search Descent Breadcrumb */}
      {(operation || reason || probabilisticHeight !== undefined || searchPath.length > 0) && (
        <div className="flex flex-col gap-2 p-3 rounded-xl bg-background/90 border border-border text-xs font-mono">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-semibold">Operation:</span>
              {operation && (
                <span className="px-2.5 py-0.5 rounded-md bg-primary/15 text-primary font-bold border border-primary/30 uppercase text-[11px]">
                  {operation}
                </span>
              )}
              {probabilisticHeight !== undefined && probabilisticHeight !== null && (
                <span className="text-amber-300 font-semibold flex items-center gap-1">
                  <Sparkles className="size-3" /> Coin-flip Tower Height: <strong>{probabilisticHeight}</strong>
                </span>
              )}
            </div>
            {reason && <span className="text-muted-foreground italic text-[11px]">{reason}</span>}
          </div>

          {/* Search Path Sequence Steps */}
          {searchPath.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-border/50 text-[11px]">
              <span className="text-muted-foreground font-semibold">Descent Trajectory:</span>
              {searchPath.map((step, idx) => (
                <React.Fragment key={`path-step-${idx}`}>
                  <span className="px-2 py-0.5 rounded-md bg-card border border-primary/30 text-foreground font-bold flex items-center gap-1">
                    <span className="text-primary font-black">L{step.level}:</span>
                    <span>{String(step.val)}</span>
                    {step.action === "drop_down" && (
                      <CornerDownRight className="size-3 text-amber-400 rotate-45" />
                    )}
                    {step.action === "step_forward" && (
                      <ArrowRight className="size-3 text-sky-400" />
                    )}
                  </span>
                  {idx < searchPath.length - 1 && (
                    <span className="text-muted-foreground">&rarr;</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Skip List Expressway Grid */}
      <div className="flex flex-col gap-2.5 overflow-x-auto p-3 rounded-xl bg-background/70 border border-border/80 scrollbar-thin">
        {levels.length === 0 ? (
          <span className="text-xs font-mono text-muted-foreground italic py-6 text-center">
            Skip list is empty
          </span>
        ) : (
          levels
            .slice()
            .reverse()
            .map((lvl) => {
              const isLevelActive = lvl.levelIndex === currentLevel;

              return (
                <div
                  key={`skiplist-level-${lvl.levelIndex}`}
                  className={`flex items-center gap-2 py-1.5 px-2 rounded-xl transition-all ${
                    isLevelActive
                      ? "bg-primary/10 border border-primary/40 shadow-xs"
                      : "bg-card/40 border border-transparent"
                  }`}
                >
                  {/* Level Header Badge */}
                  <div className="min-w-[65px] flex items-center gap-1.5 font-mono text-xs">
                    <span
                      className={`px-2 py-1 rounded-lg font-black text-[11px] ${
                        lvl.levelIndex === 0
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                      }`}
                    >
                      L{lvl.levelIndex}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {lvl.levelIndex === 0 ? "Base" : `Exp`}
                    </span>
                  </div>

                  {/* Level Nodes Expressway Track */}
                  <div className="flex items-center gap-1.5">
                    {/* Head Sentinel */}
                    <div className="px-2 py-1 rounded-lg border border-dashed border-border bg-muted/40 font-mono text-[11px] text-muted-foreground font-bold">
                      HEAD
                    </div>

                    <ArrowRight className="size-3.5 text-border shrink-0" />

                    {lvl.nodes.map((node, nIdx) => {
                      const isPath = searchPathSet.has(`${lvl.levelIndex}:${node.val}`) || node.isPath;
                      const isMatch = (targetVal !== undefined && String(node.val) === String(targetVal)) || node.isMatch;

                      return (
                        <React.Fragment key={`node-${lvl.levelIndex}-${node.val}-${nIdx}`}>
                          <div
                            className={`flex flex-col items-center px-3 py-1.5 rounded-xl border font-mono text-xs shadow-xs transition-all ${
                              isMatch
                                ? "bg-emerald-500/25 border-emerald-400 text-emerald-200 font-black ring-2 ring-emerald-400/50 scale-105"
                                : isPath
                                  ? "bg-primary/20 border-primary text-primary font-extrabold shadow-sm ring-1 ring-primary/50"
                                  : "bg-card border-border/80 text-foreground font-medium"
                            }`}
                          >
                            <span className="text-sm font-black">{String(node.val)}</span>
                            {node.span && node.span > 1 && (
                              <span className="text-[9px] text-muted-foreground mt-0.5">
                                span: {node.span}
                              </span>
                            )}
                          </div>

                          {nIdx < lvl.nodes.length - 1 && (
                            <div className="flex items-center gap-0.5 px-0.5">
                              <div className="h-[2px] w-4 bg-primary/40 rounded-full" />
                              <ArrowRight className="size-3.5 text-primary shrink-0" />
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}

                    <ArrowRight className="size-3.5 text-border shrink-0" />

                    {/* NIL / Tail Sentinel */}
                    <div className="px-2 py-1 rounded-lg border border-dashed border-border bg-muted/40 font-mono text-[11px] text-muted-foreground font-bold">
                      NIL ∅
                    </div>
                  </div>
                </div>
              );
            })
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 3. DISJOINT INTERVALS RENDERER
// -------------------------------------------------------------
function DisjointIntervalsRenderer({
  intervalsState,
}: {
  intervalsState: DisjointIntervalSetState;
}) {
  const {
    intervals = [],
    queryPoint,
    insertedInterval,
    overlappingIntervals = [],
    mergedInterval,
    operation,
    explanation,
  } = intervalsState;

  // Compute minimum and maximum coordinate bounds for proportional timeline
  const { minBound, maxBound, span } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;

    intervals.forEach(([s, e]) => {
      if (s < min) min = s;
      if (e > max) max = e;
    });

    if (insertedInterval) {
      if (insertedInterval[0] < min) min = insertedInterval[0];
      if (insertedInterval[1] > max) max = insertedInterval[1];
    }
    if (queryPoint !== undefined && queryPoint !== null) {
      if (queryPoint < min) min = queryPoint;
      if (queryPoint > max) max = queryPoint;
    }

    if (!isFinite(min) || !isFinite(max)) {
      min = 0;
      max = 10;
    }

    // Add padding
    const padding = Math.max(1, Math.round((max - min) * 0.1));
    return {
      minBound: min - padding,
      maxBound: max + padding,
      span: Math.max(1, max - min + padding * 2),
    };
  }, [intervals, insertedInterval, queryPoint]);

  return (
    <div className="flex flex-col gap-4 w-full p-4.5 rounded-2xl bg-gradient-to-b from-card/90 via-card/50 to-background/90 border border-primary/30 shadow-inner">
      {/* Header HUD */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/25">
            <Layers className="size-4 text-primary" />
          </div>
          <div>
            <h4 className="font-mono text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              Disjoint Interval Sets &amp; Range Maps (Summary Ranges)
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Maintains sorted, non-overlapping interval ranges $[L_i, R_i]$ with $O(\log N)$ range insertion &amp; coalescing
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-background border border-border shadow-xs">
            <span className="text-muted-foreground text-[11px]">Disjoint Segments:</span>
            <strong className="text-primary font-bold">{intervals.length}</strong>
          </div>

          {queryPoint !== undefined && queryPoint !== null && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 shadow-xs">
              <span className="text-[11px]">Query Point:</span>
              <strong className="text-indigo-200 font-bold">{queryPoint}</strong>
            </div>
          )}

          {operation && (
            <span className="px-3 py-1 rounded-xl bg-primary/15 text-primary border border-primary/30 font-bold uppercase text-[11px]">
              {operation}
            </span>
          )}
        </div>
      </div>

      {/* Action / Merging Details Callout */}
      {(insertedInterval || mergedInterval || explanation) && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-background/90 border border-border text-xs font-mono">
          <div className="flex items-center gap-3">
            {insertedInterval && (
              <span className="flex items-center gap-1 text-sky-300 font-bold">
                <span className="text-muted-foreground font-normal">Inserted Range:</span>
                <span className="px-2 py-0.5 rounded bg-sky-500/20 border border-sky-500/40">
                  [{insertedInterval[0]}, {insertedInterval[1]}]
                </span>
              </span>
            )}
            {mergedInterval && (
              <span className="flex items-center gap-1 text-emerald-300 font-bold">
                <span className="text-muted-foreground font-normal">&rarr; Merged Coalescence:</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 font-black">
                  [{mergedInterval[0]}, {mergedInterval[1]}]
                </span>
              </span>
            )}
          </div>

          {explanation && <span className="text-muted-foreground italic text-[11px]">{explanation}</span>}
        </div>
      )}

      {/* Disjoint Range Segments Badges */}
      <div className="flex flex-wrap items-center gap-2 p-3.5 rounded-xl bg-background/80 border border-border/80">
        <span className="text-xs font-mono font-bold text-muted-foreground mr-1 flex items-center gap-1">
          <Hash className="size-3.5" /> Disjoint Ranges:
        </span>

        {intervals.length === 0 ? (
          <span className="text-xs font-mono text-muted-foreground italic">
            No intervals currently stored (empty set)
          </span>
        ) : (
          intervals.map(([start, end], idx) => {
            const isMerged = mergedInterval && mergedInterval[0] === start && mergedInterval[1] === end;

            return (
              <div
                key={`interval-badge-${start}-${end}-${idx}`}
                className={`px-3 py-1.5 rounded-xl border font-mono text-xs font-bold transition-all flex items-center gap-2 shadow-xs ${
                  isMerged
                    ? "bg-emerald-500/20 border-emerald-400 text-emerald-200 ring-2 ring-emerald-400/40 scale-105"
                    : "bg-card border-border/80 text-foreground"
                }`}
              >
                <span className="text-primary font-black">[{start}, {end}]</span>
                <span className="text-[10px] text-muted-foreground">
                  (len: {end - start + 1})
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* 1D Visual Coordinate Timeline */}
      <div className="flex flex-col gap-2 p-4 rounded-xl bg-background/70 border border-border/80">
        <div className="flex items-center justify-between text-xs font-mono font-bold text-muted-foreground border-b border-border/60 pb-2">
          <span>Coordinate Ribbon Projection</span>
          <span>[{minBound} &dots; {maxBound}]</span>
        </div>

        <div className="relative h-14 w-full bg-card/60 rounded-xl border border-border/60 overflow-hidden my-2">
          {/* Grid lines */}
          <div className="absolute inset-0 flex justify-between px-2 pointer-events-none opacity-20">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={`grid-line-${i}`} className="h-full w-[1px] bg-border" />
            ))}
          </div>

          {/* Render Intervals on Ribbon */}
          {intervals.map(([start, end], idx) => {
            const leftPct = Math.max(0, Math.min(100, ((start - minBound) / span) * 100));
            const widthPct = Math.max(2, Math.min(100 - leftPct, ((end - start + 0.5) / span) * 100));

            return (
              <div
                key={`ribbon-iv-${start}-${end}-${idx}`}
                style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                className="absolute top-2.5 bottom-2.5 rounded-lg bg-primary/25 border-2 border-primary shadow-xs flex items-center justify-center px-1.5 text-[11px] font-mono font-extrabold text-primary transition-all overflow-hidden"
              >
                [{start}, {end}]
              </div>
            );
          })}

          {/* Inserted Range Preview */}
          {insertedInterval && (
            <div
              style={{
                left: `${Math.max(0, Math.min(100, ((insertedInterval[0] - minBound) / span) * 100))}%`,
                width: `${Math.max(2, Math.min(100, ((insertedInterval[1] - insertedInterval[0] + 0.5) / span) * 100))}%`,
              }}
              className="absolute top-1 bottom-1 rounded-lg bg-sky-500/20 border-2 border-dashed border-sky-400 flex items-center justify-center text-[10px] font-mono font-bold text-sky-300 pointer-events-none animate-pulse"
            >
              + [{insertedInterval[0]}, {insertedInterval[1]}]
            </div>
          )}

          {/* Query Point Needle */}
          {queryPoint !== undefined && queryPoint !== null && (
            <div
              style={{
                left: `${Math.max(0, Math.min(100, ((queryPoint - minBound) / span) * 100))}%`,
              }}
              className="absolute top-0 bottom-0 w-[2px] bg-rose-500 shadow-md flex flex-col items-center pointer-events-none z-10"
            >
              <div className="size-2 rounded-full bg-rose-500 -mt-1 shadow-xs" />
              <span className="font-mono text-[9px] font-black text-rose-300 bg-background/90 px-1 rounded mt-auto mb-0.5 border border-rose-500/40">
                q={queryPoint}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
