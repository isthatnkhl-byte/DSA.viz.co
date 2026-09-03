import React, { useState, useEffect } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  GitGraph,
  TrendingUp,
  Boxes,
  Binary,
} from "lucide-react";

type VisualizerTab = "sorting" | "graph" | "tree" | "dp";

export function LowerInteractiveShowcase() {
  const [activeTab, setActiveTab] = useState<VisualizerTab>("sorting");
  const [isPlaying, setIsPlaying] = useState(true);

  return (
    <section className="relative py-20 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto w-full my-12 overflow-hidden">
      {/* Dynamic Background Glow Canvas */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-accent/15 to-transparent rounded-3xl blur-3xl -z-10 pointer-events-none" />
      <div className="absolute -bottom-10 left-1/4 w-[500px] h-[300px] bg-accent/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute -top-10 right-1/4 w-[500px] h-[300px] bg-primary/15 blur-[130px] rounded-full pointer-events-none" />

      {/* Header Container */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-mono font-bold uppercase tracking-wider text-primary mb-3 shadow-xs">
          <Sparkles className="size-3.5 text-primary animate-pulse" />
          <span>Interactive Spatial Playground</span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-black tracking-tight text-foreground">
          Visual Algorithm <br />
          <span className="font-pixel text-4xl sm:text-5xl md:text-6xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent py-2 block mt-6 mb-4 drop-shadow-[0_0_20px_color-mix(in_oklch,var(--primary)_60%,transparent)]">Showroom</span>
        </h2>
        <p className="mt-3 text-sm sm:text-base text-muted-foreground font-sans leading-relaxed">
          Watch key algorithms execute step-by-step with vivid color states, pointer convergence, state grids, and graph traversals.
        </p>

        {/* Tab Navigation Controls */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-8 p-1.5 rounded-2xl bg-card/80 border border-border/80 backdrop-blur-xl w-fit mx-auto shadow-lg">
          {[
            { id: "sorting", label: "QuickSort Partition", icon: TrendingUp, color: "text-amber-400" },
            { id: "graph", label: "Graph BFS / Shortest Path", icon: GitGraph, color: "text-primary" },
            { id: "tree", label: "Binary Search Tree", icon: Binary, color: "text-accent" },
            { id: "dp", label: "DP 2D Matrix (Knapsack)", icon: Boxes, color: "text-purple-400" },
          ].map((tab) => {
            const isSelected = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as VisualizerTab)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 font-mono text-xs font-bold transition-all duration-300 ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-[1.02]"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`}
              >
                <Icon className={`size-3.5 ${isSelected ? "text-primary-foreground" : tab.color}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Display Stage */}
      <div className="rounded-3xl border border-border/80 bg-card/85 p-6 sm:p-8 md:p-10 backdrop-blur-2xl shadow-2xl transition-all duration-500">
        {activeTab === "sorting" && <QuickSortVisualizer isPlaying={isPlaying} setIsPlaying={setIsPlaying} />}
        {activeTab === "graph" && <GraphBfsVisualizer isPlaying={isPlaying} setIsPlaying={setIsPlaying} />}
        {activeTab === "tree" && <BstTraversalVisualizer isPlaying={isPlaying} setIsPlaying={setIsPlaying} />}
        {activeTab === "dp" && <DpGridVisualizer isPlaying={isPlaying} setIsPlaying={setIsPlaying} />}
      </div>
    </section>
  );
}

/* =========================================================================
   1. QUICKSORT PARTITION ANIMATION (Bars + Color Pivots)
   ========================================================================= */
interface SortStep {
  arr: number[];
  p: number | null;
  i: number | null;
  j: number | null;
  msg: string;
  sorted: number[];
}

const SORT_STEPS: SortStep[] = [
  { arr: [45, 18, 72, 33, 90, 12, 60, 52], p: 7, i: -1, j: 0, msg: "arr[0] = 45 <= 52 → Swap with i+1 (0)", sorted: [] },
  { arr: [45, 18, 72, 33, 90, 12, 60, 52], p: 7, i: 0, j: 1, msg: "arr[1] = 18 <= 52 → Swap with i+1 (1)", sorted: [] },
  { arr: [45, 18, 72, 33, 90, 12, 60, 52], p: 7, i: 1, j: 2, msg: "arr[2] = 72 > 52 → Greater than pivot, continue", sorted: [] },
  { arr: [45, 18, 72, 33, 90, 12, 60, 52], p: 7, i: 1, j: 3, msg: "arr[3] = 33 <= 52 → Swap with i+1 (72 ⇄ 33)", sorted: [] },
  { arr: [45, 18, 33, 72, 90, 12, 60, 52], p: 7, i: 2, j: 4, msg: "arr[4] = 90 > 52 → Greater than pivot, continue", sorted: [] },
  { arr: [45, 18, 33, 72, 90, 12, 60, 52], p: 7, i: 2, j: 5, msg: "arr[5] = 12 <= 52 → Swap with i+1 (72 ⇄ 12)", sorted: [] },
  { arr: [45, 18, 33, 12, 90, 72, 60, 52], p: 7, i: 3, j: 6, msg: "arr[6] = 60 > 52 → Greater than pivot, continue", sorted: [] },
  { arr: [45, 18, 33, 12, 52, 72, 60, 90], p: 4, i: 4, j: 7, msg: "🎯 Place Pivot 52 at partition index [4]. Pivot is locked!", sorted: [4] },
  { arr: [12, 18, 33, 45, 52, 60, 72, 90], p: null, i: null, j: null, msg: "✨ Subarrays recursively partitioned. Array sorted!", sorted: [0, 1, 2, 3, 4, 5, 6, 7] },
];

const DEFAULT_SORT_STEP: SortStep = {
  arr: [45, 18, 72, 33, 90, 12, 60, 52],
  p: 7,
  i: -1,
  j: 0,
  msg: "Comparing elements against Pivot 52",
  sorted: [],
};

function QuickSortVisualizer({ isPlaying, setIsPlaying }: { isPlaying: boolean; setIsPlaying: (p: boolean) => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const current: SortStep = SORT_STEPS[stepIndex] ?? DEFAULT_SORT_STEP;

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % SORT_STEPS.length);
    }, 1400);
    return () => clearInterval(timer);
  }, [isPlaying]);

  return (
    <div className="space-y-6">
      {/* Top Controls & Status */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <span className="font-mono text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-amber-400 animate-ping" />
            Lomuto Partition Scheme • O(n log n)
          </span>
          <p className="font-mono text-sm font-semibold text-foreground mt-1">{current.msg}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-secondary/80 px-3 py-1.5 font-mono text-xs font-semibold text-foreground hover:bg-secondary transition-all"
          >
            {isPlaying ? <Pause className="size-3 text-amber-400" /> : <Play className="size-3 text-emerald-400" />}
            <span>{isPlaying ? "Pause" : "Play"}</span>
          </button>
          <button
            type="button"
            onClick={() => setStepIndex(0)}
            className="rounded-xl border border-border/80 bg-secondary/80 p-2 text-muted-foreground hover:text-foreground transition-all"
          >
            <RotateCcw className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Colorful Animated Bars Stage */}
      <div className="relative h-64 sm:h-72 w-full flex items-end justify-between gap-2 sm:gap-4 px-4 sm:px-8 pt-8 pb-4 rounded-2xl bg-background/80 border border-border/60 shadow-inner">
        {current.arr.map((val, idx) => {
          const isPivot = idx === current.p;
          const isCompare = idx === current.j;
          const isSmaller = idx === current.i;
          const isSorted = current.sorted.includes(idx);

          let barColor = "bg-primary/40 border-primary/60 text-primary";
          if (isSorted) {
            barColor = "bg-emerald-500 border-emerald-400 text-emerald-950 shadow-[0_0_16px_rgba(16,185,129,0.6)]";
          } else if (isPivot) {
            barColor = "bg-amber-400 border-amber-300 text-amber-950 shadow-[0_0_18px_rgba(251,191,36,0.7)] ring-2 ring-amber-300/60";
          } else if (isCompare) {
            barColor = "bg-rose-500 border-rose-400 text-white shadow-[0_0_16px_rgba(244,63,94,0.6)]";
          } else if (isSmaller) {
            barColor = "bg-accent border-accent text-accent-foreground shadow-[0_0_12px_color-mix(in_oklch,var(--accent)_50%,transparent)]";
          }

          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
              {/* Dynamic Value Tag */}
              <span className={`font-mono text-xs font-black transition-transform duration-200 ${isPivot ? "text-amber-400 font-bold scale-110" : "text-foreground"}`}>
                {val}
              </span>

              {/* Bar */}
              <div
                style={{ height: `${(val / 100) * 100}%` }}
                className={`w-full rounded-t-xl border-2 transition-all duration-300 relative flex items-center justify-center ${barColor}`}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-white/20 rounded-t-lg pointer-events-none" />
              </div>

              {/* Index & Pointer label */}
              <div className="flex flex-col items-center">
                <span className="font-mono text-[10px] text-muted-foreground">[{idx}]</span>
                <span className="font-mono text-[9px] font-bold h-4">
                  {isPivot && <span className="text-amber-400">PIVOT</span>}
                  {isCompare && <span className="text-rose-400">j (scan)</span>}
                  {isSmaller && <span className="text-accent">i (bound)</span>}
                  {isSorted && <span className="text-emerald-400">✓</span>}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend Bar */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-mono">
        <div className="flex items-center gap-1.5">
          <span className="size-3 rounded-md bg-amber-400 shadow-sm" />
          <span className="text-muted-foreground">Pivot Element</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-3 rounded-md bg-rose-500 shadow-sm" />
          <span className="text-muted-foreground">Current Scanning Pointer (j)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-3 rounded-md bg-accent shadow-sm" />
          <span className="text-muted-foreground">Smaller Sub-boundary (i)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-3 rounded-md bg-emerald-500 shadow-sm" />
          <span className="text-muted-foreground">Locked / Sorted Invariant</span>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   2. GRAPH BFS & SHORTEST PATH TRAVERSAL
   ========================================================================= */
interface GraphStep {
  visited: string[];
  current: string;
  queue: string[];
  path: string[];
  msg: string;
}

const GRAPH_STEPS: GraphStep[] = [
  { visited: ["A"], current: "A", queue: ["A"], path: ["A"], msg: "Push Start Node A to Queue (Dist = 0)" },
  { visited: ["A", "B", "C"], current: "A", queue: ["B", "C"], path: ["A"], msg: "Explore neighbors of A: Enqueue B and C (Dist = 1)" },
  { visited: ["A", "B", "C"], current: "B", queue: ["C", "D", "E"], path: ["A", "B"], msg: "Pop B: Explore unvisited neighbors D and E (Dist = 2)" },
  { visited: ["A", "B", "C", "D", "E"], current: "C", queue: ["D", "E"], path: ["A", "C"], msg: "Pop C: Neighbor E already queued, continue" },
  { visited: ["A", "B", "C", "D", "E", "F"], current: "D", queue: ["E", "F"], path: ["A", "B", "D", "F"], msg: "Pop D: Discovered Target Node F! (Dist = 3)" },
  { visited: ["A", "B", "C", "D", "E", "F"], current: "F", queue: [], path: ["A", "B", "D", "F"], msg: "🎯 Shortest Path Found: A → B → D → F (3 hops)" },
];

const DEFAULT_GRAPH_STEP: GraphStep = {
  visited: ["A"],
  current: "A",
  queue: ["A"],
  path: ["A"],
  msg: "Exploring graph structure",
};

interface GraphNode {
  id: string;
  x: number;
  y: number;
  label: string;
  level: number;
}

const GRAPH_NODES: GraphNode[] = [
  { id: "A", x: 15, y: 50, label: "Start (A)", level: 0 },
  { id: "B", x: 40, y: 20, label: "Node B", level: 1 },
  { id: "C", x: 40, y: 80, label: "Node C", level: 1 },
  { id: "D", x: 65, y: 20, label: "Node D", level: 2 },
  { id: "E", x: 65, y: 80, label: "Node E", level: 2 },
  { id: "F", x: 90, y: 50, label: "Target (F)", level: 3 },
];

const GRAPH_EDGES = [
  { from: "A", to: "B" },
  { from: "A", to: "C" },
  { from: "B", to: "D" },
  { from: "C", to: "E" },
  { from: "D", to: "F" },
  { from: "E", to: "F" },
  { from: "B", to: "E" },
];

function GraphBfsVisualizer({ isPlaying, setIsPlaying }: { isPlaying: boolean; setIsPlaying: (p: boolean) => void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setStep((prev) => (prev + 1) % GRAPH_STEPS.length);
    }, 1500);
    return () => clearInterval(timer);
  }, [isPlaying]);

  const currentStep: GraphStep = GRAPH_STEPS[step] ?? DEFAULT_GRAPH_STEP;

  return (
    <div className="space-y-6">
      {/* Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <span className="font-mono text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
            Breadth-First Search (BFS) • Shortest Path Unweighted
          </span>
          <p className="font-mono text-sm font-semibold text-foreground mt-1">{currentStep.msg}</p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-muted-foreground">Queue:</span>
          <div className="flex items-center gap-1">
            {currentStep.queue.length === 0 ? (
              <span className="text-muted-foreground/60">Empty</span>
            ) : (
              currentStep.queue.map((q, i) => (
                <span key={i} className="rounded bg-primary/20 border border-primary/40 px-2 py-0.5 text-primary font-bold">
                  {q}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Visual Canvas */}
      <div className="relative h-72 sm:h-80 w-full rounded-2xl bg-background/80 border border-border/60 p-6 overflow-hidden shadow-inner flex items-center justify-center">
        {/* SVG Connections */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {GRAPH_EDGES.map((edge, i) => {
            const n1 = GRAPH_NODES.find((n) => n.id === edge.from) ?? GRAPH_NODES[0]!;
            const n2 = GRAPH_NODES.find((n) => n.id === edge.to) ?? GRAPH_NODES[1]!;
            const idx1 = currentStep.path.indexOf(edge.from);
            const idx2 = currentStep.path.indexOf(edge.to);
            const isPathEdge =
              idx1 !== -1 &&
              idx2 !== -1 &&
              Math.abs(idx1 - idx2) === 1;

            return (
              <line
                key={i}
                x1={`${n1.x}%`}
                y1={`${n1.y}%`}
                x2={`${n2.x}%`}
                y2={`${n2.y}%`}
                stroke={isPathEdge ? "#10b981" : "rgba(255,255,255,0.15)"}
                strokeWidth={isPathEdge ? "3.5" : "1.5"}
                strokeDasharray={isPathEdge ? "none" : "4 4"}
                className="transition-all duration-300"
              />
            );
          })}
        </svg>

        {/* Nodes */}
        {GRAPH_NODES.map((node) => {
          const isVisited = currentStep.visited.includes(node.id);
          const isCurrent = currentStep.current === node.id;
          const isPath = currentStep.path.includes(node.id) && currentStep.current === "F";

          let nodeStyle = "border-border/80 bg-secondary/80 text-muted-foreground";
          if (isPath) {
            nodeStyle = "border-emerald-400 bg-emerald-500 text-emerald-950 font-black shadow-[0_0_20px_rgba(16,185,129,0.7)] scale-110";
          } else if (isCurrent) {
            nodeStyle = "border-primary bg-primary text-primary-foreground font-black shadow-[0_0_20px_rgba(var(--primary),0.8)] scale-125 animate-pulse";
          } else if (isVisited) {
            nodeStyle = "border-emerald-500/60 bg-emerald-500/20 text-emerald-400 font-bold";
          }

          return (
            <div
              key={node.id}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-300 z-10`}
            >
              <div
                className={`size-12 rounded-2xl border-2 flex items-center justify-center font-mono text-sm font-bold shadow-lg transition-all duration-300 ${nodeStyle}`}
              >
                {node.id}
              </div>
              <span className="font-mono text-[10px] text-muted-foreground mt-1 font-semibold">
                {node.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-mono text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-primary animate-pulse" />
          <span>Active Frontier (Exploring)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-emerald-500/30 border border-emerald-500/60" />
          <span>Visited Node</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
          <span>Shortest Path Solution</span>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   3. BINARY SEARCH TREE (BST) INSERTION & LOOKUP
   ========================================================================= */
interface BstStep {
  target: number;
  current: number;
  path: number[];
  msg: string;
}

const BST_STEPS: BstStep[] = [
  { target: 27, current: 50, path: [50], msg: "Search 27: Compare with Root (50). 27 < 50 → Branch Left (←)" },
  { target: 27, current: 25, path: [50, 25], msg: "Search 27: Compare with Node (25). 27 > 25 → Branch Right (→)" },
  { target: 27, current: 35, path: [50, 25, 35], msg: "Search 27: Compare with Node (35). 27 < 35 → Branch Left (←)" },
  { target: 27, current: 27, path: [50, 25, 35, 27], msg: "🎯 Match Found! Node 27 located in 4 comparisons (O(log n))" },
];

const DEFAULT_BST_STEP: BstStep = {
  target: 27,
  current: 50,
  path: [50],
  msg: "Traversing BST structure",
};

const BST_NODES = [
  { id: 50, x: 50, y: 15, left: 25, right: 75 },
  { id: 25, x: 28, y: 42, left: 15, right: 35 },
  { id: 75, x: 72, y: 42, left: 60, right: 85 },
  { id: 15, x: 18, y: 72 },
  { id: 35, x: 38, y: 72, left: 27 },
  { id: 60, x: 62, y: 72 },
  { id: 85, x: 82, y: 72 },
  { id: 27, x: 34, y: 92 },
];

function BstTraversalVisualizer({ isPlaying, setIsPlaying }: { isPlaying: boolean; setIsPlaying: (p: boolean) => void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setStep((prev) => (prev + 1) % BST_STEPS.length);
    }, 1500);
    return () => clearInterval(timer);
  }, [isPlaying]);

  const curr: BstStep = BST_STEPS[step] ?? DEFAULT_BST_STEP;

  return (
    <div className="space-y-6">
      {/* Top Status */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <span className="font-mono text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-accent animate-ping" />
            Binary Search Tree • Target = 27
          </span>
          <p className="font-mono text-sm font-semibold text-foreground mt-1">{curr.msg}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs rounded-xl bg-accent/10 border border-accent/30 px-3 py-1 text-accent font-bold">
            Comparisons: {curr.path.length} / 4
          </span>
        </div>
      </div>

      {/* Tree Canvas */}
      <div className="relative h-80 sm:h-96 w-full rounded-2xl bg-background/80 border border-border/60 p-4 shadow-inner">
        {/* SVG Edges */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <line x1="50%" y1="15%" x2="28%" y2="42%" stroke="var(--accent)" strokeWidth={curr.path.includes(25) ? "3" : "1.5"} opacity={curr.path.includes(25) ? 1 : 0.25} />
          <line x1="50%" y1="15%" x2="72%" y2="42%" stroke="#64748b" strokeWidth="1.5" opacity="0.25" />
          <line x1="28%" y1="42%" x2="18%" y2="72%" stroke="#64748b" strokeWidth="1.5" opacity="0.25" />
          <line x1="28%" y1="42%" x2="38%" y2="72%" stroke="var(--accent)" strokeWidth={curr.path.includes(35) ? "3" : "1.5"} opacity={curr.path.includes(35) ? 1 : 0.25} />
          <line x1="72%" y1="42%" x2="62%" y2="72%" stroke="#64748b" strokeWidth="1.5" opacity="0.25" />
          <line x1="72%" y1="42%" x2="82%" y2="72%" stroke="#64748b" strokeWidth="1.5" opacity="0.25" />
          <line x1="38%" y1="72%" x2="34%" y2="92%" stroke="var(--accent)" strokeWidth={curr.path.includes(27) ? "3" : "1.5"} opacity={curr.path.includes(27) ? 1 : 0.25} />
        </svg>

        {BST_NODES.map((n) => {
          const isCurrent = curr.current === n.id;
          const isVisited = curr.path.includes(n.id);
          const isTargetFound = n.id === 27 && curr.current === 27;

          let style = "border-border/70 bg-card text-muted-foreground";
          if (isTargetFound) {
            style = "border-emerald-400 bg-emerald-500 text-emerald-950 font-black shadow-[0_0_25px_rgba(16,185,129,0.8)] scale-125 animate-bounce";
          } else if (isCurrent) {
            style = "border-accent bg-accent text-accent-foreground font-black shadow-[0_0_20px_color-mix(in_oklch,var(--accent)_80%,transparent)] scale-110";
          } else if (isVisited) {
            style = "border-accent/60 bg-accent/20 text-accent font-bold";
          }

          return (
            <div
              key={n.id}
              style={{ left: `${n.x}%`, top: `${n.y}%` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 size-10 sm:size-12 rounded-full border-2 flex items-center justify-center font-mono text-xs sm:text-sm shadow-md transition-all duration-300 z-10 ${style}`}
            >
              {n.id}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================================
   4. DYNAMIC PROGRAMMING 2D MATRIX (0/1 KNAPSACK)
   ========================================================================= */
interface DpStep {
  r: number;
  c: number;
  msg: string;
}

const DP_STEPS: DpStep[] = [
  { r: 1, c: 1, msg: "dp[1][1] = max(dp[0][1], dp[0][0] + 15) = 15" },
  { r: 2, c: 2, msg: "dp[2][2] = max(dp[1][2], dp[1][0] + 20) = 20" },
  { r: 2, c: 3, msg: "dp[2][3] = max(dp[1][3], dp[1][1] + 20) = 35" },
  { r: 3, c: 4, msg: "🎯 dp[3][4] = max(dp[2][4], dp[2][1] + 30) = 45 (Max Profit!)" },
];

const DEFAULT_DP_STEP: DpStep = {
  r: 2,
  c: 3,
  msg: "State transition calculation",
};

const DP_MATRIX: number[][] = [
  [0, 0, 0, 0, 0],
  [0, 15, 15, 15, 15],
  [0, 15, 20, 35, 35],
  [0, 15, 20, 35, 45],
];

function DpGridVisualizer({ isPlaying, setIsPlaying }: { isPlaying: boolean; setIsPlaying: (p: boolean) => void }) {
  const capacities = [0, 1, 2, 3, 4];
  const [activeCell, setActiveCell] = useState<{ r: number; c: number }>({ r: 2, c: 3 });
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setStep((prev) => {
        const next = (prev + 1) % DP_STEPS.length;
        const targetStep = DP_STEPS[next] ?? DEFAULT_DP_STEP;
        setActiveCell({ r: targetStep.r, c: targetStep.c });
        return next;
      });
    }, 1600);
    return () => clearInterval(timer);
  }, [isPlaying]);

  const currentStep: DpStep = DP_STEPS[step] ?? DEFAULT_DP_STEP;

  return (
    <div className="space-y-6">
      {/* Top Status */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <span className="font-mono text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-purple-400 animate-ping" />
            0/1 Knapsack State Space • Max Weight = 4
          </span>
          <p className="font-mono text-sm font-semibold text-foreground mt-1">{currentStep.msg}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs rounded-xl bg-purple-500/10 border border-purple-500/30 px-3 py-1 text-purple-400 font-bold">
            Recurrence: max(dp[i-1][w], dp[i-1][w-wt] + val)
          </span>
        </div>
      </div>

      {/* DP Matrix Grid Table */}
      <div className="overflow-x-auto rounded-2xl border border-border/70 bg-background/80 p-4 shadow-inner">
        <table className="w-full text-center font-mono text-xs">
          <thead>
            <tr className="border-b border-border/60 text-muted-foreground">
              <th className="p-3 text-left">Item / Cap</th>
              {capacities.map((c) => (
                <th key={c} className="p-3 text-foreground font-bold">
                  W = {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {["Base (0)", "Item 1 (w=1, v=15)", "Item 2 (w=2, v=20)", "Item 3 (w=3, v=30)"].map((label, r) => (
              <tr key={r} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                <td className="p-3 text-left font-bold text-muted-foreground">{label}</td>
                {capacities.map((c) => {
                  const isCurrent = activeCell.r === r && activeCell.c === c;
                  const isFilled = r <= activeCell.r || (r === activeCell.r && c <= activeCell.c);

                  let cellStyle = "text-muted-foreground/50";
                  if (isCurrent) {
                    cellStyle = "bg-purple-500 text-purple-950 font-black scale-105 shadow-[0_0_15px_rgba(168,85,247,0.7)] rounded-xl border border-purple-300 animate-pulse";
                  } else if (isFilled) {
                    cellStyle = "bg-purple-500/15 text-purple-300 font-bold rounded-lg border border-purple-500/30";
                  }

                  const row = DP_MATRIX[r];
                  const val = row ? row[c] : "-";

                  return (
                    <td key={c} className="p-2">
                      <div className={`p-2 transition-all duration-300 ${cellStyle}`}>
                        {isFilled ? (val !== undefined ? val : "-") : "-"}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
