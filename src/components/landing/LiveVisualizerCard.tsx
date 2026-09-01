import { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Sparkles,
  ArrowUp,
  Code2,
  Sliders,
  Terminal,
  Zap,
  Gauge,
} from "lucide-react";

type AlgorithmType = "two-pointers" | "binary-search" | "sliding-window";

interface StepData {
  l: number;
  r: number;
  valL?: number;
  valR?: number;
  mid?: number;
  valMid?: number;
  sum?: number;
  windowSum?: number;
  action: string;
  codeLine: number;
  found: boolean;
  highlightedIndices?: number[];
}

interface AlgorithmConfig {
  id: AlgorithmType;
  title: string;
  subtitle: string;
  badge: string;
  array: number[];
  targetLabel: string;
  code: { line: number; text: string }[];
  steps: StepData[];
}

const ALGORITHMS: Record<AlgorithmType, AlgorithmConfig> = {
  "two-pointers": {
    id: "two-pointers",
    title: "Two Pointers",
    subtitle: "Two Sum II (Sorted Array)",
    badge: "O(n) Linear",
    array: [1, 4, 6, 8, 11, 15],
    targetLabel: "Target = 14",
    code: [
      { line: 1, text: "int l = 0, r = n - 1;" },
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
        action: "1 + 15 = 16 > 14 → Sum too large, decrement R pointer (←)",
        codeLine: 6,
        found: false,
      },
      {
        l: 0,
        r: 4,
        valL: 1,
        valR: 11,
        sum: 12,
        action: "1 + 11 = 12 < 14 → Sum too small, increment L pointer (→)",
        codeLine: 5,
        found: false,
      },
      {
        l: 1,
        r: 4,
        valL: 4,
        valR: 11,
        sum: 15,
        action: "4 + 11 = 15 > 14 → Sum too large, decrement R pointer (←)",
        codeLine: 6,
        found: false,
      },
      {
        l: 1,
        r: 3,
        valL: 4,
        valR: 8,
        sum: 12,
        action: "4 + 8 = 12 < 14 → Sum too small, increment L pointer (→)",
        codeLine: 5,
        found: false,
      },
      {
        l: 2,
        r: 3,
        valL: 6,
        valR: 8,
        sum: 14,
        action: "6 + 8 = 14 == 14 → 🎯 Match Found! Return indices [2, 3]",
        codeLine: 4,
        found: true,
      },
    ],
  },
  "binary-search": {
    id: "binary-search",
    title: "Binary Search",
    subtitle: "Search in Sorted Range",
    badge: "O(log n) Logarithmic",
    array: [2, 5, 8, 12, 16, 23, 38, 56],
    targetLabel: "Target = 23",
    code: [
      { line: 1, text: "int low = 0, high = n - 1;" },
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
        valMid: 12,
        action: "mid = 3, nums[3] = 12 < 23 → Discard left half, low = mid + 1",
        codeLine: 5,
        found: false,
        highlightedIndices: [0, 1, 2, 3],
      },
      {
        l: 4,
        r: 7,
        mid: 5,
        valMid: 23,
        action: "mid = 5, nums[5] = 23 == 23 → 🎯 Target matched at index 5!",
        codeLine: 4,
        found: true,
        highlightedIndices: [5],
      },
    ],
  },
  "sliding-window": {
    id: "sliding-window",
    title: "Sliding Window",
    subtitle: "Max Sum Subarray (k = 3)",
    badge: "O(n) Optimal Window",
    array: [2, 1, 5, 2, 8, 1, 4],
    targetLabel: "Window Size k = 3",
    code: [
      { line: 1, text: "int windowSum = initFirstK(k);" },
      { line: 2, text: "int maxSum = windowSum;" },
      { line: 3, text: "for (int r = k; r < n; r++) {" },
      { line: 4, text: "  windowSum += nums[r] - nums[r - k];" },
      { line: 5, text: "  maxSum = max(maxSum, windowSum);" },
      { line: 6, text: "}" },
    ],
    steps: [
      {
        l: 0,
        r: 2,
        windowSum: 8,
        action: "Initial window [2, 1, 5] → Sum = 8. Max = 8",
        codeLine: 1,
        found: false,
        highlightedIndices: [0, 1, 2],
      },
      {
        l: 1,
        r: 3,
        windowSum: 8,
        action: "Slide window [1, 5, 2] → 8 - 2 + 2 = 8. Max = 8",
        codeLine: 4,
        found: false,
        highlightedIndices: [1, 2, 3],
      },
      {
        l: 2,
        r: 4,
        windowSum: 15,
        action: "Slide window [5, 2, 8] → 8 - 1 + 8 = 15. 🎯 New Max = 15!",
        codeLine: 5,
        found: true,
        highlightedIndices: [2, 3, 4],
      },
      {
        l: 3,
        r: 5,
        windowSum: 11,
        action: "Slide window [2, 8, 1] → 15 - 5 + 1 = 11. Max remains 15",
        codeLine: 4,
        found: false,
        highlightedIndices: [3, 4, 5],
      },
      {
        l: 4,
        r: 6,
        windowSum: 13,
        action: "Slide window [8, 1, 4] → 11 - 2 + 4 = 13. Max = 15 Complete!",
        codeLine: 5,
        found: true,
        highlightedIndices: [4, 5, 6],
      },
    ],
  },
};

type PointerStyle = "modern-pill" | "neon-tag" | "minimal-caret";

export function LiveVisualizerCard() {
  const [algoKey, setAlgoKey] = useState<AlgorithmType>("two-pointers");
  const [stepIdx, setStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [showCode, setShowCode] = useState(true);
  const [pointerStyle, setPointerStyle] = useState<PointerStyle>("modern-pill");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentAlgo = ALGORITHMS[algoKey];
  const steps = currentAlgo.steps;
  const currentStep = steps[stepIdx] ?? steps[0]!;
  const array = currentAlgo.array;

  // Reset step index when algorithm switches
  const handleSelectAlgo = (key: AlgorithmType) => {
    setAlgoKey(key);
    setStepIdx(0);
    setIsPlaying(true);
  };

  useEffect(() => {
    if (isPlaying) {
      const delay = Math.max(800, Math.floor(2200 / playbackSpeed));
      timerRef.current = setInterval(() => {
        setStepIdx((prev) => {
          if (prev >= steps.length - 1) {
            return 0; // loop back
          }
          return prev + 1;
        });
      }, delay);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed, steps.length]);

  const getPointerPercent = (idx: number) => {
    return ((idx + 0.5) / array.length) * 100;
  };

  const isCoincident = currentStep.l === currentStep.r;

  return (
    <div className="relative mx-auto w-full max-w-lg">
      {/* Outer Laser Ambient Aura */}
      <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 via-accent/30 to-emerald-500/25 rounded-3xl blur-xl opacity-60 transition duration-700 pointer-events-none" />

      {/* Top Floating Live Badge */}
      <div className="absolute -top-3.5 left-4 z-20 flex items-center gap-2 rounded-full border border-primary/50 bg-card/95 px-3.5 py-1 text-[11px] font-mono font-bold uppercase tracking-wider text-primary shadow-lg shadow-primary/20 backdrop-blur-md">
        <span className="relative flex size-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
          <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
        </span>
        <span>Interactive Algorithm Engine</span>
      </div>

      {/* Main Glassmorphic Visualizer Container */}
      <div className="relative rounded-3xl border border-border/80 bg-card/90 p-5 sm:p-6 backdrop-blur-2xl shadow-2xl transition-all duration-300">
        {/* Top Algorithm Selector Tabs */}
        <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3.5 mb-4 pt-1">
          <div className="flex flex-wrap items-center gap-1.5" role="tablist">
            {(Object.keys(ALGORITHMS) as AlgorithmType[]).map((key) => {
              const item = ALGORITHMS[key];
              const isSelected = key === algoKey;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSelectAlgo(key)}
                  className={`rounded-xl px-2.5 py-1 font-mono text-xs transition-all duration-200 border ${
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground font-bold shadow-md shadow-primary/25 scale-[1.02]"
                      : "border-border/60 bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                  }`}
                >
                  {item.title}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowCode((v) => !v)}
              className={`hidden sm:flex items-center gap-1 rounded-lg border px-2 py-1 font-mono text-[10px] transition-all ${
                showCode
                  ? "border-primary/50 bg-primary/15 text-primary font-bold"
                  : "border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground"
              }`}
              title="Toggle Live Code Invariant Panel"
            >
              <Code2 className="size-3" />
              <span>Code</span>
            </button>

            {/* Speed Selector */}
            <button
              type="button"
              onClick={() => {
                const speeds = [1, 1.5, 2, 0.75];
                const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
                setPlaybackSpeed(speeds[nextIdx] ?? 1);
              }}
              className="flex items-center gap-1 rounded-lg border border-border/60 bg-secondary/60 px-2 py-1 font-mono text-[10px] text-foreground font-semibold hover:border-primary/40 transition-all"
              title="Toggle Playback Speed"
            >
              <Gauge className="size-3 text-primary" />
              <span>{playbackSpeed}x</span>
            </button>
          </div>
        </div>

        {/* Algorithm Header & Invariant Tag */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
              <span>{currentAlgo.subtitle}</span>
            </h3>
            <span className="font-mono text-xs text-muted-foreground">{currentAlgo.targetLabel}</span>
          </div>

          <span className="rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-primary">
            {currentAlgo.badge}
          </span>
        </div>

        {/* Array Visualization Grid */}
        <div className="my-5">
          {/* Top Label Indicators */}
          <div
            className="grid gap-1.5 sm:gap-2 mb-2"
            style={{ gridTemplateColumns: `repeat(${array.length}, minmax(0, 1fr))` }}
          >
            {array.map((_, idx) => {
              const isL = idx === currentStep.l;
              const isR = idx === currentStep.r;
              const isMid = idx === currentStep.mid;
              return (
                <div key={idx} className="flex justify-center h-4">
                  {isMid ? (
                    <span className="font-mono text-[9px] font-bold text-amber-400 animate-pulse">
                      MID
                    </span>
                  ) : isL && isR ? (
                    <span className="font-mono text-[9px] font-bold text-success animate-pulse">
                      L &amp; R
                    </span>
                  ) : isL ? (
                    <span className="font-mono text-[9px] font-bold text-primary animate-pulse">
                      {algoKey === "binary-search" ? "LOW" : "L"}
                    </span>
                  ) : isR ? (
                    <span className="font-mono text-[9px] font-bold text-accent animate-pulse">
                      {algoKey === "binary-search" ? "HIGH" : "R"}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* Array Element Boxes */}
          <div
            className="grid gap-1.5 sm:gap-2"
            style={{ gridTemplateColumns: `repeat(${array.length}, minmax(0, 1fr))` }}
          >
            {array.map((val, idx) => {
              const isL = idx === currentStep.l;
              const isR = idx === currentStep.r;
              const isMid = idx === currentStep.mid;
              const isHighlighted = currentStep.highlightedIndices?.includes(idx);
              const isMatch = currentStep.found && (isL || isR || isMid || isHighlighted);

              let cellStyle = "border-border/70 bg-secondary/40 text-foreground";
              if (isMatch) {
                cellStyle =
                  "border-emerald-500 bg-emerald-500/20 text-emerald-400 font-extrabold ring-2 ring-emerald-500/50 scale-105 shadow-md shadow-emerald-500/20";
              } else if (isMid) {
                cellStyle =
                  "border-amber-500 bg-amber-500/20 text-amber-300 font-extrabold scale-105 shadow-md shadow-amber-500/20";
              } else if (isL) {
                cellStyle =
                  "border-primary bg-primary/20 text-primary font-bold scale-105 shadow-md shadow-primary/20";
              } else if (isR) {
                cellStyle =
                  "border-accent bg-accent/20 text-accent font-bold scale-105 shadow-md shadow-accent/20";
              } else if (isHighlighted) {
                cellStyle = "border-primary/40 bg-primary/10 text-foreground font-semibold";
              }

              return (
                <div key={idx} className="flex flex-col items-center">
                  <div
                    className={`flex size-10 sm:size-11 items-center justify-center rounded-xl border-2 font-mono text-sm sm:text-base font-bold transition-all duration-300 shadow-xs ${cellStyle}`}
                  >
                    {val}
                  </div>
                  <span className="mt-1 font-mono text-[9px] sm:text-[10px] text-muted-foreground">
                    [{idx}]
                  </span>
                </div>
              );
            })}
          </div>

          {/* Pointer Visual Glyphs */}
          <div className="relative mt-2.5 h-10">
            {/* L / Low Pointer */}
            {currentStep.l !== undefined && (
              <div
                className="absolute top-0 flex flex-col items-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none"
                style={{
                  left: `${getPointerPercent(currentStep.l)}%`,
                  transform: "translateX(-50%)",
                  zIndex: isCoincident ? 10 : 20,
                }}
              >
                <div className="flex flex-col items-center">
                  <div className="size-2 rotate-45 bg-primary/80 mb-[-3px] shadow-xs" />
                  <div className="flex items-center gap-1 rounded-full border border-primary/50 bg-primary/25 px-2 py-0.2 font-mono text-[9px] font-bold text-primary shadow-xs backdrop-blur-md">
                    <span>{algoKey === "binary-search" ? "L" : `L:${currentStep.l}`}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Mid Pointer (for Binary Search) */}
            {currentStep.mid !== undefined && (
              <div
                className="absolute top-0 flex flex-col items-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none"
                style={{
                  left: `${getPointerPercent(currentStep.mid)}%`,
                  transform: "translateX(-50%)",
                  zIndex: 30,
                }}
              >
                <div className="flex flex-col items-center">
                  <div className="size-2 rotate-45 bg-amber-400 mb-[-3px] shadow-xs" />
                  <div className="flex items-center gap-1 rounded-full border border-amber-400/60 bg-amber-400/25 px-2 py-0.2 font-mono text-[9px] font-bold text-amber-300 shadow-xs backdrop-blur-md">
                    <span>MID:{currentStep.mid}</span>
                  </div>
                </div>
              </div>
            )}

            {/* R / High Pointer */}
            {currentStep.r !== undefined && (
              <div
                className="absolute top-0 flex flex-col items-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none"
                style={{
                  left: `${getPointerPercent(currentStep.r)}%`,
                  transform: isCoincident ? "translateX(-50%) translateY(16px)" : "translateX(-50%)",
                  zIndex: isCoincident ? 20 : 10,
                }}
              >
                <div className="flex flex-col items-center">
                  <div className="size-2 rotate-45 bg-accent/80 mb-[-3px] shadow-xs" />
                  <div className="flex items-center gap-1 rounded-full border border-accent/50 bg-accent/25 px-2 py-0.2 font-mono text-[9px] font-bold text-accent shadow-xs backdrop-blur-md">
                    <span>{algoKey === "binary-search" ? "H" : `R:${currentStep.r}`}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Synchronized Code Viewer (Optional/Collapsible) */}
        {showCode && (
          <div className="mb-4 rounded-xl border border-border/70 bg-background/80 p-2.5 sm:p-3 font-mono text-[11px] backdrop-blur-md">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground border-b border-border/40 pb-1.5 mb-2">
              <span className="font-bold text-primary flex items-center gap-1">
                <Terminal className="size-3" />
                <span>Active Invariant Frame</span>
              </span>
              <span>Line {currentStep.codeLine} active</span>
            </div>
            <div className="space-y-0.5 font-mono">
              {currentAlgo.code.map((c) => {
                const isActive = c.line === currentStep.codeLine;
                return (
                  <div
                    key={c.line}
                    className={`flex items-center px-2 py-0.5 rounded transition-all duration-200 ${
                      isActive
                        ? "bg-primary/20 text-primary font-bold border-l-2 border-primary"
                        : "text-muted-foreground/80 opacity-80"
                    }`}
                  >
                    <span className="w-5 text-[10px] opacity-40 select-none">{c.line}</span>
                    <span className="truncate">{c.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Live Step Explanation Card */}
        <div className="rounded-xl border border-border/80 bg-background/70 p-3 text-center min-h-[54px] flex items-center justify-center shadow-xs">
          <p
            className={`font-mono text-xs transition-all duration-300 ${
              currentStep.found ? "text-emerald-400 font-bold" : "text-foreground"
            }`}
          >
            {currentStep.found ? (
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                <span>{currentStep.action}</span>
              </span>
            ) : (
              currentStep.action
            )}
          </p>
        </div>

        {/* Playback Controls & Progress Scrubber */}
        <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
          <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
            <span>Frame</span>
            <span className="font-bold text-foreground">
              {stepIdx + 1} / {steps.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setStepIdx((prev) => (prev > 0 ? prev - 1 : steps.length - 1));
              }}
              className="size-8 flex items-center justify-center rounded-lg border border-border/70 bg-secondary/50 text-foreground hover:bg-secondary active:scale-95 transition-all"
              title="Previous Frame"
            >
              <ChevronLeft className="size-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              className="size-8 flex items-center justify-center rounded-lg border border-primary/50 bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all font-bold shadow-md shadow-primary/20"
              title={isPlaying ? "Pause Playback" : "Play Animation"}
            >
              {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setStepIdx((prev) => (prev < steps.length - 1 ? prev + 1 : 0));
              }}
              className="size-8 flex items-center justify-center rounded-lg border border-border/70 bg-secondary/50 text-foreground hover:bg-secondary active:scale-95 transition-all"
              title="Next Frame"
            >
              <ChevronRight className="size-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                setStepIdx(0);
                setIsPlaying(false);
              }}
              className="size-8 flex items-center justify-center rounded-lg border border-border/70 bg-secondary/50 text-foreground hover:bg-secondary active:scale-95 transition-all ml-1"
              title="Reset Animation"
            >
              <RotateCcw className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
