import React, { useState, useEffect, useMemo, useCallback } from "react";
import { AiWord } from "@/components/brand/AiWord";
import {
  Play,
  Pause,
  RotateCcw,
  GitGraph,
  TrendingUp,
  Boxes,
  Binary,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Terminal,
  Cpu,
  CheckCircle2,
  ArrowRight,
  Layers,
  Target,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type VisualizerTab = "sorting" | "graph" | "tree" | "dp";

interface TabMeta {
  id: VisualizerTab;
  label: string;
  shortLabel: string;
  subtitle: string;
  timeComplexity: string;
  spaceComplexity: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SHOWROOM_TABS: TabMeta[] = [
  {
    id: "sorting",
    label: "QuickSort Partition",
    shortLabel: "QuickSort",
    subtitle: "Lomuto In-Place Divide & Conquer",
    timeComplexity: "O(n log n)",
    spaceComplexity: "O(log n)",
    icon: TrendingUp,
  },
  {
    id: "graph",
    label: "Graph BFS Shortest Path",
    shortLabel: "Graph BFS",
    subtitle: "Multi-Layer Wavefront Traversal",
    timeComplexity: "O(V + E)",
    spaceComplexity: "O(V)",
    icon: GitGraph,
  },
  {
    id: "tree",
    label: "Binary Search Tree",
    shortLabel: "BST Lookup",
    subtitle: "Logarithmic Subtree Pruning",
    timeComplexity: "O(log n)",
    spaceComplexity: "O(1)",
    icon: Binary,
  },
  {
    id: "dp",
    label: "0/1 Knapsack 2D DP",
    shortLabel: "2D Matrix DP",
    subtitle: "State Transition & Backtracking",
    timeComplexity: "O(N · W)",
    spaceComplexity: "O(N · W)",
    icon: Boxes,
  },
];

const SPRING_FAST = {
  type: "spring" as const,
  stiffness: 340,
  damping: 30,
  mass: 0.75,
};

const SPRING_SMOOTH = {
  type: "spring" as const,
  stiffness: 260,
  damping: 26,
  mass: 0.85,
};

export function LowerInteractiveShowcase() {
  const [activeTab, setActiveTab] = useState<VisualizerTab>("sorting");
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState<number>(1);

  const activeMeta = SHOWROOM_TABS.find((t) => t.id === activeTab) ?? SHOWROOM_TABS[0]!;

  return (
    <section className="relative py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full my-12 overflow-hidden">
      {/* Dynamic Ambient Backdrop */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/8 via-accent/10 to-transparent rounded-3xl blur-3xl -z-10 pointer-events-none" />
      <div className="absolute -bottom-16 left-1/4 w-[560px] h-[340px] bg-accent/10 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute -top-16 right-1/4 w-[560px] h-[340px] bg-primary/12 blur-[140px] rounded-full pointer-events-none" />

      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-mono font-bold uppercase tracking-wider text-primary mb-3 shadow-xs">
          <AiWord className="size-3.5 text-primary animate-pulse" />
          <span>Interactive Spatial Playground</span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-black tracking-tight text-foreground">
          Visual Algorithm{" "}
          <span className="font-pixel text-4xl sm:text-5xl md:text-6xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent py-1 block mt-3 mb-2 drop-shadow-[0_0_20px_color-mix(in_oklch,var(--primary)_45%,transparent)]">
            Showroom
          </span>
        </h2>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground font-sans leading-relaxed max-w-2xl mx-auto">
          Explore full-scale algorithmic execution across sorting partitions, multi-layer graph wavefronts, logarithmic tree pruning, and 2D dynamic programming state matrices.
        </p>
      </div>

      {/* Architectural 4-Column Tab Switcher (Never wraps awkwardly) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 p-2 rounded-2xl bg-card/90 border border-border/80 backdrop-blur-xl shadow-xl mb-6">
        {SHOWROOM_TABS.map((tab) => {
          const isSelected = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setIsPlaying(true);
              }}
              className={`relative flex items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-colors duration-200 cursor-pointer overflow-hidden ${
                isSelected
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              }`}
            >
              {isSelected && (
                <motion.div
                  layoutId="showroom-active-tab-pill"
                  transition={SPRING_FAST}
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary to-primary/90 shadow-lg shadow-primary/25"
                />
              )}
              <div
                className={`relative z-10 flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                  isSelected
                    ? "border-white/25 bg-white/15 text-primary-foreground"
                    : "border-border/70 bg-background/70 text-primary"
                }`}
              >
                <Icon className="size-4" />
              </div>
              <div className="relative z-10 min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono text-xs sm:text-[13px] font-bold truncate">
                    {tab.label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`font-mono text-[10px] font-semibold truncate ${
                      isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                    }`}
                  >
                    {tab.timeComplexity}
                  </span>
                  <span className={isSelected ? "text-primary-foreground/70" : "text-border"} aria-hidden="true">•</span>
                  <span
                    className={`font-mono text-[10px] truncate hidden sm:inline ${
                      isSelected ? "text-primary-foreground/75" : "text-muted-foreground/80"
                    }`}
                  >
                    {tab.shortLabel}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Interactive Showroom Frame */}
      <div className="rounded-3xl border border-border/80 bg-card/95 backdrop-blur-2xl shadow-2xl overflow-hidden">
        {activeTab === "sorting" && (
          <QuickSortVisualizer
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            speed={speed}
            setSpeed={setSpeed}
            meta={activeMeta}
          />
        )}
        {activeTab === "graph" && (
          <GraphBfsVisualizer
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            speed={speed}
            setSpeed={setSpeed}
            meta={activeMeta}
          />
        )}
        {activeTab === "tree" && (
          <BstTraversalVisualizer
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            speed={speed}
            setSpeed={setSpeed}
            meta={activeMeta}
          />
        )}
        {activeTab === "dp" && (
          <DpGridVisualizer
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            speed={speed}
            setSpeed={setSpeed}
            meta={activeMeta}
          />
        )}
      </div>
    </section>
  );
}

/* =========================================================================
   SHARED TRANSPORT BAR & TIMELINE SCRUBBER
   ========================================================================= */
interface TransportProps {
  meta: TabMeta;
  stepIndex: number;
  totalSteps: number;
  onSelectStep: (idx: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  speed: number;
  setSpeed: (s: number) => void;
  statusMessage: string;
  extraAction?: React.ReactNode;
}

function ShowroomTransportHeader({
  meta,
  stepIndex,
  totalSteps,
  onSelectStep,
  isPlaying,
  setIsPlaying,
  speed,
  setSpeed,
  statusMessage,
  extraAction,
}: TransportProps) {
  return (
    <div className="border-b border-border/70 bg-secondary/35 px-5 sm:px-7 py-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left: Algorithm badge + live narration */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold text-primary uppercase tracking-wider">
              <span className="size-2 rounded-full bg-primary animate-ping" />
              {meta.subtitle}
            </span>
            <span className="rounded-md bg-primary/12 border border-primary/30 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
              Time: {meta.timeComplexity}
            </span>
            <span className="rounded-md bg-accent/12 border border-accent/30 px-2 py-0.5 font-mono text-[10px] font-bold text-accent">
              Space: {meta.spaceComplexity}
            </span>
          </div>
          <p className="font-mono text-xs sm:text-sm font-bold text-foreground mt-1.5 truncate">
            {statusMessage}
          </p>
        </div>

        {/* Right: Transport & Speed Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {extraAction}

          {/* Speed Pills */}
          <div className="hidden sm:flex items-center rounded-xl border border-border/80 bg-background/80 p-0.5">
            {[0.5, 1, 1.5, 2].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className={`px-2 py-1 rounded-lg font-mono text-[10px] font-bold transition-colors cursor-pointer ${
                  speed === s
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Step Back */}
          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              onSelectStep((stepIndex - 1 + totalSteps) % totalSteps);
            }}
            title="Previous Step"
            className="rounded-xl border border-border/80 bg-background/80 p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
          >
            <ChevronLeft className="size-4" />
          </button>

          {/* Play / Pause */}
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/15 px-3.5 py-1.5 font-mono text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer shadow-xs"
          >
            {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            <span>{isPlaying ? "Pause" : "Play"}</span>
          </button>

          {/* Step Forward */}
          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              onSelectStep((stepIndex + 1) % totalSteps);
            }}
            title="Next Step"
            className="rounded-xl border border-border/80 bg-background/80 p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
          >
            <ChevronRight className="size-4" />
          </button>

          {/* Reset */}
          <button
            type="button"
            onClick={() => {
              onSelectStep(0);
              setIsPlaying(true);
            }}
            title="Reset to Step 1"
            className="rounded-xl border border-border/80 bg-background/80 p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
          >
            <RotateCcw className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Interactive Timeline Scrubber Bar */}
      <div className="mt-3.5 flex items-center gap-3">
        <span className="font-mono text-[10px] font-bold text-muted-foreground shrink-0">
          STEP {String(stepIndex + 1).padStart(2, "0")} / {String(totalSteps).padStart(2, "0")}
        </span>
        <div className="flex-1 flex items-center gap-1">
          {Array.from({ length: totalSteps }).map((_, idx) => {
            const isCurrent = idx === stepIndex;
            const isPast = idx < stepIndex;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  onSelectStep(idx);
                }}
                aria-label={`Jump to step ${idx + 1}`}
                className="group relative flex-1 h-2 rounded-full bg-border/60 overflow-hidden cursor-pointer"
              >
                <div
                  className={`h-full rounded-full transition-all duration-200 ${
                    isCurrent
                      ? "bg-primary"
                      : isPast
                        ? "bg-primary/50"
                        : "bg-transparent group-hover:bg-primary/25"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   1. QUICKSORT PARTITION ANIMATION (60FPS PHYSICAL BAR SWAPS & LASER PIVOT)
   ========================================================================= */
interface SortItem {
  id: string;
  val: number;
}

interface SortStep {
  items: SortItem[];
  p: number | null;
  i: number;
  j: number | null;
  swappedIndices: [number, number] | null;
  sortedIds: string[];
  codeLine: number;
  msg: string;
  comparisons: number;
  swaps: number;
}

const QUICKSORT_CODE = [
  "int partition(vector<int>& arr, int low, int high) {",
  "  int pivot = arr[high]; // Select rightmost pivot",
  "  int i = low - 1;       // Boundary of elements <= pivot",
  "  for (int j = low; j < high; j++) {",
  "    if (arr[j] <= pivot) {",
  "      i++; swap(arr[i], arr[j]);",
  "    }",
  "  }",
  "  swap(arr[i + 1], arr[high]); // Lock pivot in place",
  "  return i + 1;",
  "}",
];

const PRESET_ARRAYS: number[][] = [
  [48, 22, 76, 35, 92, 18, 64, 30, 84, 54],
  [62, 19, 85, 41, 29, 73, 14, 90, 38, 50],
  [34, 82, 25, 68, 16, 94, 44, 71, 28, 58],
];

function buildQuickSortSteps(rawValues: number[]): SortStep[] {
  const initial: SortItem[] = rawValues.map((val, idx) => ({
    id: `el-${idx}-${val}`,
    val,
  }));
  const steps: SortStep[] = [];
  const arr = initial.map((x) => ({ ...x }));
  const n = arr.length;
  const pivotIdx = n - 1;
  const pivotVal = arr[pivotIdx]!.val;
  let i = -1;
  let comparisons = 0;
  let swaps = 0;

  steps.push({
    items: arr.map((x) => ({ ...x })),
    p: pivotIdx,
    i: -1,
    j: 0,
    swappedIndices: null,
    sortedIds: [],
    codeLine: 1,
    msg: `Initialize Lomuto Partition: Pivot = arr[${pivotIdx}] = ${pivotVal}, boundary i = -1`,
    comparisons,
    swaps,
  });

  for (let j = 0; j < pivotIdx; j++) {
    comparisons++;
    const curVal = arr[j]!.val;
    if (curVal <= pivotVal) {
      i++;
      if (i !== j) {
        swaps++;
        const tmp = arr[i]!;
        arr[i] = arr[j]!;
        arr[j] = tmp;
        steps.push({
          items: arr.map((x) => ({ ...x })),
          p: pivotIdx,
          i,
          j,
          swappedIndices: [i, j],
          sortedIds: [],
          codeLine: 5,
          msg: `arr[${j}] (${curVal}) <= Pivot (${pivotVal}) → Increment i to ${i} & Swap(${arr[j]!.val} ⇄ ${arr[i]!.val})`,
          comparisons,
          swaps,
        });
      } else {
        steps.push({
          items: arr.map((x) => ({ ...x })),
          p: pivotIdx,
          i,
          j,
          swappedIndices: [i, j],
          sortedIds: [],
          codeLine: 5,
          msg: `arr[${j}] (${curVal}) <= Pivot (${pivotVal}) → Advance boundary i to [${i}] (in-place)`,
          comparisons,
          swaps,
        });
      }
    } else {
      steps.push({
        items: arr.map((x) => ({ ...x })),
        p: pivotIdx,
        i,
        j,
        swappedIndices: null,
        sortedIds: [],
        codeLine: 4,
        msg: `arr[${j}] (${curVal}) > Pivot (${pivotVal}) → Keep in greater partition, advance j`,
        comparisons,
        swaps,
      });
    }
  }

  // Place pivot at i + 1
  const finalPivotPos = i + 1;
  swaps++;
  const pivotItem = arr[pivotIdx]!;
  arr[pivotIdx] = arr[finalPivotPos]!;
  arr[finalPivotPos] = pivotItem;

  steps.push({
    items: arr.map((x) => ({ ...x })),
    p: finalPivotPos,
    i: finalPivotPos,
    j: null,
    swappedIndices: [finalPivotPos, pivotIdx],
    sortedIds: [pivotItem.id],
    codeLine: 8,
    msg: `🎯 Swap Pivot ${pivotVal} into partition index [${finalPivotPos}]. Left <= ${pivotVal} < Right!`,
    comparisons,
    swaps,
  });

  // Final sorted recursive preview
  const fullySorted = [...arr].sort((a, b) => a.val - b.val);
  steps.push({
    items: fullySorted,
    p: finalPivotPos,
    i: finalPivotPos,
    j: null,
    swappedIndices: null,
    sortedIds: fullySorted.map((x) => x.id),
    codeLine: 9,
    msg: `✨ Recursive partitions complete — all ${n} elements locked in ascending order!`,
    comparisons,
    swaps,
  });

  return steps;
}

function QuickSortVisualizer({
  isPlaying,
  setIsPlaying,
  speed,
  setSpeed,
  meta,
}: {
  isPlaying: boolean;
  setIsPlaying: (p: boolean) => void;
  speed: number;
  setSpeed: (s: number) => void;
  meta: TabMeta;
}) {
  const [presetIdx, setPresetIdx] = useState(0);
  const steps = useMemo(
    () => buildQuickSortSteps(PRESET_ARRAYS[presetIdx % PRESET_ARRAYS.length]!),
    [presetIdx]
  );
  const [stepIndex, setStepIndex] = useState(0);
  const current = steps[stepIndex] ?? steps[0]!;

  useEffect(() => {
    if (!isPlaying) return;
    const intervalMs = Math.round(1350 / speed);
    const timer = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % steps.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, speed, steps.length]);

  const handleShuffle = useCallback(() => {
    setPresetIdx((prev) => prev + 1);
    setStepIndex(0);
    setIsPlaying(true);
  }, [setIsPlaying]);

  const n = current.items.length;
  const pivotVal =
    current.p !== null && current.items[current.p]
      ? current.items[current.p]!.val
      : 54;

  return (
    <div>
      <ShowroomTransportHeader
        meta={meta}
        stepIndex={stepIndex}
        totalSteps={steps.length}
        onSelectStep={setStepIndex}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        speed={speed}
        setSpeed={setSpeed}
        statusMessage={current.msg}
        extraAction={
          <button
            type="button"
            onClick={handleShuffle}
            className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-background/80 px-3 py-1.5 font-mono text-xs font-bold text-foreground hover:bg-secondary transition-colors cursor-pointer"
          >
            <Shuffle className="size-3.5 text-primary" />
            <span className="hidden sm:inline">Shuffle Array</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Left 8 Cols: 60FPS Physical Bar Stage */}
        <div className="lg:col-span-8 p-5 sm:p-7 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-border/70">
          {/* Partition Telemetry Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-amber-500/15 border border-amber-500/40 px-2.5 py-1 font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                Pivot = {pivotVal}
              </span>
              <span className="rounded-lg bg-accent/15 border border-accent/40 px-2.5 py-1 font-mono text-xs font-bold text-accent">
                Boundary i = {current.i >= 0 ? `[${current.i}]` : "None (-1)"}
              </span>
              <span className="rounded-lg bg-primary/15 border border-primary/40 px-2.5 py-1 font-mono text-xs font-bold text-primary">
                Scanner j = {current.j !== null ? `[${current.j}]` : "Done"}
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono text-xs text-muted-foreground">
              <span>
                Comparisons: <strong className="text-foreground">{current.comparisons}</strong>
              </span>
              <span>•</span>
              <span>
                Swaps: <strong className="text-foreground">{current.swaps}</strong>
              </span>
            </div>
          </div>

          {/* Main Chart Stage */}
          <div className="relative rounded-2xl bg-background/90 border border-border/80 px-4 sm:px-6 pt-10 pb-5 shadow-inner overflow-hidden">
            {/* Subtle Technical Grid Lines */}
            <div
              className="absolute inset-0 opacity-25 pointer-events-none"
              style={{
                backgroundImage:
                  "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
                backgroundSize: "36px 36px",
              }}
            />

            {/* Horizontal Pivot Threshold Laser Line */}
            <div className="relative h-64 sm:h-72 w-full">
              <motion.div
                animate={{ bottom: `${pivotVal}%` }}
                transition={SPRING_SMOOTH}
                className="absolute inset-x-0 z-20 border-t-2 border-dashed border-amber-500/70 pointer-events-none flex items-center justify-end"
              >
                <span className=" -translate-y-1/2 rounded-md bg-amber-500 text-amber-950 px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-wider shadow-md">
                  Pivot Threshold ({pivotVal})
                </span>
              </motion.div>

              {/* Bars Container with 60FPS Layout Swapping */}
              <div className="relative z-10 h-full w-full flex items-end justify-between gap-2 sm:gap-3">
                {current.items.map((item, idx) => {
                  const isPivot = idx === current.p;
                  const isScan = idx === current.j;
                  const isLessEqualPartition = idx <= current.i && current.sortedIds.length <= 1;
                  const isSwapped =
                    current.swappedIndices !== null &&
                    (current.swappedIndices[0] === idx || current.swappedIndices[1] === idx);
                  const isSorted = current.sortedIds.includes(item.id);

                  let barBg =
                    "linear-gradient(180deg, color-mix(in oklch, var(--primary) 38%, transparent) 0%, color-mix(in oklch, var(--primary) 18%, transparent) 100%)";
                  let barBorder = "color-mix(in oklch, var(--primary) 55%, transparent)";
                  let barShadow = "none";

                  if (isSorted) {
                    barBg = "linear-gradient(180deg, #10b981 0%, #059669 100%)";
                    barBorder = "#34d399";
                    barShadow = "0 0 22px rgba(16, 185, 129, 0.45)";
                  } else if (isPivot) {
                    barBg = "linear-gradient(180deg, #fbbf24 0%, #d97706 100%)";
                    barBorder = "#fde68a";
                    barShadow = "0 0 24px rgba(245, 158, 11, 0.55)";
                  } else if (isScan) {
                    barBg =
                      "linear-gradient(180deg, var(--primary) 0%, color-mix(in oklch, var(--primary) 75%, black) 100%)";
                    barBorder = "var(--primary)";
                    barShadow = "0 0 24px color-mix(in oklch, var(--primary) 55%, transparent)";
                  } else if (isLessEqualPartition) {
                    barBg =
                      "linear-gradient(180deg, var(--accent) 0%, color-mix(in oklch, var(--accent) 70%, black) 100%)";
                    barBorder = "var(--accent)";
                    barShadow = "0 0 18px color-mix(in oklch, var(--accent) 40%, transparent)";
                  }

                  return (
                    <motion.div
                      key={item.id}
                      layout
                      transition={SPRING_FAST}
                      className="flex-1 h-full flex flex-col items-center justify-end"
                    >
                      {/* Value Pill Above Bar */}
                      <motion.span
                        animate={{
                          scale: isPivot || isScan || isSwapped ? 1.15 : 1,
                          y: isSwapped ? -4 : 0,
                        }}
                        transition={SPRING_FAST}
                        className={`font-mono text-xs sm:text-sm font-black mb-1.5 ${
                          isPivot
                            ? "text-amber-600 dark:text-amber-400"
                            : isScan
                              ? "text-primary"
                              : isSorted
                                ? "text-emerald-600 dark:text-emerald-400"
                                : isLessEqualPartition
                                  ? "text-accent"
                                  : "text-foreground/85"
                        }`}
                      >
                        {item.val}
                      </motion.span>

                      {/* Animated Bar */}
                      <motion.div
                        layout
                        initial={false}
                        animate={{
                          height: `${Math.max(12, item.val)}%`,
                          background: barBg,
                          borderColor: barBorder,
                          boxShadow: barShadow,
                        }}
                        transition={SPRING_FAST}
                        className="w-full rounded-t-xl border-2 relative overflow-hidden flex items-end justify-center pb-1.5"
                      >
                        <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
                        {isSwapped && (
                          <span className="font-mono text-[9px] font-black uppercase px-1 rounded bg-black/35 text-white">
                            ⇄
                          </span>
                        )}
                      </motion.div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Index Row */}
            <div className="mt-2 grid grid-cols-10 gap-2 sm:gap-3 border-t border-border/60 pt-2">
              {current.items.map((_, idx) => (
                <div key={idx} className="text-center font-mono text-[10px] font-bold text-muted-foreground">
                  [{idx}]
                </div>
              ))}
            </div>

            {/* 60FPS GPU Pointer Track */}
            <div className="relative h-8 mt-1 w-full overflow-hidden">
              {/* Boundary i Pointer */}
              {current.i >= 0 && current.sortedIds.length <= 1 && (
                <motion.div
                  initial={false}
                  animate={{ x: `${current.i * 100}%` }}
                  transition={SPRING_FAST}
                  style={{ width: `${100 / n}%` }}
                  className="absolute top-0 left-0 flex justify-center will-change-transform"
                >
                  <span className="rounded-md bg-accent text-accent-foreground px-1.5 py-0.5 font-mono text-[10px] font-black shadow-sm">
                    i={current.i}
                  </span>
                </motion.div>
              )}

              {/* Scanner j Pointer */}
              {current.j !== null && (
                <motion.div
                  initial={false}
                  animate={{ x: `${current.j * 100}%` }}
                  transition={SPRING_FAST}
                  style={{ width: `${100 / n}%` }}
                  className="absolute top-0 left-0 flex justify-center will-change-transform"
                >
                  <span className="rounded-md bg-primary text-primary-foreground px-1.5 py-0.5 font-mono text-[10px] font-black shadow-sm">
                    j={current.j}
                  </span>
                </motion.div>
              )}

              {/* Pivot Pointer */}
              {current.p !== null && (
                <motion.div
                  initial={false}
                  animate={{ x: `${current.p * 100}%` }}
                  transition={SPRING_FAST}
                  style={{ width: `${100 / n}%` }}
                  className="absolute top-0 left-0 flex justify-center will-change-transform"
                >
                  <span className="rounded-md bg-amber-500 text-amber-950 px-1.5 py-0.5 font-mono text-[10px] font-black shadow-sm">
                    PIVOT
                  </span>
                </motion.div>
              )}
            </div>
          </div>

          {/* Legend Bar */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-sm bg-amber-500" />
                <span className="text-muted-foreground">Pivot ({pivotVal})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-sm bg-accent" />
                <span className="text-muted-foreground">Partition &le; Pivot (0..i)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-sm bg-primary" />
                <span className="text-muted-foreground">Scanner Pointer (j)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-sm bg-emerald-500" />
                <span className="text-muted-foreground">Locked / Sorted</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Synchronized Code Trace & Partition Invariant */}
        <div className="lg:col-span-4 p-5 sm:p-6 bg-secondary/20 flex flex-col justify-between gap-5">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                <Terminal className="size-3.5 text-primary" />
                Lomuto Partition Trace
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">C++20</span>
            </div>

            <div className="rounded-2xl border border-border/80 bg-background/95 p-3 font-mono text-[11px] leading-relaxed shadow-inner overflow-x-auto">
              {QUICKSORT_CODE.map((line, idx) => {
                const isActive = current.codeLine === idx;
                return (
                  <div
                    key={idx}
                    className={`relative px-2.5 py-1 rounded-lg transition-colors ${
                      isActive ? "text-primary font-bold" : "text-muted-foreground"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="quicksort-code-highlight"
                        transition={SPRING_FAST}
                        className="absolute inset-0 rounded-lg bg-primary/12 border-l-2 border-primary pointer-events-none"
                      />
                    )}
                    <span className="relative z-10 select-none text-muted-foreground mr-2.5 inline-block w-3 text-right" aria-hidden="true">
                      {idx + 1}
                    </span>
                    <span className="relative z-10 whitespace-pre">{line}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Partition Subarray State Breakdown */}
          <div className="rounded-2xl border border-border/80 bg-background/80 p-4 space-y-3">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-foreground">
              <Layers className="size-3.5 text-accent" />
              <span>Loop Invariant Partitioning</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
              <div className="rounded-xl border border-accent/35 bg-accent/10 p-2.5">
                <div className="text-[10px] text-muted-foreground uppercase">Left Region (&le; {pivotVal})</div>
                <div className="text-sm font-black text-accent mt-0.5">
                  {current.i >= 0
                    ? current.items
                        .slice(0, current.i + 1)
                        .map((x) => x.val)
                        .join(", ")
                    : "Empty"}
                </div>
              </div>
              <div className="rounded-xl border border-primary/35 bg-primary/10 p-2.5">
                <div className="text-[10px] text-muted-foreground uppercase">Right Region (&gt; {pivotVal})</div>
                <div className="text-sm font-black text-primary mt-0.5">
                  {current.j !== null && current.j > current.i
                    ? current.items
                        .slice(current.i + 1, current.j + 1)
                        .map((x) => x.val)
                        .join(", ") || "None"
                    : "Partitioned"}
                </div>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Every element in <code className="text-accent font-bold">arr[0..i]</code> is guaranteed{" "}
              <code className="font-mono">&le; pivot</code>, while <code className="text-primary font-bold">arr[i+1..j-1]</code>{" "}
              holds elements strictly greater than the pivot.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   2. GRAPH BFS & SHORTEST PATH (9-NODE MULTI-LAYER NETWORK + INTERACTIVE TARGET)
   ========================================================================= */
interface GraphNodeDef {
  id: string;
  x: number;
  y: number;
  layer: number;
}

const BFS_NODES: GraphNodeDef[] = [
  { id: "S", x: 90, y: 190, layer: 0 },
  { id: "A", x: 260, y: 85, layer: 1 },
  { id: "B", x: 260, y: 190, layer: 1 },
  { id: "C", x: 260, y: 295, layer: 1 },
  { id: "D", x: 460, y: 85, layer: 2 },
  { id: "E", x: 460, y: 190, layer: 2 },
  { id: "F", x: 460, y: 295, layer: 2 },
  { id: "G", x: 650, y: 130, layer: 3 },
  { id: "T", x: 690, y: 255, layer: 3 },
];

const BFS_EDGES: Array<{ from: string; to: string }> = [
  { from: "S", to: "A" },
  { from: "S", to: "B" },
  { from: "S", to: "C" },
  { from: "A", to: "D" },
  { from: "A", to: "E" },
  { from: "B", to: "D" },
  { from: "B", to: "E" },
  { from: "B", to: "F" },
  { from: "C", to: "F" },
  { from: "D", to: "G" },
  { from: "E", to: "G" },
  { from: "E", to: "T" },
  { from: "F", to: "T" },
  { from: "G", to: "T" },
];

const BFS_ADJ: Record<string, string[]> = {
  S: ["A", "B", "C"],
  A: ["D", "E"],
  B: ["D", "E", "F"],
  C: ["F"],
  D: ["G"],
  E: ["G", "T"],
  F: ["T"],
  G: ["T"],
  T: [],
};

interface BfsStep {
  current: string;
  queue: string[];
  visited: string[];
  dist: Record<string, number>;
  parent: Record<string, string | null>;
  activeEdges: Array<[string, string]>;
  shortestPath: string[];
  codeLine: number;
  msg: string;
}

const BFS_CODE = [
  "queue<int> q; q.push(S); dist[S] = 0;",
  "while (!q.empty()) {",
  "  int u = q.front(); q.pop();",
  "  if (u == target) return reconstructPath(u);",
  "  for (int v : adj[u]) {",
  "    if (!visited[v]) {",
  "      visited[v] = true; dist[v] = dist[u] + 1;",
  "      parent[v] = u; q.push(v);",
  "    }",
  "  }",
  "}",
];

function buildBfsSteps(targetId: string): BfsStep[] {
  const steps: BfsStep[] = [];
  const visited = new Set<string>(["S"]);
  const queue: string[] = ["S"];
  const dist: Record<string, number> = { S: 0 };
  const parent: Record<string, string | null> = { S: null };

  steps.push({
    current: "S",
    queue: [...queue],
    visited: Array.from(visited),
    dist: { ...dist },
    parent: { ...parent },
    activeEdges: [],
    shortestPath: [],
    codeLine: 0,
    msg: `Initialize BFS Wavefront at Source S (dist = 0). Searching for Target ${targetId}.`,
  });

  while (queue.length > 0) {
    const u = queue.shift()!;
    const neighbors = BFS_ADJ[u] ?? [];
    const newlyDiscovered: Array<[string, string]> = [];

    if (u === targetId) {
      const path: string[] = [];
      let curr: string | null = targetId;
      while (curr) {
        path.unshift(curr);
        curr = parent[curr] ?? null;
      }
      steps.push({
        current: u,
        queue: [...queue],
        visited: Array.from(visited),
        dist: { ...dist },
        parent: { ...parent },
        activeEdges: [],
        shortestPath: path,
        codeLine: 3,
        msg: `🎯 Target ${targetId} popped! Optimal Shortest Path: ${path.join(" → ")} (${path.length - 1} hops)`,
      });
      break;
    }

    for (const v of neighbors) {
      if (!visited.has(v)) {
        visited.add(v);
        dist[v] = (dist[u] ?? 0) + 1;
        parent[v] = u;
        queue.push(v);
        newlyDiscovered.push([u, v]);
      }
    }

    steps.push({
      current: u,
      queue: [...queue],
      visited: Array.from(visited),
      dist: { ...dist },
      parent: { ...parent },
      activeEdges: newlyDiscovered,
      shortestPath: [],
      codeLine: newlyDiscovered.length > 0 ? 6 : 4,
      msg:
        newlyDiscovered.length > 0
          ? `Dequeue ${u} (d=${dist[u]}): Enqueue unvisited neighbors [${newlyDiscovered.map((x) => x[1]).join(", ")}] at Layer d=${(dist[u] ?? 0) + 1}`
          : `Dequeue ${u} (d=${dist[u]}): All neighbors already visited in earlier wavefronts`,
    });

    if (visited.has(targetId) && newlyDiscovered.some(([, v]) => v === targetId)) {
      const path: string[] = [];
      let curr: string | null = targetId;
      while (curr) {
        path.unshift(curr);
        curr = parent[curr] ?? null;
      }
      steps.push({
        current: targetId,
        queue: [...queue],
        visited: Array.from(visited),
        dist: { ...dist },
        parent: { ...parent },
        activeEdges: [],
        shortestPath: path,
        codeLine: 3,
        msg: `🎯 Shortest Path Locked: ${path.join(" → ")} (Minimum Distance = ${dist[targetId]} hops)`,
      });
      break;
    }
  }

  return steps;
}

function GraphBfsVisualizer({
  isPlaying,
  setIsPlaying,
  speed,
  setSpeed,
  meta,
}: {
  isPlaying: boolean;
  setIsPlaying: (p: boolean) => void;
  speed: number;
  setSpeed: (s: number) => void;
  meta: TabMeta;
}) {
  const [targetNode, setTargetNode] = useState<string>("T");
  const steps = useMemo(() => buildBfsSteps(targetNode), [targetNode]);
  const [stepIndex, setStepIndex] = useState(0);
  const current = steps[stepIndex] ?? steps[0]!;

  useEffect(() => {
    if (!isPlaying) return;
    const intervalMs = Math.round(1450 / speed);
    const timer = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % steps.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, speed, steps.length]);

  const handleSelectTarget = (nodeId: string) => {
    if (nodeId === "S") return;
    setTargetNode(nodeId);
    setStepIndex(0);
    setIsPlaying(true);
  };

  return (
    <div>
      <ShowroomTransportHeader
        meta={meta}
        stepIndex={stepIndex}
        totalSteps={steps.length}
        onSelectStep={setStepIndex}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        speed={speed}
        setSpeed={setSpeed}
        statusMessage={current.msg}
        extraAction={
          <div className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-background/80 px-2.5 py-1 font-mono text-xs">
            <Target className="size-3.5 text-primary" />
            <span className="text-muted-foreground hidden sm:inline">Target:</span>
            {["D", "E", "G", "T"].map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => handleSelectTarget(id)}
                className={`px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                  targetNode === id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {id}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Left 8 Cols: Multi-Layer Network SVG Canvas */}
        <div className="lg:col-span-8 p-5 sm:p-7 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-border/70">
          {/* Live FIFO Queue Conveyor */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
                FIFO Queue:
              </span>
              <div className="flex items-center gap-1.5 min-h-[28px] px-2.5 py-1 rounded-xl bg-background/80 border border-border/80">
                <AnimatePresence mode="popLayout">
                  {current.queue.length === 0 ? (
                    <motion.span
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="font-mono text-xs text-muted-foreground"
                    >
                      [ Empty ]
                    </motion.span>
                  ) : (
                    current.queue.map((qId, idx) => (
                      <motion.span
                        key={qId}
                        layout
                        initial={{ opacity: 0, scale: 0.7, x: 14 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.6, x: -14 }}
                        transition={SPRING_FAST}
                        className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 font-mono text-xs font-black ${
                          idx === 0
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "bg-secondary text-foreground border border-border/80"
                        }`}
                      >
                        {qId}
                        <span className="text-[9px] opacity-75">d={current.dist[qId] ?? 0}</span>
                      </motion.span>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>

            <span className="font-mono text-[11px] text-muted-foreground">
              Click any node to change target ({targetNode})
            </span>
          </div>

          {/* High-Contrast Responsive SVG Network Canvas */}
          <div className="relative rounded-2xl bg-background/95 border border-border/80 p-3 sm:p-4 shadow-inner overflow-hidden">
            <svg
              viewBox="0 0 780 380"
              className="w-full h-[270px] sm:h-[320px] select-none overflow-visible"
            >
              {/* BFS Layer Column Guides */}
              {[
                { x: 90, label: "LAYER L0 (d=0)" },
                { x: 260, label: "LAYER L1 (d=1)" },
                { x: 460, label: "LAYER L2 (d=2)" },
                { x: 670, label: "LAYER L3 (d=3)" },
              ].map((col, idx) => (
                <g key={idx}>
                  <line
                    x1={col.x}
                    y1={28}
                    x2={col.x}
                    y2={355}
                    stroke="var(--border)"
                    strokeWidth="1.5"
                    strokeDasharray="4 6"
                  />
                  <rect
                    x={col.x - 52}
                    y={6}
                    width={104}
                    height={20}
                    rx={6}
                    fill="var(--secondary)"
                    stroke="var(--border)"
                  />
                  <text
                    x={col.x}
                    y={19}
                    textAnchor="middle"
                    className="fill-muted-foreground font-mono text-[9px] font-bold"
                  >
                    {col.label}
                  </text>
                </g>
              ))}

              {/* Graph Edges */}
              {BFS_EDGES.map((edge, idx) => {
                const n1 = BFS_NODES.find((n) => n.id === edge.from)!;
                const n2 = BFS_NODES.find((n) => n.id === edge.to)!;

                const p1 = current.shortestPath.indexOf(edge.from);
                const p2 = current.shortestPath.indexOf(edge.to);
                const isShortestEdge = p1 !== -1 && p2 !== -1 && Math.abs(p1 - p2) === 1;

                const isWavefrontEdge = current.activeEdges.some(
                  ([u, v]) => u === edge.from && v === edge.to
                );

                const isTreeEdge = current.parent[edge.to] === edge.from;

                let strokeColor = "var(--border)";
                let strokeW = 2;
                let dash = "5 5";

                if (isShortestEdge) {
                  strokeColor = "#10b981";
                  strokeW = 5;
                  dash = "none";
                } else if (isWavefrontEdge) {
                  strokeColor = "var(--primary)";
                  strokeW = 4;
                  dash = "none";
                } else if (isTreeEdge) {
                  strokeColor = "var(--accent)";
                  strokeW = 2.75;
                  dash = "none";
                }

                return (
                  <g key={idx}>
                    <line
                      x1={n1.x}
                      y1={n1.y}
                      x2={n2.x}
                      y2={n2.y}
                      stroke={strokeColor}
                      strokeWidth={strokeW}
                      strokeDasharray={dash}
                      strokeLinecap="round"
                      className="transition-all duration-300"
                    />
                    {/* Animated Signal Pulse on Active Discovery Edge */}
                    {(isWavefrontEdge || isShortestEdge) && (
                      <motion.circle
                        r={5}
                        fill={isShortestEdge ? "#10b981" : "var(--primary)"}
                        initial={{ cx: n1.x, cy: n1.y }}
                        animate={{ cx: n2.x, cy: n2.y }}
                        transition={{ duration: 0.65, repeat: Infinity, ease: "easeInOut" }}
                      />
                    )}
                  </g>
                );
              })}

              {/* Graph Nodes */}
              {BFS_NODES.map((node) => {
                const isCurrent = current.current === node.id;
                const isVisited = current.visited.includes(node.id);
                const isQueued = current.queue.includes(node.id);
                const isOnShortestPath = current.shortestPath.includes(node.id);
                const isTarget = node.id === targetNode;
                const nodeDist = current.dist[node.id];
                const nodeParent = current.parent[node.id];

                let fillColor = "var(--card)";
                let strokeColor = "var(--border)";
                let textColor = "var(--foreground)";

                if (isOnShortestPath) {
                  fillColor = "#10b981";
                  strokeColor = "#34d399";
                  textColor = "#022c22";
                } else if (isCurrent) {
                  fillColor = "var(--primary)";
                  strokeColor = "var(--primary)";
                  textColor = "var(--primary-foreground)";
                } else if (isQueued) {
                  fillColor = "color-mix(in oklch, var(--accent) 24%, var(--card))";
                  strokeColor = "var(--accent)";
                  textColor = "var(--foreground)";
                } else if (isVisited) {
                  fillColor = "color-mix(in oklch, var(--primary) 16%, var(--card))";
                  strokeColor = "var(--primary)";
                  textColor = "var(--foreground)";
                }

                return (
                  <g
                    key={node.id}
                    onClick={() => handleSelectTarget(node.id)}
                    className={node.id !== "S" ? "cursor-pointer" : "cursor-default"}
                  >
                    {/* Pulse Ring for Active / Target Node */}
                    {(isCurrent || isOnShortestPath || isTarget) && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={34}
                        fill="none"
                        stroke={
                          isOnShortestPath
                            ? "#10b981"
                            : isCurrent
                              ? "var(--primary)"
                              : "var(--accent)"
                        }
                        strokeWidth="2"
                        strokeDasharray={isTarget && !isOnShortestPath ? "3 3" : "none"}
                        opacity={0.55}
                      />
                    )}

                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={26}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={isCurrent || isOnShortestPath ? 3.5 : 2.5}
                      className="transition-all duration-300"
                    />

                    <text
                      x={node.x}
                      y={node.y + 5}
                      textAnchor="middle"
                      fill={textColor}
                      className="font-mono text-sm font-black"
                    >
                      {node.id}
                    </text>

                    {/* Distance & Parent Telemetry Pill Below Node */}
                    <rect
                      x={node.x - 34}
                      y={node.y + 31}
                      width={68}
                      height={18}
                      rx={5}
                      fill="var(--secondary)"
                      stroke="var(--border)"
                    />
                    <text
                      x={node.x}
                      y={node.y + 43}
                      textAnchor="middle"
                      className="fill-foreground font-mono text-[9px] font-bold"
                    >
                      {nodeDist !== undefined
                        ? `d:${nodeDist} π:${nodeParent ?? "-"}`
                        : "d:∞"}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-full bg-primary" />
                <span className="text-muted-foreground">Active Dequeued Node</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-full border-2 border-accent bg-accent/25" />
                <span className="text-muted-foreground">In FIFO Frontier Queue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground">Optimal Shortest Path</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Code Trace & Shortest Path Reconstruction */}
        <div className="lg:col-span-4 p-5 sm:p-6 bg-secondary/20 flex flex-col justify-between gap-5">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                <Terminal className="size-3.5 text-primary" />
                BFS Shortest-Path Trace
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">O(V + E)</span>
            </div>

            <div className="rounded-2xl border border-border/80 bg-background/95 p-3 font-mono text-[11px] leading-relaxed shadow-inner overflow-x-auto">
              {BFS_CODE.map((line, idx) => {
                const isActive = current.codeLine === idx;
                return (
                  <div
                    key={idx}
                    className={`relative px-2.5 py-1 rounded-lg transition-colors ${
                      isActive ? "text-primary font-bold" : "text-muted-foreground"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="bfs-code-highlight"
                        transition={SPRING_FAST}
                        className="absolute inset-0 rounded-lg bg-primary/12 border-l-2 border-primary pointer-events-none"
                      />
                    )}
                    <span className="relative z-10 select-none text-muted-foreground mr-2.5 inline-block w-3 text-right" aria-hidden="true">
                      {idx + 1}
                    </span>
                    <span className="relative z-10 whitespace-pre">{line}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Parent Pointer Path Reconstruction Box */}
          <div className="rounded-2xl border border-border/80 bg-background/80 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-500" />
                Shortest Path to {targetNode}
              </span>
              <span className="font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                {current.dist[targetNode] !== undefined
                  ? `${current.dist[targetNode]} Hops`
                  : "Searching..."}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(current.shortestPath.length > 0
                ? current.shortestPath
                : ["S", "...", targetNode]
              ).map((nodeId, idx, arr) => (
                <React.Fragment key={`${nodeId}-${idx}`}>
                  <span
                    className={`rounded-lg px-2.5 py-1 font-mono text-xs font-black ${
                      current.shortestPath.length > 0
                        ? "bg-emerald-500 text-emerald-950 shadow-xs"
                        : "bg-secondary text-muted-foreground border border-border"
                    }`}
                  >
                    {nodeId}
                  </span>
                  {idx < arr.length - 1 && (
                    <ArrowRight className="size-3.5 text-muted-foreground" />
                  )}
                </React.Fragment>
              ))}
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Because BFS explores vertices in concentric distance layers{" "}
              <code className="text-primary font-bold">d = 0, 1, 2, 3</code>, the first time{" "}
              <code className="font-bold text-foreground">{targetNode}</code> is discovered guarantees the shortest unweighted path.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   3. BINARY SEARCH TREE (13-NODE 4-LEVEL TREE + SUBTREE PRUNING + RANGE INVARIANT)
   ========================================================================= */
interface BstNodeDef {
  id: number;
  x: number;
  y: number;
  level: number;
  left?: number;
  right?: number;
}

const BST_TREE_NODES: BstNodeDef[] = [
  // Level 0
  { id: 50, x: 390, y: 50, level: 0, left: 25, right: 75 },
  // Level 1
  { id: 25, x: 210, y: 135, level: 1, left: 12, right: 37 },
  { id: 75, x: 570, y: 135, level: 1, left: 62, right: 88 },
  // Level 2
  { id: 12, x: 120, y: 230, level: 2, left: 6, right: 18 },
  { id: 37, x: 300, y: 230, level: 2, left: 31, right: 43 },
  { id: 62, x: 480, y: 230, level: 2, left: 56 },
  { id: 88, x: 660, y: 230, level: 2, right: 94 },
  // Level 3
  { id: 6, x: 75, y: 325, level: 3 },
  { id: 18, x: 165, y: 325, level: 3 },
  { id: 31, x: 255, y: 325, level: 3 },
  { id: 43, x: 345, y: 325, level: 3 },
  { id: 56, x: 435, y: 325, level: 3 },
  { id: 94, x: 705, y: 325, level: 3 },
];

interface BstSearchStep {
  target: number;
  current: number;
  path: number[];
  prunedIds: number[];
  minBound: string;
  maxBound: string;
  found: boolean;
  codeLine: number;
  msg: string;
}

const BST_CODE = [
  "TreeNode* searchBST(TreeNode* root, int target) {",
  "  TreeNode* curr = root;",
  "  while (curr != nullptr) {",
  "    if (target == curr->val) return curr; // Match!",
  "    if (target < curr->val)",
  "      curr = curr->left;  // Prune right subtree",
  "    else",
  "      curr = curr->right; // Prune left subtree",
  "  }",
  "  return nullptr;",
  "}",
];

function collectSubtreeIds(rootId: number | undefined): number[] {
  if (rootId === undefined) return [];
  const node = BST_TREE_NODES.find((n) => n.id === rootId);
  if (!node) return [];
  return [
    node.id,
    ...collectSubtreeIds(node.left),
    ...collectSubtreeIds(node.right),
  ];
}

function buildBstSearchSteps(target: number): BstSearchStep[] {
  const steps: BstSearchStep[] = [];
  let currId: number | undefined = 50;
  const path: number[] = [];
  const pruned = new Set<number>();
  let minB = "-∞";
  let maxB = "+∞";

  while (currId !== undefined) {
    const node = BST_TREE_NODES.find((n) => n.id === currId);
    if (!node) break;
    path.push(node.id);

    if (target === node.id) {
      steps.push({
        target,
        current: node.id,
        path: [...path],
        prunedIds: Array.from(pruned),
        minBound: minB,
        maxBound: maxB,
        found: true,
        codeLine: 3,
        msg: `🎯 Target ${target} found at depth ${node.level} in just ${path.length} comparisons! (${pruned.size} nodes pruned)`,
      });
      break;
    } else if (target < node.id) {
      const rightSubtree = collectSubtreeIds(node.right);
      rightSubtree.forEach((id) => pruned.add(id));
      maxB = String(node.id);
      steps.push({
        target,
        current: node.id,
        path: [...path],
        prunedIds: Array.from(pruned),
        minBound: minB,
        maxBound: maxB,
        found: false,
        codeLine: 5,
        msg: `Compare ${target} < ${node.id} → Branch Left (←) & prune ${rightSubtree.length} nodes in right subtree`,
      });
      currId = node.left;
    } else {
      const leftSubtree = collectSubtreeIds(node.left);
      leftSubtree.forEach((id) => pruned.add(id));
      minB = String(node.id);
      steps.push({
        target,
        current: node.id,
        path: [...path],
        prunedIds: Array.from(pruned),
        minBound: minB,
        maxBound: maxB,
        found: false,
        codeLine: 7,
        msg: `Compare ${target} > ${node.id} → Branch Right (→) & prune ${leftSubtree.length} nodes in left subtree`,
      });
      currId = node.right;
    }
  }

  return steps;
}

function BstTraversalVisualizer({
  isPlaying,
  setIsPlaying,
  speed,
  setSpeed,
  meta,
}: {
  isPlaying: boolean;
  setIsPlaying: (p: boolean) => void;
  speed: number;
  setSpeed: (s: number) => void;
  meta: TabMeta;
}) {
  const [target, setTarget] = useState<number>(31);
  const steps = useMemo(() => buildBstSearchSteps(target), [target]);
  const [stepIndex, setStepIndex] = useState(0);
  const current = steps[stepIndex] ?? steps[0]!;

  useEffect(() => {
    if (!isPlaying) return;
    const intervalMs = Math.round(1450 / speed);
    const timer = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % steps.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, speed, steps.length]);

  const handleSelectTarget = (id: number) => {
    setTarget(id);
    setStepIndex(0);
    setIsPlaying(true);
  };

  return (
    <div>
      <ShowroomTransportHeader
        meta={meta}
        stepIndex={stepIndex}
        totalSteps={steps.length}
        onSelectStep={setStepIndex}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        speed={speed}
        setSpeed={setSpeed}
        statusMessage={current.msg}
        extraAction={
          <div className="flex items-center gap-1 rounded-xl border border-border/80 bg-background/80 px-2.5 py-1 font-mono text-xs">
            <span className="text-muted-foreground hidden sm:inline">Search Key:</span>
            {[18, 31, 43, 56, 94].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleSelectTarget(val)}
                className={`px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                  target === val
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {val}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Left 8 Cols: 13-Node Interactive BST SVG Canvas */}
        <div className="lg:col-span-8 p-5 sm:p-7 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-border/70">
          {/* Top Invariant & Pruning Telemetry */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-primary/15 border border-primary/40 px-2.5 py-1 font-mono text-xs font-bold text-primary">
                Target Key = {target}
              </span>
              <span className="rounded-lg bg-accent/15 border border-accent/40 px-2.5 py-1 font-mono text-xs font-bold text-accent">
                Valid Interval: ({current.minBound}, {current.maxBound})
              </span>
              <span className="rounded-lg bg-secondary border border-border px-2.5 py-1 font-mono text-xs font-bold text-foreground">
                Pruned Nodes: {current.prunedIds.length} / {BST_TREE_NODES.length}
              </span>
            </div>
            <span className="font-mono text-[11px] text-muted-foreground">
              Click any tree node to search for it
            </span>
          </div>

          {/* Tree Canvas */}
          <div className="relative rounded-2xl bg-background/95 border border-border/80 p-3 sm:p-4 shadow-inner overflow-hidden">
            <svg
              viewBox="0 0 780 375"
              className="w-full h-[270px] sm:h-[320px] select-none overflow-visible"
            >
              {/* Edges */}
              {BST_TREE_NODES.map((parent) => {
                const children = [parent.left, parent.right].filter(
                  (c): c is number => c !== undefined
                );
                return children.map((childId) => {
                  const child = BST_TREE_NODES.find((n) => n.id === childId)!;
                  const isPathEdge =
                    current.path.includes(parent.id) && current.path.includes(child.id);
                  const isPrunedEdge =
                    current.prunedIds.includes(parent.id) ||
                    current.prunedIds.includes(child.id);

                  return (
                    <g key={`${parent.id}-${child.id}`}>
                      <line
                        x1={parent.x}
                        y1={parent.y}
                        x2={child.x}
                        y2={child.y}
                        stroke={
                          isPathEdge
                            ? "var(--primary)"
                            : isPrunedEdge
                              ? "var(--border)"
                              : "color-mix(in oklch, var(--foreground) 30%, transparent)"
                        }
                        strokeWidth={isPathEdge ? 4 : 2}
                        strokeDasharray={isPrunedEdge ? "4 5" : "none"}
                        opacity={isPrunedEdge ? 0.35 : 1}
                        className="transition-all duration-300"
                      />
                    </g>
                  );
                });
              })}

              {/* Nodes */}
              {BST_TREE_NODES.map((node) => {
                const isCurrent = current.current === node.id;
                const isVisited = current.path.includes(node.id);
                const isPruned = current.prunedIds.includes(node.id);
                const isFound = current.found && isCurrent;

                let fillColor = "var(--card)";
                let strokeColor = "var(--border)";
                let textColor = "var(--foreground)";

                if (isFound) {
                  fillColor = "#10b981";
                  strokeColor = "#34d399";
                  textColor = "#022c22";
                } else if (isCurrent) {
                  fillColor = "var(--primary)";
                  strokeColor = "var(--primary)";
                  textColor = "var(--primary-foreground)";
                } else if (isVisited) {
                  fillColor = "color-mix(in oklch, var(--accent) 24%, var(--card))";
                  strokeColor = "var(--accent)";
                  textColor = "var(--foreground)";
                }

                return (
                  <g
                    key={node.id}
                    onClick={() => handleSelectTarget(node.id)}
                    style={{ opacity: isPruned ? 0.3 : 1 }}
                    className="cursor-pointer transition-opacity duration-300"
                  >
                    {(isCurrent || isFound) && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={32}
                        fill="none"
                        stroke={isFound ? "#10b981" : "var(--primary)"}
                        strokeWidth="2.5"
                        opacity={0.55}
                      />
                    )}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={24}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={isCurrent || isFound ? 3.5 : 2.5}
                      className="transition-all duration-300"
                    />
                    <text
                      x={node.x}
                      y={node.y + 4}
                      textAnchor="middle"
                      fill={textColor}
                      className="font-mono text-xs sm:text-sm font-black"
                    >
                      {node.id}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-full bg-primary" />
                <span className="text-muted-foreground">Current Comparison Node</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-full border-2 border-accent bg-accent/25" />
                <span className="text-muted-foreground">Traversed Decision Path</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground">Target Located</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-full border border-dashed border-muted-foreground opacity-40" />
                <span className="text-muted-foreground">Pruned Subtree (Skipped)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Code Trace & Decision Trail */}
        <div className="lg:col-span-4 p-5 sm:p-6 bg-secondary/20 flex flex-col justify-between gap-5">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                <Terminal className="size-3.5 text-primary" />
                BST Search Trace
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">O(log n)</span>
            </div>

            <div className="rounded-2xl border border-border/80 bg-background/95 p-3 font-mono text-[11px] leading-relaxed shadow-inner overflow-x-auto">
              {BST_CODE.map((line, idx) => {
                const isActive = current.codeLine === idx;
                return (
                  <div
                    key={idx}
                    className={`relative px-2.5 py-1 rounded-lg transition-colors ${
                      isActive ? "text-primary font-bold" : "text-muted-foreground"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="bst-code-highlight"
                        transition={SPRING_FAST}
                        className="absolute inset-0 rounded-lg bg-primary/12 border-l-2 border-primary pointer-events-none"
                      />
                    )}
                    <span className="relative z-10 select-none text-muted-foreground mr-2.5 inline-block w-3 text-right" aria-hidden="true">
                      {idx + 1}
                    </span>
                    <span className="relative z-10 whitespace-pre">{line}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Search Path & Halving Efficiency */}
          <div className="rounded-2xl border border-border/80 bg-background/80 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-foreground">
                Root-to-Target Decision Trail
              </span>
              <span className="font-mono text-[10px] font-bold text-primary">
                {current.path.length} / 4 steps
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {current.path.map((id, idx) => (
                <React.Fragment key={id}>
                  <span
                    className={`rounded-lg px-2.5 py-1 font-mono text-xs font-black ${
                      id === target && current.found
                        ? "bg-emerald-500 text-emerald-950"
                        : idx === current.path.length - 1
                          ? "bg-primary text-primary-foreground"
                          : "bg-accent/20 text-accent border border-accent/40"
                    }`}
                  >
                    {id}
                  </span>
                  {idx < current.path.length - 1 && (
                    <ArrowRight className="size-3.5 text-muted-foreground" />
                  )}
                </React.Fragment>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Each comparison eliminates half of the remaining tree: out of{" "}
              <strong className="text-foreground">13 total nodes</strong>,{" "}
              <strong className="text-accent">{current.prunedIds.length} nodes</strong> have been pruned without ever being visited.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   4. 0/1 KNAPSACK 2D DP MATRIX (DEPENDENCY HIGHLIGHTING + BACKTRACKING)
   ========================================================================= */
interface KnapsackItem {
  idx: number;
  name: string;
  weight: number;
  value: number;
}

const KNAPSACK_ITEMS: KnapsackItem[] = [
  { idx: 1, name: "Ruby Gem", weight: 1, value: 15 },
  { idx: 2, name: "Gold Chalice", weight: 2, value: 25 },
  { idx: 3, name: "Royal Crown", weight: 3, value: 45 },
  { idx: 4, name: "Imperial Scepter", weight: 4, value: 60 },
];

const MAX_CAPACITY = 6;

const DP_TABLE: number[][] = (() => {
  const rows = KNAPSACK_ITEMS.length + 1;
  const cols = MAX_CAPACITY + 1;
  const dp: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let i = 1; i < rows; i++) {
    const item = KNAPSACK_ITEMS[i - 1]!;
    for (let w = 0; w < cols; w++) {
      const exclude = dp[i - 1]![w]!;
      const include = w >= item.weight ? dp[i - 1]![w - item.weight]! + item.value : -1;
      dp[i]![w] = Math.max(exclude, include);
    }
  }
  return dp;
})();

interface DpStep {
  r: number;
  c: number;
  excludeCell: [number, number];
  includeCell: [number, number] | null;
  excludeVal: number;
  includeVal: number | null;
  chosenVal: number;
  isBacktrackComplete: boolean;
  optimalCells: Array<[number, number]>;
  codeLine: number;
  msg: string;
}

const KNAPSACK_CODE = [
  "for (int i = 1; i <= N; i++) {",
  "  for (int w = 0; w <= W; w++) {",
  "    int exclude = dp[i - 1][w];",
  "    if (w >= wt[i]) {",
  "      int include = dp[i - 1][w - wt[i]] + val[i];",
  "      dp[i][w] = max(exclude, include);",
  "    } else {",
  "      dp[i][w] = exclude;",
  "    }",
  "  }",
  "}",
];

const DP_SHOWCASE_STEPS: DpStep[] = [
  {
    r: 1,
    c: 1,
    excludeCell: [0, 1],
    includeCell: [0, 0],
    excludeVal: 0,
    includeVal: 15,
    chosenVal: 15,
    isBacktrackComplete: false,
    optimalCells: [],
    codeLine: 5,
    msg: "Item 1 (Ruby, w=1, v=15) at W=1: max(dp[0][1]=0, dp[0][0]+15=15) → 15",
  },
  {
    r: 2,
    c: 2,
    excludeCell: [1, 2],
    includeCell: [1, 0],
    excludeVal: 15,
    includeVal: 25,
    chosenVal: 25,
    isBacktrackComplete: false,
    optimalCells: [],
    codeLine: 5,
    msg: "Item 2 (Chalice, w=2, v=25) at W=2: max(dp[1][2]=15, dp[1][0]+25=25) → 25",
  },
  {
    r: 2,
    c: 3,
    excludeCell: [1, 3],
    includeCell: [1, 1],
    excludeVal: 15,
    includeVal: 40,
    chosenVal: 40,
    isBacktrackComplete: false,
    optimalCells: [],
    codeLine: 5,
    msg: "Item 2 (Chalice, w=2, v=25) at W=3: Combine Ruby + Chalice → dp[1][1]+25 = 40",
  },
  {
    r: 3,
    c: 4,
    excludeCell: [2, 4],
    includeCell: [2, 1],
    excludeVal: 40,
    includeVal: 60,
    chosenVal: 60,
    isBacktrackComplete: false,
    optimalCells: [],
    codeLine: 5,
    msg: "Item 3 (Crown, w=3, v=45) at W=4: max(dp[2][4]=40, dp[2][1]+45=60) → 60",
  },
  {
    r: 3,
    c: 6,
    excludeCell: [2, 6],
    includeCell: [2, 3],
    excludeVal: 40,
    includeVal: 85,
    chosenVal: 85,
    isBacktrackComplete: false,
    optimalCells: [],
    codeLine: 5,
    msg: "Item 3 (Crown, w=3, v=45) at W=6: max(dp[2][6]=40, dp[2][3]+45=85) → 85",
  },
  {
    r: 4,
    c: 5,
    excludeCell: [3, 5],
    includeCell: [3, 1],
    excludeVal: 70,
    includeVal: 75,
    chosenVal: 75,
    isBacktrackComplete: false,
    optimalCells: [],
    codeLine: 5,
    msg: "Item 4 (Scepter, w=4, v=60) at W=5: max(dp[3][5]=70, dp[3][1]+60=75) → 75",
  },
  {
    r: 4,
    c: 6,
    excludeCell: [3, 6],
    includeCell: [3, 2],
    excludeVal: 85,
    includeVal: 85,
    chosenVal: 85,
    isBacktrackComplete: true,
    optimalCells: [
      [4, 6],
      [3, 6],
      [2, 3],
      [1, 1],
    ],
    codeLine: 5,
    msg: "🎯 Optimal State dp[4][6] = 85! Backtrack packed items: Ruby (w=1) + Chalice (w=2) + Crown (w=3) = $85",
  },
];

function DpGridVisualizer({
  isPlaying,
  setIsPlaying,
  speed,
  setSpeed,
  meta,
}: {
  isPlaying: boolean;
  setIsPlaying: (p: boolean) => void;
  speed: number;
  setSpeed: (s: number) => void;
  meta: TabMeta;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [customCell, setCustomCell] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!isPlaying) return;
    const intervalMs = Math.round(1600 / speed);
    const timer = setInterval(() => {
      setCustomCell(null);
      setStepIndex((prev) => (prev + 1) % DP_SHOWCASE_STEPS.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, speed]);

  const current: DpStep = useMemo(() => {
    if (!customCell) return DP_SHOWCASE_STEPS[stepIndex] ?? DP_SHOWCASE_STEPS[0]!;
    const [r, c] = customCell;
    if (r === 0) {
      return {
        r,
        c,
        excludeCell: [0, c],
        includeCell: null,
        excludeVal: 0,
        includeVal: null,
        chosenVal: 0,
        isBacktrackComplete: false,
        optimalCells: [],
        codeLine: 1,
        msg: `Base Case dp[0][${c}] = 0 (0 items considered)`,
      };
    }
    const item = KNAPSACK_ITEMS[r - 1]!;
    const excludeVal = DP_TABLE[r - 1]![c]!;
    const canInclude = c >= item.weight;
    const includeVal = canInclude ? DP_TABLE[r - 1]![c - item.weight]! + item.value : null;
    const chosenVal = DP_TABLE[r]![c]!;
    return {
      r,
      c,
      excludeCell: [r - 1, c],
      includeCell: canInclude ? [r - 1, c - item.weight] : null,
      excludeVal,
      includeVal,
      chosenVal,
      isBacktrackComplete: false,
      optimalCells: [],
      codeLine: canInclude ? 5 : 7,
      msg: canInclude
        ? `Inspected dp[${r}][${c}] (${item.name}): max(Exclude dp[${r - 1}][${c}]=${excludeVal}, Include dp[${r - 1}][${c - item.weight}]+${item.value}=${includeVal}) = ${chosenVal}`
        : `Inspected dp[${r}][${c}] (${item.name}): Weight ${item.weight} > Cap ${c} → Inherit dp[${r - 1}][${c}] = ${excludeVal}`,
    };
  }, [customCell, stepIndex]);

  const capacities = [0, 1, 2, 3, 4, 5, 6];

  return (
    <div>
      <ShowroomTransportHeader
        meta={meta}
        stepIndex={stepIndex}
        totalSteps={DP_SHOWCASE_STEPS.length}
        onSelectStep={(idx) => {
          setCustomCell(null);
          setStepIndex(idx);
        }}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        speed={speed}
        setSpeed={setSpeed}
        statusMessage={current.msg}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Left 8 Cols: 2D State Matrix with Dependency Arrows */}
        <div className="lg:col-span-8 p-5 sm:p-7 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-border/70">
          {/* Recurrence Formula Pill Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              <span className="rounded-lg bg-primary/15 border border-primary/40 px-2.5 py-1 font-bold text-primary">
                Active: dp[{current.r}][{current.c}] = {current.chosenVal}
              </span>
              <span className="rounded-lg bg-amber-500/15 border border-amber-500/40 px-2.5 py-1 font-bold text-amber-600 dark:text-amber-400">
                Exclude: dp[{current.excludeCell[0]}][{current.excludeCell[1]}] = {current.excludeVal}
              </span>
              {current.includeCell && (
                <span className="rounded-lg bg-emerald-500/15 border border-emerald-500/40 px-2.5 py-1 font-bold text-emerald-600 dark:text-emerald-400">
                  Include: dp[{current.includeCell[0]}][{current.includeCell[1]}] + val ={" "}
                  {current.includeVal}
                </span>
              )}
            </div>
            <span className="font-mono text-[11px] text-muted-foreground">
              Click any cell in the matrix to inspect its transition
            </span>
          </div>

          {/* 2D Matrix Table */}
          <div className="overflow-x-auto rounded-2xl border border-border/80 bg-background/95 p-3 sm:p-4 shadow-inner">
            <table className="w-full text-center font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/70 text-muted-foreground">
                  <th className="p-2.5 text-left font-bold">Item (wt, val) \ Cap</th>
                  {capacities.map((w) => (
                    <th
                      key={w}
                      className={`p-2.5 font-bold ${
                        current.c === w ? "text-primary" : "text-foreground"
                      }`}
                    >
                      W = {w}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "0: Base Case", sub: "∅ (w=0, v=0)" },
                  ...KNAPSACK_ITEMS.map((it) => ({
                    label: `${it.idx}: ${it.name}`,
                    sub: `w=${it.weight}, v=$${it.value}`,
                  })),
                ].map((rowMeta, r) => (
                  <tr
                    key={r}
                    className="border-b border-border/40 last:border-none hover:bg-secondary/25 transition-colors"
                  >
                    <td className="p-2.5 text-left">
                      <div className="font-bold text-foreground text-xs">{rowMeta.label}</div>
                      <div className="text-[10px] text-muted-foreground">{rowMeta.sub}</div>
                    </td>
                    {capacities.map((c) => {
                      const isTarget = current.r === r && current.c === c;
                      const isExcludeDep =
                        current.excludeCell[0] === r &&
                        current.excludeCell[1] === c &&
                        !(current.r === r && current.c === c);
                      const isIncludeDep =
                        current.includeCell !== null &&
                        current.includeCell[0] === r &&
                        current.includeCell[1] === c;
                      const isOptimalPath = current.optimalCells.some(
                        ([or, oc]) => or === r && oc === c
                      );
                      const isComputed =
                        current.isBacktrackComplete ||
                        r < current.r ||
                        (r === current.r && c <= current.c);

                      const val = DP_TABLE[r]?.[c] ?? 0;

                      let cellStyle =
                        "border-border/50 bg-secondary/25 text-muted-foreground";
                      if (isTarget) {
                        cellStyle =
                          "border-primary bg-primary text-primary-foreground font-black shadow-md scale-105";
                      } else if (isOptimalPath) {
                        cellStyle =
                          "border-emerald-400 bg-emerald-500 text-emerald-950 font-black shadow-md";
                      } else if (isIncludeDep) {
                        cellStyle =
                          "border-emerald-500 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black ring-2 ring-emerald-500/40";
                      } else if (isExcludeDep) {
                        cellStyle =
                          "border-amber-500 bg-amber-500/20 text-amber-600 dark:text-amber-400 font-black ring-2 ring-amber-500/40";
                      } else if (isComputed) {
                        cellStyle =
                          "border-primary/25 bg-primary/10 text-foreground font-bold hover:border-primary/60";
                      }

                      return (
                        <td key={c} className="p-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setIsPlaying(false);
                              setCustomCell([r, c]);
                            }}
                            className={`relative w-full rounded-xl border py-2 px-1.5 transition-all duration-200 cursor-pointer ${cellStyle}`}
                          >
                            <span>{isComputed ? val : "·"}</span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-sm bg-primary" />
                <span className="text-muted-foreground">Target State dp[i][w]</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-sm border-2 border-amber-500 bg-amber-500/25" />
                <span className="text-muted-foreground">Exclude Dependency dp[i-1][w]</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-sm border-2 border-emerald-500 bg-emerald-500/25" />
                <span className="text-muted-foreground">Include Dependency dp[i-1][w-wt]</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Code Trace & State Transition Breakdown */}
        <div className="lg:col-span-4 p-5 sm:p-6 bg-secondary/20 flex flex-col justify-between gap-5">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                <Terminal className="size-3.5 text-primary" />
                Bellman Transition Trace
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">O(N · W)</span>
            </div>

            <div className="rounded-2xl border border-border/80 bg-background/95 p-3 font-mono text-[11px] leading-relaxed shadow-inner overflow-x-auto">
              {KNAPSACK_CODE.map((line, idx) => {
                const isActive = current.codeLine === idx;
                return (
                  <div
                    key={idx}
                    className={`relative px-2.5 py-1 rounded-lg transition-colors ${
                      isActive ? "text-primary font-bold" : "text-muted-foreground"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="dp-code-highlight"
                        transition={SPRING_FAST}
                        className="absolute inset-0 rounded-lg bg-primary/12 border-l-2 border-primary pointer-events-none"
                      />
                    )}
                    <span className="relative z-10 select-none text-muted-foreground mr-2.5 inline-block w-3 text-right" aria-hidden="true">
                      {idx + 1}
                    </span>
                    <span className="relative z-10 whitespace-pre">{line}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Bellman Decision Evaluator */}
          <div className="rounded-2xl border border-border/80 bg-background/80 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-foreground flex items-center gap-1.5">
                <Cpu className="size-3.5 text-primary" />
                Subproblem Evaluator
              </span>
              <span className="font-mono text-[10px] font-bold text-primary">
                dp[{current.r}][{current.c}]
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-2.5">
                <div className="text-[10px] text-muted-foreground uppercase">Skip Item</div>
                <div className="text-sm font-black text-amber-600 dark:text-amber-400 mt-0.5">
                  ${current.excludeVal}
                </div>
              </div>
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-2.5">
                <div className="text-[10px] text-muted-foreground uppercase">Take Item</div>
                <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {current.includeVal !== null ? `$${current.includeVal}` : "N/A (Too Heavy)"}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-primary/12 border border-primary/30 px-3 py-2 font-mono text-xs">
              <span className="text-muted-foreground">Optimal Choice:</span>
              <span className="font-black text-primary">
                max({current.excludeVal}, {current.includeVal ?? "-∞"}) = ${current.chosenVal}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
