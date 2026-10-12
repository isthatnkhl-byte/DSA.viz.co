import { useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Sparkles,
  Code2,
  Terminal,
  Gauge,
  Cpu,
  ArrowUpRight,
  Layers,
  Activity,
  Zap,
  GitCompareArrows,
  Search,
  SlidersHorizontal,
  TrendingUp,
} from "lucide-react";

type AlgorithmType =
  | "two-pointers"
  | "binary-search"
  | "sliding-window"
  | "kadane-dp";

interface StepData {
  l: number;
  r: number;
  valL?: number;
  valR?: number;
  mid?: number;
  valMid?: number;
  sum?: number;
  windowSum?: number;
  maxVal?: number;
  action: string;
  invariantNote: string;
  inlineEval: string;
  codeLine: number;
  found: boolean;
  highlightedIndices?: number[];
  discardedIndices?: number[];
}

interface AlgorithmConfig {
  id: AlgorithmType;
  title: string;
  shortTag: string;
  subtitle: string;
  problemSlug: string;
  difficulty: "Easy" | "Medium";
  timeComplexity: string;
  spaceComplexity: string;
  badge: string;
  array: number[];
  targetLabel: string;
  metricLabel: string;
  code: { line: number; text: string }[];
  steps: StepData[];
}

const ALGORITHMS: Record<AlgorithmType, AlgorithmConfig> = {
  "two-pointers": {
    id: "two-pointers",
    title: "Two Pointers",
    shortTag: "O(n) Converging",
    subtitle: "Two Sum II — Sorted Input Array",
    problemSlug: "two-sum",
    difficulty: "Medium",
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
    badge: "O(n) Linear Invariant",
    array: [1, 4, 6, 8, 11, 15],
    targetLabel: "Target = 14",
    metricLabel: "Pair Sum (nums[L] + nums[R])",
    code: [
      { line: 1, text: "int l = 0, r = nums.size() - 1;" },
      { line: 2, text: "while (l < r) {" },
      { line: 3, text: "  int sum = nums[l] + nums[r];" },
      { line: 4, text: "  if (sum == target) return {l, r};" },
      { line: 5, text: "  else if (sum < target) l++;" },
      { line: 6, text: "  else r--;" },
      { line: 7, text: "}" },
    ],
    steps: [
      {
        l: 0,
        r: 5,
        valL: 1,
        valR: 15,
        sum: 16,
        action: "1 + 15 = 16 > 14 → Sum exceeds target; shift right pointer R left (←)",
        invariantNote: "All pairs (l, 5) with l >= 0 have sum >= 16 > 14, so index 5 is safely eliminated.",
        inlineEval: "sum = 16 > 14  ⟹  r-- (5 → 4)",
        codeLine: 6,
        found: false,
        discardedIndices: [],
      },
      {
        l: 0,
        r: 4,
        valL: 1,
        valR: 11,
        sum: 12,
        action: "1 + 11 = 12 < 14 → Sum below target; advance left pointer L right (→)",
        invariantNote: "All pairs (0, r) with r <= 4 have sum <= 12 < 14, so index 0 is safely eliminated.",
        inlineEval: "sum = 12 < 14  ⟹  l++ (0 → 1)",
        codeLine: 5,
        found: false,
        discardedIndices: [5],
      },
      {
        l: 1,
        r: 4,
        valL: 4,
        valR: 11,
        sum: 15,
        action: "4 + 11 = 15 > 14 → Sum exceeds target; shift right pointer R left (←)",
        invariantNote: "Sorted monotonic property guarantees nums[4] = 11 is too large for any l >= 1.",
        inlineEval: "sum = 15 > 14  ⟹  r-- (4 → 3)",
        codeLine: 6,
        found: false,
        discardedIndices: [0, 5],
      },
      {
        l: 1,
        r: 3,
        valL: 4,
        valR: 8,
        sum: 12,
        action: "4 + 8 = 12 < 14 → Sum below target; advance left pointer L right (→)",
        invariantNote: "nums[1] = 4 paired with largest remaining nums[3] = 8 is still < 14; advance L.",
        inlineEval: "sum = 12 < 14  ⟹  l++ (1 → 2)",
        codeLine: 5,
        found: false,
        discardedIndices: [0, 4, 5],
      },
      {
        l: 2,
        r: 3,
        valL: 6,
        valR: 8,
        sum: 14,
        action: "6 + 8 = 14 == 14 → Exact Target Match! Return indices [2, 3]",
        invariantNote: "Converged in 5 linear comparisons instead of 15 brute-force pairs.",
        inlineEval: "sum == 14  ⟹  return {2, 3} ✓",
        codeLine: 4,
        found: true,
        highlightedIndices: [2, 3],
        discardedIndices: [0, 1, 4, 5],
      },
    ],
  },
  "binary-search": {
    id: "binary-search",
    title: "Binary Search",
    shortTag: "O(log n) Bisect",
    subtitle: "Exact Target Bisection in Sorted Space",
    problemSlug: "binary-search",
    difficulty: "Easy",
    timeComplexity: "O(log n)",
    spaceComplexity: "O(1)",
    badge: "O(log n) Space Halving",
    array: [2, 5, 8, 12, 16, 23, 38, 56],
    targetLabel: "Target = 23",
    metricLabel: "Midpoint Probe (nums[MID])",
    code: [
      { line: 1, text: "int low = 0, high = nums.size() - 1;" },
      { line: 2, text: "while (low <= high) {" },
      { line: 3, text: "  int mid = low + (high - low) / 2;" },
      { line: 4, text: "  if (nums[mid] == target) return mid;" },
      { line: 5, text: "  if (nums[mid] < target) low = mid + 1;" },
      { line: 6, text: "  else high = mid - 1;" },
      { line: 7, text: "}" },
    ],
    steps: [
      {
        l: 0,
        r: 7,
        mid: 3,
        valL: 2,
        valR: 56,
        valMid: 12,
        action: "mid = 3 (nums[3] = 12 < 23) → Prune entire left half [0..3], set low = 4",
        invariantNote: "50% of the search space (indices 0..3) eliminated in a single comparison.",
        inlineEval: "nums[3] = 12 < 23  ⟹  low = 4",
        codeLine: 5,
        found: false,
        highlightedIndices: [0, 1, 2, 3, 4, 5, 6, 7],
        discardedIndices: [],
      },
      {
        l: 4,
        r: 7,
        mid: 5,
        valL: 16,
        valR: 56,
        valMid: 23,
        action: "mid = 5 (nums[5] = 23 == 23) → Target Locked at Index 5 in 2 Steps!",
        invariantNote: "Logarithmic bisection located target in 2 probes instead of 6 linear scans.",
        inlineEval: "nums[5] == 23  ⟹  return 5 ✓",
        codeLine: 4,
        found: true,
        highlightedIndices: [5],
        discardedIndices: [0, 1, 2, 3],
      },
    ],
  },
  "sliding-window": {
    id: "sliding-window",
    title: "Sliding Window",
    shortTag: "O(n) Rolling Frame",
    subtitle: "Maximum Sum Subarray of Fixed Size k = 3",
    problemSlug: "maximum-subarray",
    difficulty: "Medium",
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
    badge: "O(1) Delta Transition",
    array: [2, 1, 5, 2, 8, 1, 4],
    targetLabel: "Window Size k = 3",
    metricLabel: "Rolling Window Sum",
    code: [
      { line: 1, text: "int windowSum = sumFirstK(nums, k);" },
      { line: 2, text: "int maxSum = windowSum;" },
      { line: 3, text: "for (int r = k; r < n; r++) {" },
      { line: 4, text: "  windowSum += nums[r] - nums[r - k];" },
      { line: 5, text: "  maxSum = max(maxSum, windowSum);" },
      { line: 6, text: "}" },
      { line: 7, text: "return maxSum;" },
    ],
    steps: [
      {
        l: 0,
        r: 2,
        valL: 2,
        valR: 5,
        windowSum: 8,
        maxVal: 8,
        action: "Initialize window [0..2] → [2, 1, 5] | Window Sum = 8 | Best Max = 8",
        invariantNote: "Base window of size k = 3 established; subsequent moves take O(1) arithmetic.",
        inlineEval: "windowSum = 2 + 1 + 5 = 8",
        codeLine: 1,
        found: false,
        highlightedIndices: [0, 1, 2],
        discardedIndices: [],
      },
      {
        l: 1,
        r: 3,
        valL: 1,
        valR: 2,
        windowSum: 8,
        maxVal: 8,
        action: "Slide right [1..3] → Evict nums[0]=2, Add nums[3]=2 | Sum = 8 | Max = 8",
        invariantNote: "Instead of re-summing k elements, update in O(1): prevSum - outgoing + incoming.",
        inlineEval: "windowSum = 8 - 2 + 2 = 8",
        codeLine: 4,
        found: false,
        highlightedIndices: [1, 2, 3],
        discardedIndices: [0],
      },
      {
        l: 2,
        r: 4,
        valL: 5,
        valR: 8,
        windowSum: 15,
        maxVal: 15,
        action: "Slide right [2..4] → Evict nums[1]=1, Add nums[4]=8 | New Peak Max = 15!",
        invariantNote: "Window [5, 2, 8] hits sum = 15, updating our global maximum invariant.",
        inlineEval: "maxSum = max(8, 15)  ⟹  15 ✓",
        codeLine: 5,
        found: true,
        highlightedIndices: [2, 3, 4],
        discardedIndices: [0, 1],
      },
      {
        l: 3,
        r: 5,
        valL: 2,
        valR: 1,
        windowSum: 11,
        maxVal: 15,
        action: "Slide right [3..5] → Evict nums[2]=5, Add nums[5]=1 | Sum = 11 | Max = 15",
        invariantNote: "Rolling sum drops to 11, but maxSum register preserves the peak of 15.",
        inlineEval: "windowSum = 15 - 5 + 1 = 11",
        codeLine: 4,
        found: false,
        highlightedIndices: [3, 4, 5],
        discardedIndices: [0, 1, 2],
      },
      {
        l: 4,
        r: 6,
        valL: 8,
        valR: 4,
        windowSum: 13,
        maxVal: 15,
        action: "Final window [4..6] → [8, 1, 4] | Sum = 13 | Optimal Max = 15 Verified!",
        invariantNote: "Completed full array scan in 1 pass; optimal subarray [5, 2, 8] = 15.",
        inlineEval: "return maxSum = 15 ✓",
        codeLine: 7,
        found: true,
        highlightedIndices: [4, 5, 6],
        discardedIndices: [0, 1, 2, 3],
      },
    ],
  },
  "kadane-dp": {
    id: "kadane-dp",
    title: "Kadane's DP",
    shortTag: "O(n) State Transition",
    subtitle: "Maximum Subarray — Dynamic Reset vs. Extend",
    problemSlug: "maximum-subarray",
    difficulty: "Medium",
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
    badge: "O(n) DP Recurrence",
    array: [-2, 1, -3, 4, -1, 2, 1, -5],
    targetLabel: "Max Contiguous Sum",
    metricLabel: "Running Subarray Sum (curr)",
    code: [
      { line: 1, text: "int curr = nums[0], best = nums[0];" },
      { line: 2, text: "for (int r = 1; r < n; r++) {" },
      { line: 3, text: "  if (curr < 0) { curr = nums[r]; l = r; }" },
      { line: 4, text: "  else curr += nums[r];" },
      { line: 5, text: "  best = max(best, curr);" },
      { line: 6, text: "}" },
      { line: 7, text: "return best;" },
    ],
    steps: [
      {
        l: 1,
        r: 1,
        valL: 1,
        valR: 1,
        sum: 1,
        maxVal: 1,
        action: "Prefix -2 < 0 is a drag → Reset subarray start L = R = 1 (val = 1)",
        invariantNote: "Any negative running prefix reduces future sums; discard [-2] immediately.",
        inlineEval: "curr < 0  ⟹  reset curr = 1, l = 1",
        codeLine: 3,
        found: false,
        highlightedIndices: [1],
        discardedIndices: [0],
      },
      {
        l: 3,
        r: 3,
        valL: 4,
        valR: 4,
        sum: 4,
        maxVal: 4,
        action: "After dip at -3, reset start at index 3 (nums[3] = 4) → New Best = 4",
        invariantNote: "Subarray [1, -3] summed to -2 < 0, so fresh start at 4 yields higher state.",
        inlineEval: "curr < 0  ⟹  reset curr = 4, best = 4",
        codeLine: 3,
        found: false,
        highlightedIndices: [3],
        discardedIndices: [0, 1, 2],
      },
      {
        l: 3,
        r: 5,
        valL: 4,
        valR: 2,
        sum: 5,
        maxVal: 5,
        action: "Extend window [4, -1, 2] → Running sum climbs to 5 → New Best = 5",
        invariantNote: "Even though -1 dipped the sum to 3 > 0, keeping the positive prefix paid off!",
        inlineEval: "curr = 3 + 2 = 5  ⟹  best = 5",
        codeLine: 4,
        found: false,
        highlightedIndices: [3, 4, 5],
        discardedIndices: [0, 1, 2],
      },
      {
        l: 3,
        r: 6,
        valL: 4,
        valR: 1,
        sum: 6,
        maxVal: 6,
        action: "Extend window [4, -1, 2, 1] → Peak Contiguous Sum = 6 Locked!",
        invariantNote: "Optimal subarray [3..6] achieves global maximum sum = 6 in O(n) time.",
        inlineEval: "best = max(5, 6)  ⟹  6 ✓",
        codeLine: 5,
        found: true,
        highlightedIndices: [3, 4, 5, 6],
        discardedIndices: [0, 1, 2, 7],
      },
    ],
  },
};

const ALGO_ICONS: Record<AlgorithmType, typeof GitCompareArrows> = {
  "two-pointers": GitCompareArrows,
  "binary-search": Search,
  "sliding-window": SlidersHorizontal,
  "kadane-dp": TrendingUp,
};

// Shared 60fps GPU spring configuration for pointer movement and layout glides
const POINTER_SPRING = {
  type: "spring" as const,
  stiffness: 240,
  damping: 26,
  mass: 0.75,
};

const COLOR_TRANSITION = {
  duration: 0.42,
  ease: [0.22, 1, 0.36, 1] as const,
};

export function LiveVisualizerCard() {
  const [algoKey, setAlgoKey] = useState<AlgorithmType>("two-pointers");
  const [stepIdx, setStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentAlgo = ALGORITHMS[algoKey];
  const steps = currentAlgo.steps;
  const currentStep = steps[stepIdx] ?? steps[0]!;
  const array = currentAlgo.array;

  const handleSelectAlgo = (key: AlgorithmType) => {
    setAlgoKey(key);
    setStepIdx(0);
    setIsPlaying(true);
  };

  useEffect(() => {
    if (isPlaying) {
      const delay = Math.max(900, Math.floor(2400 / playbackSpeed));
      timerRef.current = setInterval(() => {
        setStepIdx((prev) => (prev >= steps.length - 1 ? 0 : prev + 1));
      }, delay);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed, steps.length]);

  const isCoincident = currentStep.l === currentStep.r;

  // Compute active range bracket geometry
  const rangeStartIdx = Math.min(currentStep.l, currentStep.r);
  const rangeEndIdx = Math.max(currentStep.l, currentStep.r);
  const rangeScaleX = (rangeEndIdx - rangeStartIdx + 1) / array.length;
  const rangeTranslatePct = (rangeStartIdx / array.length) * 100;

  // Primary live metric value
  const liveMetricValue =
    currentStep.sum !== undefined
      ? currentStep.sum
      : currentStep.valMid !== undefined
        ? currentStep.valMid
        : currentStep.windowSum !== undefined
          ? currentStep.windowSum
          : "—";

  const slotWidthPct = 100 / array.length;

  return (
    <section className="relative py-12 sm:py-16 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto w-full">
      {/* Multi-Layered Flagship Ambient Spotlight */}
      <div className="pointer-events-none absolute -inset-x-4 -inset-y-6 -z-10 overflow-hidden rounded-[2.5rem]">
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 size-[420px] rounded-full bg-primary/20 blur-[130px]" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/3 translate-y-1/3 size-[420px] rounded-full bg-accent/20 blur-[130px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-accent/5" />
      </div>

      {/* Section Spotlight Header */}
      <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
        <div className="inline-flex items-center gap-2.5 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-[11px] font-mono font-bold uppercase tracking-widest text-primary shadow-lg shadow-primary/10 backdrop-blur-md mb-4">
          <span className="relative flex size-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-complement opacity-80" />
            <span className="relative inline-flex rounded-full size-2 bg-complement" />
          </span>
          <span>Live Execution Stage • Synchronized Invariant Engine</span>
        </div>

        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground leading-[1.1]">
          Watch Code, Pointers &amp; Memory Lock In <br />
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-pixel text-4xl sm:text-5xl md:text-6xl py-2 block mt-6 mb-4 drop-shadow-[0_0_20px_color-mix(in_oklch,var(--primary)_60%,transparent)]">
            Real Time
          </span>
        </h2>

        <p className="mt-3 text-sm sm:text-base text-muted-foreground font-sans max-w-2xl mx-auto">
          Don&apos;t memorize dry code templates. Step frame-by-frame through pointers, shrinking search intervals, and live register states synchronized to every line of C++.
        </p>
      </div>

      {/* Flagship Studio Container */}
      <div className="relative rounded-3xl border border-primary/35 bg-card/90 shadow-[0_25px_90px_-20px_rgba(0,0,0,0.65)] backdrop-blur-2xl overflow-hidden">
        {/* Top Laser Accent Line */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-primary to-transparent opacity-90" />

        {/* Studio Window Chrome & Pattern Switcher Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/70 bg-secondary/35 px-4 sm:px-6 py-3.5">
          {/* Left: Window Controls & Engine Telemetry */}
          <div className="flex items-center justify-between lg:justify-start gap-3">
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded-full bg-rose-500/85 shadow-xs" />
              <span className="size-3 rounded-full bg-amber-500/85 shadow-xs" />
              <span className="size-3 rounded-full bg-emerald-500/85 shadow-xs" />
            </div>
            <div className="h-4 w-[1px] bg-border/70 hidden sm:block" />
            <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
              <Cpu className="size-3.5 text-primary" />
              <span className="font-bold text-foreground">dsa-viz://debugger</span>
              <span className="hidden xl:inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                <Activity className="size-2.5 animate-pulse" />
                <span>60FPS GPU SYNC</span>
              </span>
            </div>

            {/* Mobile Speed Pill */}
            <button
              type="button"
              onClick={() => {
                const speeds = [1, 1.5, 2, 0.75];
                const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
                setPlaybackSpeed(speeds[nextIdx] ?? 1);
              }}
              className="lg:hidden flex items-center gap-1 rounded-lg border border-border/70 bg-background/80 px-2.5 py-1 font-mono text-[11px] text-foreground font-bold"
              title="Toggle Playback Speed"
            >
              <Gauge className="size-3 text-primary" />
              <span>{playbackSpeed}x</span>
            </button>
          </div>

          {/* Center: Single-Row 4-Algorithm Switcher Tabs with 60fps Active Pill */}
          <div
            className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 rounded-2xl border border-border/70 bg-background/70 p-1.5"
            role="tablist"
          >
            {(Object.keys(ALGORITHMS) as AlgorithmType[]).map((key) => {
              const item = ALGORITHMS[key];
              const isSelected = key === algoKey;
              const Icon = ALGO_ICONS[key];
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => handleSelectAlgo(key)}
                  className={`relative group flex items-center justify-center gap-2 rounded-xl px-3 py-2 font-mono text-xs transition-colors duration-300 ${
                    isSelected
                      ? "text-primary-foreground font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="active-algo-tab-pill"
                      transition={POINTER_SPRING}
                      className="absolute inset-0 rounded-xl bg-primary shadow-md shadow-primary/25 -z-0"
                    />
                  )}
                  <Icon
                    className={`relative z-10 size-3.5 shrink-0 transition-transform duration-300 ${
                      isSelected
                        ? "text-primary-foreground"
                        : "text-primary group-hover:scale-110"
                    }`}
                  />
                  <span className="relative z-10 truncate">{item.title}</span>
                </button>
              );
            })}
          </div>

          {/* Right: Speed Selector & Full Problem Launch CTA */}
          <div className="hidden lg:flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                const speeds = [1, 1.5, 2, 0.75];
                const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
                setPlaybackSpeed(speeds[nextIdx] ?? 1);
              }}
              className="flex items-center gap-1.5 rounded-xl border border-border/70 bg-background/80 px-3 py-1.5 font-mono text-xs text-foreground font-bold hover:border-primary/50 transition-colors"
              title="Cycle Playback Speed"
            >
              <Gauge className="size-3.5 text-primary" />
              <span>{playbackSpeed}x Speed</span>
            </button>

            <Link
              to="/problem/$slug"
              params={{ slug: currentAlgo.problemSlug }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/15 px-3.5 py-1.5 font-mono text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-colors shadow-sm"
            >
              <span>Open Sandbox</span>
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* Main 2-Column Interactive Split Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_0.95fr] divide-y lg:divide-y-0 lg:divide-x divide-border/70">
          {/* LEFT STAGE: Array & Pointer Arena + Live Variable Telemetry */}
          <div className="p-5 sm:p-7 md:p-8 flex flex-col justify-between bg-gradient-to-b from-background/40 to-background/80">
            {/* Problem Context Header */}
            <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span
                    className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider border transition-colors duration-300 ${
                      currentAlgo.difficulty === "Easy"
                        ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                        : "border-amber-500/40 bg-amber-500/15 text-amber-400"
                    }`}
                  >
                    {currentAlgo.difficulty}
                  </span>
                  <span className="rounded-md border border-primary/30 bg-primary/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-primary">
                    {currentAlgo.badge}
                  </span>
                  <span className="rounded-md border border-border/70 bg-secondary/60 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-foreground">
                    {currentAlgo.targetLabel}
                  </span>
                </div>
                <h3 className="font-display text-lg sm:text-xl font-black text-foreground">
                  {currentAlgo.subtitle}
                </h3>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="rounded-lg border border-border/70 bg-card/90 px-2.5 py-1 text-muted-foreground">
                  Time: <strong className="text-primary">{currentAlgo.timeComplexity}</strong>
                </span>
                <span className="rounded-lg border border-border/70 bg-card/90 px-2.5 py-1 text-muted-foreground">
                  Space: <strong className="text-complement">{currentAlgo.spaceComplexity}</strong>
                </span>
              </div>
            </div>

            {/* Interactive Array Stage Box */}
            <div className="relative rounded-2xl border border-border/80 bg-card/75 p-4 sm:p-6 shadow-inner overflow-hidden">
              {/* Subtle Stage Header & Active Range Span Indicator */}
              <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground mb-4">
                <span className="flex items-center gap-1.5 font-bold text-foreground">
                  <Layers className="size-3.5 text-primary" />
                  <span>Memory Array Buffer ({array.length} elements)</span>
                </span>
                <span>
                  Active Span:{" "}
                  <strong className="text-primary">
                    [{rangeStartIdx} .. {rangeEndIdx}]
                  </strong>{" "}
                  ({rangeEndIdx - rangeStartIdx + 1} items)
                </span>
              </div>

              {/* Active Range / Window Bracket Bar — GPU Composited x + scaleX */}
              <div className="relative h-2 w-full rounded-full bg-secondary/70 mb-4 overflow-hidden">
                <motion.div
                  initial={false}
                  animate={{
                    left: `${rangeTranslatePct}%`,
                    width: `${rangeScaleX * 100}%`,
                    backgroundColor: currentStep.found
                      ? "rgba(16, 185, 129, 0.95)"
                      : "rgba(99, 102, 241, 0.9)",
                    boxShadow: currentStep.found
                      ? "0 0 16px rgba(16, 185, 129, 0.75)"
                      : "0 0 12px rgba(99, 102, 241, 0.45)",
                  }}
                  transition={POINTER_SPRING}
                  className="absolute top-0 bottom-0 rounded-full will-change-transform"
                />
              </div>

              {/* Top Pointer Role Badges Track — GPU Composited translateX */}
              <div className="relative h-6 mb-2 select-none">
                {/* L / LOW Top Badge */}
                <motion.div
                  initial={false}
                  animate={{
                    x: `${currentStep.l * 100}%`,
                    y: 0,
                  }}
                  transition={POINTER_SPRING}
                  style={{ width: `${slotWidthPct}%` }}
                  className="absolute top-0 left-0 flex justify-center items-center h-6 will-change-transform pointer-events-none"
                >
                  <motion.span
                    initial={false}
                    animate={{
                      backgroundColor: currentStep.found
                        ? "rgba(16, 185, 129, 0.22)"
                        : "rgba(99, 102, 241, 0.20)",
                      borderColor: currentStep.found
                        ? "rgba(52, 211, 153, 0.7)"
                        : "rgba(99, 102, 241, 0.55)",
                      color: currentStep.found ? "#6ee7b7" : "#818cf8",
                    }}
                    transition={COLOR_TRANSITION}
                    className="rounded border px-1.5 py-0.5 font-mono text-[9px] sm:text-[10px] font-extrabold leading-none shadow-xs"
                  >
                    {isCoincident
                      ? "L = R"
                      : algoKey === "binary-search"
                        ? "LOW"
                        : "L"}
                  </motion.span>
                </motion.div>

                {/* MID Top Badge (for Binary Search) */}
                <AnimatePresence>
                  {currentStep.mid !== undefined && (
                    <motion.div
                      key="top-mid-pointer"
                      initial={{ opacity: 0, scale: 0.85, x: `${currentStep.mid * 100}%` }}
                      animate={{ opacity: 1, scale: 1, x: `${currentStep.mid * 100}%` }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      transition={POINTER_SPRING}
                      style={{ width: `${slotWidthPct}%`, zIndex: 30 }}
                      className="absolute top-0 left-0 flex justify-center items-center h-6 will-change-transform pointer-events-none"
                    >
                      <motion.span
                        animate={{
                          backgroundColor: currentStep.found
                            ? "rgba(16, 185, 129, 0.25)"
                            : "rgba(245, 158, 11, 0.22)",
                          borderColor: currentStep.found
                            ? "rgba(52, 211, 153, 0.75)"
                            : "rgba(251, 191, 36, 0.65)",
                          color: currentStep.found ? "#6ee7b7" : "#fde68a",
                        }}
                        transition={COLOR_TRANSITION}
                        className="rounded border px-1.5 py-0.5 font-mono text-[9px] sm:text-[10px] font-extrabold leading-none shadow-xs"
                      >
                        MID
                      </motion.span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* R / HIGH Top Badge */}
                {!isCoincident && (
                  <motion.div
                    initial={false}
                    animate={{
                      x: `${currentStep.r * 100}%`,
                    }}
                    transition={POINTER_SPRING}
                    style={{ width: `${slotWidthPct}%` }}
                    className="absolute top-0 left-0 flex justify-center items-center h-6 will-change-transform pointer-events-none"
                  >
                    <motion.span
                      initial={false}
                      animate={{
                        backgroundColor: currentStep.found
                          ? "rgba(16, 185, 129, 0.22)"
                          : "rgba(168, 85, 247, 0.20)",
                        borderColor: currentStep.found
                          ? "rgba(52, 211, 153, 0.7)"
                          : "rgba(168, 85, 247, 0.55)",
                        color: currentStep.found ? "#6ee7b7" : "#c084fc",
                      }}
                      transition={COLOR_TRANSITION}
                      className="rounded border px-1.5 py-0.5 font-mono text-[9px] sm:text-[10px] font-extrabold leading-none shadow-xs"
                    >
                      {algoKey === "binary-search" ? "HIGH" : "R"}
                    </motion.span>
                  </motion.div>
                )}
              </div>

              {/* Array Element Tiles — 60fps GPU-interpolated transform & color states */}
              <div
                className="grid gap-2 sm:gap-3"
                style={{ gridTemplateColumns: `repeat(${array.length}, minmax(0, 1fr))` }}
              >
                {array.map((val, idx) => {
                  const isL = idx === currentStep.l;
                  const isR = idx === currentStep.r;
                  const isMid = idx === currentStep.mid;
                  const isHighlighted = currentStep.highlightedIndices?.includes(idx);
                  const isDiscarded = currentStep.discardedIndices?.includes(idx);
                  const isInActiveRange = idx >= rangeStartIdx && idx <= rangeEndIdx;
                  const isMatch =
                    currentStep.found &&
                    (isL ||
                      isR ||
                      isMid ||
                      (isHighlighted && algoKey !== "binary-search"));

                  // Smooth explicit RGBA & transform targets so Framer Motion interpolates colors at 60fps
                  let bgTarget = "rgba(30, 41, 59, 0.45)";
                  let borderTarget = "rgba(100, 116, 139, 0.35)";
                  let textTarget = "rgba(248, 250, 252, 0.9)";
                  let shadowTarget = "0 0px 0px rgba(0, 0, 0, 0)";
                  let scaleTarget = 1;
                  let yTarget = 0;
                  let opacityTarget = 1;

                  if (isMatch) {
                    bgTarget = "rgba(16, 185, 129, 0.24)";
                    borderTarget = "rgba(52, 211, 153, 0.95)";
                    textTarget = "#6ee7b7";
                    shadowTarget = "0 10px 25px -4px rgba(16, 185, 129, 0.38)";
                    scaleTarget = 1.05;
                    yTarget = -4;
                  } else if (isMid) {
                    bgTarget = "rgba(245, 158, 11, 0.24)";
                    borderTarget = "rgba(251, 191, 36, 0.95)";
                    textTarget = "#fde68a";
                    shadowTarget = "0 10px 25px -4px rgba(245, 158, 11, 0.32)";
                    scaleTarget = 1.05;
                    yTarget = -4;
                  } else if (isL) {
                    bgTarget = "rgba(99, 102, 241, 0.24)";
                    borderTarget = "rgba(129, 140, 248, 0.95)";
                    textTarget = "#a5b4fc";
                    shadowTarget = "0 8px 20px -4px rgba(99, 102, 241, 0.32)";
                    scaleTarget = 1.035;
                    yTarget = -2;
                  } else if (isR) {
                    bgTarget = "rgba(168, 85, 247, 0.24)";
                    borderTarget = "rgba(192, 132, 252, 0.95)";
                    textTarget = "#d8b4fe";
                    shadowTarget = "0 8px 20px -4px rgba(168, 85, 247, 0.32)";
                    scaleTarget = 1.035;
                    yTarget = -2;
                  } else if (isHighlighted || isInActiveRange) {
                    bgTarget = "rgba(99, 102, 241, 0.11)";
                    borderTarget = "rgba(99, 102, 241, 0.45)";
                    textTarget = "rgba(248, 250, 252, 0.96)";
                  } else if (isDiscarded) {
                    bgTarget = "rgba(15, 23, 42, 0.25)";
                    borderTarget = "rgba(100, 116, 139, 0.18)";
                    textTarget = "rgba(148, 163, 184, 0.45)";
                    scaleTarget = 0.96;
                    opacityTarget = 0.48;
                  }

                  return (
                    <div key={idx} className="flex flex-col items-center">
                      <motion.div
                        initial={false}
                        animate={{
                          backgroundColor: bgTarget,
                          borderColor: borderTarget,
                          color: textTarget,
                          boxShadow: shadowTarget,
                          scale: scaleTarget,
                          y: yTarget,
                          opacity: opacityTarget,
                        }}
                        transition={{
                          scale: POINTER_SPRING,
                          y: POINTER_SPRING,
                          opacity: COLOR_TRANSITION,
                          backgroundColor: COLOR_TRANSITION,
                          borderColor: COLOR_TRANSITION,
                          color: COLOR_TRANSITION,
                          boxShadow: COLOR_TRANSITION,
                        }}
                        className="flex h-12 sm:h-15 w-full items-center justify-center rounded-xl border-2 font-mono text-base sm:text-lg md:text-xl font-bold will-change-transform select-none"
                      >
                        {val}
                      </motion.div>
                      <span
                        className={`mt-1.5 font-mono text-[10px] sm:text-[11px] transition-colors duration-300 ${
                          isL || isR || isMid
                            ? "font-bold text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        [{idx}]
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Animated Floating Pointer Pills Track — GPU-composited translateX */}
              <div className="relative mt-3 h-12 select-none">
                {/* L / Low Pointer */}
                <motion.div
                  initial={false}
                  animate={{
                    x: `${currentStep.l * 100}%`,
                    y: 0,
                  }}
                  transition={POINTER_SPRING}
                  style={{
                    width: `${slotWidthPct}%`,
                    zIndex: isCoincident ? 10 : 20,
                  }}
                  className="absolute top-0 left-0 flex flex-col items-center will-change-transform pointer-events-none"
                >
                  <motion.div
                    initial={false}
                    animate={{
                      backgroundColor: currentStep.found ? "#34d399" : "#818cf8",
                    }}
                    transition={COLOR_TRANSITION}
                    className="size-2.5 rotate-45 mb-[-4px]"
                  />
                  <motion.div
                    initial={false}
                    animate={{
                      backgroundColor: currentStep.found
                        ? "rgba(16, 185, 129, 0.24)"
                        : "rgba(99, 102, 241, 0.24)",
                      borderColor: currentStep.found
                        ? "rgba(52, 211, 153, 0.75)"
                        : "rgba(129, 140, 248, 0.65)",
                      color: currentStep.found ? "#6ee7b7" : "#a5b4fc",
                    }}
                    transition={COLOR_TRANSITION}
                    className="flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold shadow-md backdrop-blur-md whitespace-nowrap"
                  >
                    <span>
                      {algoKey === "binary-search"
                        ? `LOW:${currentStep.l}`
                        : `L:${currentStep.l} (${array[currentStep.l]})`}
                    </span>
                  </motion.div>
                </motion.div>

                {/* Mid Pointer (for Binary Search) */}
                <AnimatePresence>
                  {currentStep.mid !== undefined && (
                    <motion.div
                      key="bottom-mid-pointer"
                      initial={{ opacity: 0, scale: 0.85, x: `${currentStep.mid * 100}%` }}
                      animate={{ opacity: 1, scale: 1, x: `${currentStep.mid * 100}%` }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      transition={POINTER_SPRING}
                      style={{
                        width: `${slotWidthPct}%`,
                        zIndex: 30,
                      }}
                      className="absolute top-0 left-0 flex flex-col items-center will-change-transform pointer-events-none"
                    >
                      <motion.div
                        animate={{
                          backgroundColor: currentStep.found ? "#34d399" : "#fbbf24",
                        }}
                        transition={COLOR_TRANSITION}
                        className="size-2.5 rotate-45 mb-[-4px]"
                      />
                      <motion.div
                        animate={{
                          backgroundColor: currentStep.found
                            ? "rgba(16, 185, 129, 0.28)"
                            : "rgba(245, 158, 11, 0.26)",
                          borderColor: currentStep.found
                            ? "rgba(52, 211, 153, 0.8)"
                            : "rgba(251, 191, 36, 0.75)",
                          color: currentStep.found ? "#6ee7b7" : "#fde68a",
                        }}
                        transition={COLOR_TRANSITION}
                        className="flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold shadow-md backdrop-blur-md whitespace-nowrap"
                      >
                        <span>
                          MID:{currentStep.mid} ({array[currentStep.mid]})
                        </span>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* R / High Pointer */}
                <motion.div
                  initial={false}
                  animate={{
                    x: `${currentStep.r * 100}%`,
                    y: isCoincident ? 20 : 0,
                  }}
                  transition={POINTER_SPRING}
                  style={{
                    width: `${slotWidthPct}%`,
                    zIndex: isCoincident ? 20 : 10,
                  }}
                  className="absolute top-0 left-0 flex flex-col items-center will-change-transform pointer-events-none"
                >
                  <motion.div
                    initial={false}
                    animate={{
                      backgroundColor: currentStep.found ? "#34d399" : "#c084fc",
                    }}
                    transition={COLOR_TRANSITION}
                    className="size-2.5 rotate-45 mb-[-4px]"
                  />
                  <motion.div
                    initial={false}
                    animate={{
                      backgroundColor: currentStep.found
                        ? "rgba(16, 185, 129, 0.24)"
                        : "rgba(168, 85, 247, 0.24)",
                      borderColor: currentStep.found
                        ? "rgba(52, 211, 153, 0.75)"
                        : "rgba(192, 132, 252, 0.65)",
                      color: currentStep.found ? "#6ee7b7" : "#d8b4fe",
                    }}
                    transition={COLOR_TRANSITION}
                    className="flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold shadow-md backdrop-blur-md whitespace-nowrap"
                  >
                    <span>
                      {algoKey === "binary-search"
                        ? `HIGH:${currentStep.r}`
                        : `R:${currentStep.r} (${array[currentStep.r]})`}
                    </span>
                  </motion.div>
                </motion.div>
              </div>
            </div>

            {/* Live Register Watch Strip (4 Telemetry Cards) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-5">
              <div className="rounded-xl border border-border/70 bg-card/80 p-3 font-mono">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {algoKey === "binary-search" ? "Low Pointer" : "Left Pointer (L)"}
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-sm sm:text-base font-black text-primary">
                    idx {currentStep.l}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    val: <strong className="text-foreground">{array[currentStep.l]}</strong>
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-border/70 bg-card/80 p-3 font-mono">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {algoKey === "binary-search" ? "High Pointer" : "Right Pointer (R)"}
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-sm sm:text-base font-black text-accent">
                    idx {currentStep.r}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    val: <strong className="text-foreground">{array[currentStep.r]}</strong>
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-border/70 bg-card/80 p-3 font-mono">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">
                  {currentAlgo.metricLabel}
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-sm sm:text-base font-black text-foreground">
                    {liveMetricValue}
                  </span>
                  {currentStep.maxVal !== undefined && (
                    <span className="text-[11px] font-bold text-complement">
                      best: {currentStep.maxVal}
                    </span>
                  )}
                </div>
              </div>

              <motion.div
                initial={false}
                animate={{
                  backgroundColor: currentStep.found
                    ? "rgba(16, 185, 129, 0.15)"
                    : "rgba(99, 102, 241, 0.10)",
                  borderColor: currentStep.found
                    ? "rgba(16, 185, 129, 0.5)"
                    : "rgba(99, 102, 241, 0.3)",
                }}
                transition={COLOR_TRANSITION}
                className="rounded-xl border p-3 font-mono"
              >
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Invariant State
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  {currentStep.found ? (
                    <>
                      <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                      <span className="text-xs sm:text-sm font-black text-emerald-400 truncate">
                        Optimal Locked
                      </span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-3.5 text-primary shrink-0 animate-spin" />
                      <span className="text-xs sm:text-sm font-bold text-primary truncate">
                        Line {currentStep.codeLine} Active
                      </span>
                    </>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Step Decision & Invariant Callout Banner */}
            <motion.div
              initial={false}
              animate={{
                backgroundColor: currentStep.found
                  ? "rgba(16, 185, 129, 0.10)"
                  : "rgba(15, 23, 42, 0.75)",
                borderColor: currentStep.found
                  ? "rgba(16, 185, 129, 0.5)"
                  : "rgba(100, 116, 139, 0.35)",
              }}
              transition={COLOR_TRANSITION}
              className="rounded-2xl border p-4"
            >
              <div className="flex items-start gap-3">
                <motion.div
                  initial={false}
                  animate={{
                    backgroundColor: currentStep.found
                      ? "#10b981"
                      : "rgba(99, 102, 241, 0.2)",
                    color: currentStep.found ? "#020617" : "#818cf8",
                  }}
                  transition={COLOR_TRANSITION}
                  className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-black border border-primary/30"
                >
                  {stepIdx + 1}
                </motion.div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`font-mono text-xs sm:text-sm font-bold transition-colors duration-300 ${
                      currentStep.found ? "text-emerald-300" : "text-foreground"
                    }`}
                  >
                    {currentStep.action}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground font-sans">
                    <strong className="text-foreground/90 font-mono">Why it works:</strong>{" "}
                    {currentStep.invariantNote}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* RIGHT STAGE: Synchronized C++ Code & Interactive Frame Timeline */}
          <div className="p-5 sm:p-7 md:p-8 flex flex-col justify-between bg-background/65">
            {/* Synchronized C++ Code Frame */}
            <div>
              <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-3">
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-foreground">
                  <Code2 className="size-4 text-primary" />
                  <span>solution.cpp</span>
                  <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    C++20
                  </span>
                </div>
                <span className="rounded-md border border-primary/40 bg-primary/15 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                  Line {currentStep.codeLine} Executing
                </span>
              </div>

              {/* Code Lines with 60fps Gliding Highlight Bar */}
              <div className="rounded-2xl border border-border/80 bg-card/95 p-3 font-mono text-xs space-y-1 shadow-inner">
                {currentAlgo.code.map((c) => {
                  const isActive = c.line === currentStep.codeLine;
                  return (
                    <div
                      key={c.line}
                      className={`relative flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg transition-colors duration-300 ${
                        isActive
                          ? "text-foreground font-bold"
                          : "text-muted-foreground/80 hover:bg-secondary/30"
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId={`active-code-line-${algoKey}`}
                          transition={POINTER_SPRING}
                          className={`absolute inset-0 rounded-lg border-l-4 -z-0 ${
                            currentStep.found
                              ? "bg-emerald-500/20 border-emerald-400"
                              : "bg-primary/20 border-primary"
                          }`}
                        />
                      )}
                      <div className="relative z-10 flex items-center gap-3 min-w-0">
                        <span
                          className={`w-4 text-right text-[10px] select-none transition-colors duration-300 ${
                            isActive ? "text-primary font-black" : "opacity-40"
                          }`}
                        >
                          {c.line}
                        </span>
                        <span className="truncate">{c.text}</span>
                      </div>

                      {isActive && (
                        <motion.span
                          initial={{ opacity: 0, x: 6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.25 }}
                          className={`relative z-10 hidden sm:inline-flex shrink-0 items-center gap-1 rounded bg-background/90 border px-2 py-0.5 text-[10px] font-mono font-bold ${
                            currentStep.found
                              ? "border-emerald-400/50 text-emerald-300"
                              : "border-primary/40 text-primary"
                          }`}
                        >
                          <Zap className="size-2.5" />
                          <span>{currentStep.inlineEval}</span>
                        </motion.span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Interactive Step-by-Step Trace Log (Click any frame to jump) */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2.5">
                <span className="font-mono text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Terminal className="size-3.5 text-primary" />
                  <span>Execution Frame Timeline (Click to Scrub)</span>
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  Frame {stepIdx + 1} of {steps.length}
                </span>
              </div>

              <div className="space-y-1.5">
                {steps.map((stepItem, idx) => {
                  const isCurrent = idx === stepIdx;
                  const isPast = idx < stepIdx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setIsPlaying(false);
                        setStepIdx(idx);
                      }}
                      className={`relative w-full text-left flex items-center justify-between gap-2.5 rounded-xl border px-3 py-2 font-mono text-xs transition-colors duration-300 ${
                        isCurrent
                          ? stepItem.found
                            ? "border-emerald-500/60 text-emerald-300 font-bold"
                            : "border-primary/60 text-foreground font-bold"
                          : isPast
                            ? "border-border/50 bg-secondary/35 text-muted-foreground hover:border-border"
                            : "border-border/40 bg-card/40 text-muted-foreground/70 hover:border-border"
                      }`}
                    >
                      {isCurrent && (
                        <motion.div
                          layoutId={`active-step-row-${algoKey}`}
                          transition={POINTER_SPRING}
                          className={`absolute inset-0 rounded-xl -z-0 ${
                            stepItem.found ? "bg-emerald-500/15" : "bg-primary/15"
                          }`}
                        />
                      )}
                      <div className="relative z-10 flex items-center gap-2.5 min-w-0">
                        <span
                          className={`flex size-5 shrink-0 items-center justify-center rounded-md text-[10px] font-black transition-colors duration-300 ${
                            isCurrent
                              ? stepItem.found
                                ? "bg-emerald-500 text-slate-950"
                                : "bg-primary text-primary-foreground"
                              : isPast
                                ? "bg-secondary text-foreground"
                                : "bg-secondary/50 text-muted-foreground"
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <span className="truncate">{stepItem.inlineEval}</span>
                      </div>

                      <span className="relative z-10 shrink-0 text-[10px] opacity-75">
                        L:{stepItem.l} R:{stepItem.r}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Transport Controls & Scrubber Bar */}
            <div className="mt-6 pt-4 border-t border-border/60 flex flex-wrap items-center justify-between gap-3">
              {/* Transport Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    setStepIdx((prev) => (prev > 0 ? prev - 1 : steps.length - 1));
                  }}
                  className="size-9 flex items-center justify-center rounded-xl border border-border/70 bg-secondary/60 text-foreground hover:bg-secondary active:scale-95 transition-all"
                  title="Previous Step"
                >
                  <ChevronLeft className="size-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsPlaying((p) => !p)}
                  className="h-9 px-4 flex items-center justify-center gap-1.5 rounded-xl border border-primary/50 bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all font-mono text-xs font-bold shadow-md shadow-primary/20"
                  title={isPlaying ? "Pause Animation" : "Play Animation"}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="size-3.5" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="size-3.5" />
                      <span>Play</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    setStepIdx((prev) => (prev < steps.length - 1 ? prev + 1 : 0));
                  }}
                  className="size-9 flex items-center justify-center rounded-xl border border-border/70 bg-secondary/60 text-foreground hover:bg-secondary active:scale-95 transition-all"
                  title="Next Step"
                >
                  <ChevronRight className="size-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStepIdx(0);
                    setIsPlaying(false);
                  }}
                  className="size-9 flex items-center justify-center rounded-xl border border-border/70 bg-secondary/60 text-foreground hover:bg-secondary active:scale-95 transition-all"
                  title="Reset to Step 1"
                >
                  <RotateCcw className="size-3.5" />
                </button>
              </div>

              {/* Step Progress Dots */}
              <div className="flex items-center gap-1.5">
                {steps.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setIsPlaying(false);
                      setStepIdx(idx);
                    }}
                    aria-label={`Jump to step ${idx + 1}`}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      idx === stepIdx
                        ? "w-7 bg-primary"
                        : idx < stepIdx
                          ? "w-2.5 bg-primary/45"
                          : "w-2.5 bg-secondary hover:bg-border"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
