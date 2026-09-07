import React, { useMemo, useState, useEffect, useRef } from "react";
import type { Val, Sightline, HistogramSpan, WaterTrapped } from "./VisualizerTypes";
import { safeArray } from "./VisualizerTypes";
import {
  TrendingDown,
  TrendingUp,
  Layers,
  Eye,
  ArrowUp,
  ChevronUp,
  Zap,
  Play,
  RotateCcw,
  Crosshair,
  Maximize2,
  Droplets,
  CheckCircle2,
  HelpCircle,
  BarChart3,
  ShieldAlert,
} from "lucide-react";

interface MonotonicStackVisualizerProps {
  array: Val[];
  stack: Val[];
  current?: Val | null;
  left?: number | null;
  right?: number | null;
  stackInvariant?: "increasing" | "decreasing" | null;
  sightlines?: Sightline[] | null;
  histogramSpan?: HistogramSpan | null;
  waterTrapped?: WaterTrapped | null;
  resultArray?: (number | string | null)[] | null;
  desc?: string;
  variables?: Record<string, any> | null;
}

interface MonotonicStep {
  currentIdx: number | null;
  stack: number[]; // stack of indices
  result: (number | null)[];
  sightlines: Sightline[];
  histogramSpan?: HistogramSpan | null;
  waterTrapped?: WaterTrapped | null;
  desc: string;
}

export function MonotonicStackVisualizer({
  array: rawArray,
  stack: rawStack,
  current: propCurrent,
  left: propLeft,
  right: propRight,
  stackInvariant: propStackInvariant = "decreasing",
  sightlines: propSightlines,
  histogramSpan: propHistogramSpan,
  waterTrapped: propWaterTrapped,
  resultArray: propResultArray,
  desc: propDesc = "",
  variables,
}: MonotonicStackVisualizerProps) {
  // Toggle for visual sightline rays
  const [showRays, setShowRays] = useState<boolean>(true);
  const [interactiveHoverIdx, setInteractiveHoverIdx] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const barRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [barCenters, setBarCenters] = useState<number[]>([]);
  const [barWidths, setBarWidths] = useState<number[]>([]);
  const [scrollWidth, setScrollWidth] = useState<number>(0);

  // Invariant mode: decreasing (Next Greater) vs increasing (Next Smaller)
  const [stackInvariant, setStackInvariant] = useState<"increasing" | "decreasing">(
    propStackInvariant || "decreasing",
  );
  useEffect(() => {
    if (propStackInvariant) setStackInvariant(propStackInvariant);
  }, [propStackInvariant]);

  // Sandbox simulation state
  const [sandboxArray, setSandboxArray] = useState<number[] | null>(null);
  const [sandboxStepIdx, setSandboxStepIdx] = useState<number>(0);
  const [sandboxSteps, setSandboxSteps] = useState<MonotonicStep[]>([]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Active array: either sandbox array or prop array
  const array = useMemo(() => {
    if (sandboxArray !== null) return sandboxArray;
    const safe = safeArray(rawArray);
    if (safe.length === 0) return [73, 74, 75, 71, 69, 72, 76, 73];
    return safe.map(Number).filter((n) => !isNaN(n));
  }, [sandboxArray, rawArray]);

  // Active stack: either from sandbox step or from prop
  const stack = useMemo(() => {
    if (sandboxArray !== null && sandboxSteps.length > 0 && sandboxStepIdx < sandboxSteps.length) {
      return sandboxSteps[sandboxStepIdx]!.stack;
    }
    return safeArray(rawStack);
  }, [sandboxArray, sandboxSteps, sandboxStepIdx, rawStack]);

  // Current active index in the array
  const currentIdx = useMemo(() => {
    if (interactiveHoverIdx !== null) return interactiveHoverIdx;
    if (sandboxArray !== null && sandboxSteps.length > 0 && sandboxStepIdx < sandboxSteps.length) {
      return sandboxSteps[sandboxStepIdx]!.currentIdx;
    }
    if (propLeft !== null && propLeft !== undefined && propLeft >= 0 && propLeft < array.length) {
      return propLeft;
    }
    if (typeof propCurrent === "number" && propCurrent >= 0 && propCurrent < array.length) {
      return propCurrent;
    }
    return null;
  }, [interactiveHoverIdx, sandboxArray, sandboxSteps, sandboxStepIdx, propLeft, propCurrent, array.length]);

  // Histogram Span computation
  const activeHistogramSpan = useMemo<HistogramSpan | null>(() => {
    if (sandboxArray !== null && sandboxSteps.length > 0 && sandboxStepIdx < sandboxSteps.length) {
      return sandboxSteps[sandboxStepIdx]!.histogramSpan ?? null;
    }
    if (propHistogramSpan) return propHistogramSpan;
    if (variables?.area !== undefined || variables?.maxArea !== undefined || variables?.height !== undefined) {
      const h = Number(variables.height ?? 0);
      const w = Number(variables.width ?? 0);
      const a = Number(variables.area ?? h * w);
      const maxA = Number(variables.maxArea ?? a);
      const l = typeof propLeft === "number" ? propLeft : 0;
      const r = typeof propRight === "number" ? propRight : array.length;
      if (h > 0 && w > 0) {
        return {
          left: l,
          right: r,
          height: h,
          width: w,
          area: a,
          maxArea: maxA,
        };
      }
    }
    return null;
  }, [sandboxArray, sandboxSteps, sandboxStepIdx, propHistogramSpan, variables, propLeft, propRight, array.length]);

  // Trapping Rain Water state
  const activeWaterTrapped = useMemo<WaterTrapped | null>(() => {
    if (sandboxArray !== null && sandboxSteps.length > 0 && sandboxStepIdx < sandboxSteps.length) {
      return sandboxSteps[sandboxStepIdx]!.waterTrapped ?? null;
    }
    if (propWaterTrapped) return propWaterTrapped;
    if (variables?.water !== undefined || variables?.trapped !== undefined || variables?.totalWater !== undefined) {
      const total = Number(variables.totalWater ?? variables.water ?? variables.trapped ?? 0);
      const currentW = Number(variables.currentWater ?? variables.waterUnit ?? 0);
      const levels = Array.isArray(variables.waterLevels) ? variables.waterLevels : undefined;
      return {
        currentWater: currentW,
        totalWater: total,
        waterLevels: levels,
        leftMax: typeof variables.leftMax === "number" ? variables.leftMax : undefined,
        rightMax: typeof variables.rightMax === "number" ? variables.rightMax : undefined,
      };
    }
    return null;
  }, [sandboxArray, sandboxSteps, sandboxStepIdx, propWaterTrapped, variables]);

  // Result array for Target Tracking Table (Next Greater / Smaller array)
  const activeResultArray = useMemo<(number | string | null)[]>(() => {
    if (sandboxArray !== null && sandboxSteps.length > 0 && sandboxStepIdx < sandboxSteps.length) {
      return sandboxSteps[sandboxStepIdx]!.result;
    }
    if (propResultArray && Array.isArray(propResultArray)) {
      return propResultArray;
    }
    if (variables?.result && Array.isArray(variables.result)) {
      return variables.result;
    }
    if (variables?.ans && Array.isArray(variables.ans)) {
      return variables.ans;
    }
    return [];
  }, [sandboxArray, sandboxSteps, sandboxStepIdx, propResultArray, variables]);

  // Sightlines: either from sandbox step or prop
  const activeSightlines = useMemo(() => {
    if (!showRays) return [];
    if (interactiveHoverIdx !== null) {
      // Cast interactive radar rays for the hovered bar!
      const rays: Sightline[] = [];
      const myVal = array[interactiveHoverIdx]!;
      // Find Next Greater Element
      for (let j = interactiveHoverIdx + 1; j < array.length; j++) {
        if (array[j]! > myVal) {
          rays.push({ fromIdx: interactiveHoverIdx, toIdx: j, resolved: true, distance: j - interactiveHoverIdx });
          break;
        }
      }
      // Find Previous Greater Element
      for (let j = interactiveHoverIdx - 1; j >= 0; j--) {
        if (array[j]! > myVal) {
          rays.push({ fromIdx: interactiveHoverIdx, toIdx: j, resolved: true, distance: interactiveHoverIdx - j });
          break;
        }
      }
      return rays;
    }

    if (sandboxArray !== null && sandboxSteps.length > 0 && sandboxStepIdx < sandboxSteps.length) {
      return sandboxSteps[sandboxStepIdx]!.sightlines;
    }

    if (propSightlines && Array.isArray(propSightlines) && propSightlines.length > 0) {
      return propSightlines.map((s) => ({
        ...s,
        distance: s.distance ?? Math.abs(s.toIdx - s.fromIdx),
      }));
    }

    // Default dynamic sightline from currentIdx to stack top if applicable
    if (currentIdx !== null && stack.length > 0) {
      const topRaw = stack[stack.length - 1];
      const topIdx = typeof topRaw === "number" ? topRaw : Number(topRaw);
      if (!isNaN(topIdx) && topIdx >= 0 && topIdx < array.length && topIdx !== currentIdx) {
        const cond =
          stackInvariant === "decreasing"
            ? array[currentIdx]! > array[topIdx]!
            : array[currentIdx]! < array[topIdx]!;
        return [{ fromIdx: currentIdx, toIdx: topIdx, resolved: cond, distance: Math.abs(currentIdx - topIdx) }];
      }
    }

    return [];
  }, [showRays, interactiveHoverIdx, sandboxArray, sandboxSteps, sandboxStepIdx, propSightlines, currentIdx, stack, array, stackInvariant]);

  const desc = useMemo(() => {
    if (sandboxArray !== null && sandboxSteps.length > 0 && sandboxStepIdx < sandboxSteps.length) {
      return sandboxSteps[sandboxStepIdx]!.desc;
    }
    return propDesc;
  }, [sandboxArray, sandboxSteps, sandboxStepIdx, propDesc]);

  // Max value for scaling heights geometrically
  const maxVal = useMemo(() => {
    const numeric = array.map(Number).filter((n) => !isNaN(n));
    return numeric.length > 0 ? Math.max(...numeric, 1) : 100;
  }, [array]);

  // Update layout positions for SVG Sightlines & Spans
  useEffect(() => {
    const updatePositions = () => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      setScrollWidth(container.scrollWidth);

      const newCenters: number[] = [];
      const newWidths: number[] = [];
      barRefs.current.forEach((ref) => {
        if (!ref) {
          newCenters.push(0);
          newWidths.push(0);
        } else {
          newCenters.push(ref.offsetLeft + ref.offsetWidth / 2);
          newWidths.push(ref.offsetWidth);
        }
      });
      setBarCenters(newCenters);
      setBarWidths(newWidths);
    };

    updatePositions();
    const ro = new ResizeObserver(updatePositions);
    if (containerRef.current) ro.observe(containerRef.current);

    const rAF = requestAnimationFrame(updatePositions);
    const timer = setTimeout(() => {
      cancelAnimationFrame(rAF);
      updatePositions();
    }, 300);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(rAF);
      clearTimeout(timer);
    };
  }, [array, rawArray, showRays, activeHistogramSpan, activeWaterTrapped]);

  // Parse stack items into { idx, val }
  const stackItems = useMemo(() => {
    return stack.map((item) => {
      const num = Number(item);
      if (!isNaN(num) && num >= 0 && num < array.length) {
        return {
          idx: num,
          val: array[num]!,
          isIndex: true,
        };
      }
      return {
        idx: null,
        val: item,
        isIndex: false,
      };
    });
  }, [stack, array]);

  // Generate sandbox steps for any array input
  const runSandbox = (nums: number[], mode: "decreasing" | "increasing", demoType: "nge" | "temperatures" | "histogram" | "water" = "nge") => {
    const steps: MonotonicStep[] = [];
    const st: number[] = [];
    const res: (number | null)[] = new Array(nums.length).fill(null);

    if (demoType === "histogram") {
      let maxArea = 0;
      const extended = [...nums, 0];
      steps.push({
        currentIdx: null,
        stack: [],
        result: [...res],
        sightlines: [],
        desc: "Initialize monotonic increasing stack for Largest Rectangle in Histogram.",
      });

      extended.forEach((h, i) => {
        while (st.length > 0 && extended[st[st.length - 1]!]! >= h) {
          const poppedIdx = st.pop()!;
          const height = extended[poppedIdx]!;
          const leftBoundary = st.length > 0 ? st[st.length - 1]! : -1;
          const width = i - leftBoundary - 1;
          const area = height * width;
          maxArea = Math.max(maxArea, area);

          steps.push({
            currentIdx: i < nums.length ? i : null,
            stack: [...st],
            result: [...res],
            sightlines: leftBoundary >= 0 ? [{ fromIdx: i, toIdx: leftBoundary, resolved: true }] : [],
            histogramSpan: {
              left: leftBoundary,
              right: i,
              height,
              width,
              area,
              maxArea,
              poppedIndex: poppedIdx,
            },
            desc: `Popped bar idx ${poppedIdx} (height ${height}). Bounded between left idx ${leftBoundary} and right idx ${i} (width ${width}). Area = ${height} × ${width} = ${area} (Max: ${maxArea}).`,
          });
        }
        st.push(i);
        if (i < nums.length) {
          steps.push({
            currentIdx: i,
            stack: [...st],
            result: [...res],
            sightlines: [],
            desc: `Pushed bar idx ${i} (height ${h}) onto stack. Stack maintaining monotonic ascending bars.`,
          });
        }
      });

      steps.push({
        currentIdx: null,
        stack: [],
        result: [...res],
        sightlines: [],
        histogramSpan: {
          left: 0,
          right: nums.length,
          height: 0,
          width: 0,
          area: 0,
          maxArea,
        },
        desc: `Histogram analysis complete! Maximum rectangular area found = ${maxArea}.`,
      });

      setSandboxArray(nums);
      setSandboxSteps(steps);
      setSandboxStepIdx(0);
      setStackInvariant("increasing");
      return;
    }

    if (demoType === "water") {
      let totalWater = 0;
      const waterLevels = new Array(nums.length).fill(0);
      steps.push({
        currentIdx: null,
        stack: [],
        result: [...res],
        sightlines: [],
        desc: "Initialize Monotonic Stack for Trapping Rain Water computation.",
      });

      nums.forEach((currentHeight, i) => {
        steps.push({
          currentIdx: i,
          stack: [...st],
          result: [...res],
          sightlines: st.length > 0 ? [{ fromIdx: i, toIdx: st[st.length - 1]!, resolved: currentHeight > nums[st[st.length - 1]!]! }] : [],
          desc: `Inspect elevation at idx ${i} (height ${currentHeight}).`,
        });

        while (st.length > 0 && currentHeight > nums[st[st.length - 1]!]!) {
          const bottomIdx = st.pop()!;
          if (st.length === 0) break;
          const leftIdx = st[st.length - 1]!;
          const distance = i - leftIdx - 1;
          const boundedHeight = Math.min(nums[leftIdx]!, currentHeight) - nums[bottomIdx]!;
          if (boundedHeight > 0) {
            const trapped = distance * boundedHeight;
            totalWater += trapped;
            for (let k = leftIdx + 1; k < i; k++) {
              waterLevels[k] = Math.max(waterLevels[k] ?? 0, nums[bottomIdx]! + boundedHeight);
            }
            steps.push({
              currentIdx: i,
              stack: [...st],
              result: [...res],
              sightlines: [{ fromIdx: i, toIdx: leftIdx, resolved: true, distance }],
              waterTrapped: {
                currentWater: trapped,
                totalWater,
                waterLevels: [...waterLevels],
              },
              desc: `Trapped Water Reservoir bounded by left [${leftIdx}: ${nums[leftIdx]}] and right [${i}: ${currentHeight}] over trough [${bottomIdx}]: +${trapped} units. Total = ${totalWater}.`,
            });
          }
        }
        st.push(i);
        steps.push({
          currentIdx: i,
          stack: [...st],
          result: [...res],
          sightlines: [],
          waterTrapped: {
            currentWater: 0,
            totalWater,
            waterLevels: [...waterLevels],
          },
          desc: `Pushed elevation idx ${i} (${currentHeight}) to stack.`,
        });
      });

      setSandboxArray(nums);
      setSandboxSteps(steps);
      setSandboxStepIdx(0);
      setStackInvariant("decreasing");
      return;
    }

    // Standard Next Greater / Daily Temperatures
    steps.push({
      currentIdx: null,
      stack: [],
      result: [...res],
      sightlines: [],
      desc: `Initialize empty monotonic ${mode} stack.`,
    });

    nums.forEach((x, i) => {
      const topBefore = st.length > 0 ? st[st.length - 1]! : null;
      steps.push({
        currentIdx: i,
        stack: [...st],
        result: [...res],
        sightlines:
          topBefore !== null
            ? [
                {
                  fromIdx: i,
                  toIdx: topBefore,
                  resolved: mode === "decreasing" ? x > nums[topBefore]! : x < nums[topBefore]!,
                  distance: i - topBefore,
                },
              ]
            : [],
        desc: `Scan nums[${i}] = ${x}. Cast sightline ray towards stack top ${
          topBefore !== null ? `(idx ${topBefore}: ${nums[topBefore]})` : "(stack empty)"
        }.`,
      });

      while (st.length > 0) {
        const topIdx = st[st.length - 1]!;
        const topVal = nums[topIdx]!;
        const condition = mode === "decreasing" ? x > topVal : x < topVal;

        if (condition) {
          st.pop();
          const dist = i - topIdx;
          res[topIdx] = demoType === "temperatures" ? dist : x;
          steps.push({
            currentIdx: i,
            stack: [...st],
            result: [...res],
            sightlines: [{ fromIdx: i, toIdx: topIdx, resolved: true, distance: dist }],
            desc: `💥 Ray Hit! nums[${i}] (${x}) ${mode === "decreasing" ? ">" : "<"} nums[${topIdx}] (${topVal}). Popped idx ${topIdx}. Resolved Target[${topIdx}] = ${
              demoType === "temperatures" ? `${dist} days` : x
            }.`,
          });
        } else {
          steps.push({
            currentIdx: i,
            stack: [...st],
            result: [...res],
            sightlines: [{ fromIdx: i, toIdx: topIdx, resolved: false, distance: i - topIdx }],
            desc: `Invariant preserved: nums[${i}] (${x}) does not violate monotonic ${mode} ordering against idx ${topIdx} (${topVal}). Stop popping.`,
          });
          break;
        }
      }

      st.push(i);
      steps.push({
        currentIdx: i,
        stack: [...st],
        result: [...res],
        sightlines: [],
        desc: `Pushed index ${i} (${x}) onto stack. Stack now contains: [${st.map((k) => `idx ${k}:${nums[k]}`).join(", ")}].`,
      });
    });

    steps.push({
      currentIdx: null,
      stack: [...st],
      result: [...res],
      sightlines: [],
      desc: `Algorithm Complete! All elements scanned. Unresolved elements in stack have no next target element.`,
    });

    setSandboxArray(nums);
    setSandboxSteps(steps);
    setSandboxStepIdx(0);
    setStackInvariant(mode);
  };

  // Playback timer for sandbox steps
  useEffect(() => {
    if (!isPlaying || sandboxSteps.length === 0) return;
    const timer = setInterval(() => {
      setSandboxStepIdx((prev) => {
        if (prev < sandboxSteps.length - 1) return prev + 1;
        setIsPlaying(false);
        return prev;
      });
    }, 900);
    return () => clearInterval(timer);
  }, [isPlaying, sandboxSteps]);

  const loadExample = (type: "temperatures" | "nge" | "histogram" | "water") => {
    if (type === "temperatures") {
      runSandbox([73, 74, 75, 71, 69, 72, 76, 73], "decreasing", "temperatures");
    } else if (type === "nge") {
      runSandbox([4, 5, 2, 25, 7, 8], "decreasing", "nge");
    } else if (type === "histogram") {
      runSandbox([2, 1, 5, 6, 2, 3], "increasing", "histogram");
    } else {
      runSandbox([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1], "decreasing", "water");
    }
  };

  const handleReset = () => {
    setSandboxArray(null);
    setSandboxSteps([]);
    setSandboxStepIdx(0);
    setIsPlaying(false);
    setInteractiveHoverIdx(null);
  };

  return (
    <div className="flex flex-col gap-3 w-full h-full p-2 font-sans">
      {/* Top Banner: Monotonic Invariant & Ray Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2 rounded-xl bg-card border border-border/70 text-xs font-mono shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded-lg ${
                stackInvariant === "decreasing"
                  ? "bg-amber-500/15 text-amber-400"
                  : "bg-emerald-500/15 text-emerald-400"
              }`}
            >
              {stackInvariant === "decreasing" ? (
                <TrendingDown className="w-4 h-4" />
              ) : (
                <TrendingUp className="w-4 h-4" />
              )}
            </div>
            <span className="font-bold text-foreground uppercase tracking-wider">
              MONOTONIC {stackInvariant} STACK
            </span>
          </div>

          <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/50">
            {stackInvariant === "decreasing"
              ? "Descending: [Top < Below] (Next Greater Element / Temperatures)"
              : "Ascending: [Top > Below] (Next Smaller Element / Histogram Span)"}
          </span>
        </div>

        {/* Action Toggles & Stack Depth */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowRays((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-semibold transition-all ${
              showRays
                ? "bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-2xs ring-1 ring-amber-500/20"
                : "bg-muted/40 text-muted-foreground border-border/70 hover:opacity-100"
            }`}
            title="Toggle Visual Sightline Rays projecting between elements"
          >
            <Eye className={`w-3.5 h-3.5 ${showRays ? "text-amber-400" : "text-muted-foreground"}`} />
            <span>Sightline Rays: {showRays ? "ON" : "OFF"}</span>
          </button>

          <span className="text-border">|</span>
          <span className="text-[11px] text-muted-foreground font-mono">
            Stack Depth: <span className="font-bold text-foreground">{stack.length}</span>
          </span>
        </div>
      </div>

      {/* Preset Demo Sandbox Pickers */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-card/60 border border-border/70 text-xs font-mono">
        <div className="flex items-center gap-2">
          <Crosshair className="w-3.5 h-3.5 text-primary" />
          <span className="font-bold text-foreground text-[11px]">STACK PRESETS:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => loadExample("temperatures")}
            className="px-2 py-0.5 rounded border text-[10px] font-medium bg-background hover:bg-muted text-foreground transition-all"
          >
            Daily Temperatures (NGE)
          </button>
          <button
            type="button"
            onClick={() => loadExample("nge")}
            className="px-2 py-0.5 rounded border text-[10px] font-medium bg-background hover:bg-muted text-foreground transition-all"
          >
            Next Greater Array
          </button>
          <button
            type="button"
            onClick={() => loadExample("histogram")}
            className="px-2 py-0.5 rounded border text-[10px] font-medium bg-background hover:bg-muted text-foreground transition-all"
          >
            Histogram Invariant
          </button>
          <button
            type="button"
            onClick={() => loadExample("water")}
            className="px-2 py-0.5 rounded border text-[10px] font-medium bg-background hover:bg-muted text-foreground transition-all"
          >
            Trapping Rain Water
          </button>

          {sandboxArray !== null && (
            <>
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-medium bg-muted/60 text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>

              {sandboxSteps.length > 0 && (
                <div className="flex items-center gap-1 pl-1 border-l border-border/50">
                  <button
                    type="button"
                    onClick={() => setSandboxStepIdx((p) => Math.max(0, p - 1))}
                    disabled={sandboxStepIdx === 0}
                    className="px-1.5 py-0.5 rounded bg-muted/60 text-[10px] disabled:opacity-40"
                  >
                    ◀
                  </button>
                  <span className="text-[10px] text-muted-foreground">
                    {sandboxStepIdx + 1}/{sandboxSteps.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSandboxStepIdx((p) => Math.min(sandboxSteps.length - 1, p + 1))}
                    disabled={sandboxStepIdx >= sandboxSteps.length - 1}
                    className="px-1.5 py-0.5 rounded bg-muted/60 text-[10px] disabled:opacity-40"
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPlaying((p) => !p)}
                    className={`p-1 rounded ${isPlaying ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}
                  >
                    <Play className="w-3 h-3" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Geometric Histogram Span HUD if active */}
      {activeHistogramSpan && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-card/90 border border-amber-500/40 shadow-xs font-mono text-xs">
          <div className="flex items-center gap-2 text-amber-400 font-bold">
            <Maximize2 className="w-4 h-4 text-amber-400" />
            <span>HISTOGRAM RECTANGULAR SPAN:</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-2 py-0.5 rounded bg-background border border-border">
              Height: <strong className="text-amber-300">{activeHistogramSpan.height}</strong>
            </span>
            <span className="px-2 py-0.5 rounded bg-background border border-border">
              Width: <strong className="text-amber-300">{activeHistogramSpan.width}</strong>
            </span>
            <span className="px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-extrabold">
              Area = {activeHistogramSpan.width} × {activeHistogramSpan.height} ={" "}
              <strong>{activeHistogramSpan.area}</strong>
            </span>
            {activeHistogramSpan.maxArea !== undefined && (
              <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-extrabold">
                Max Area: <strong>{activeHistogramSpan.maxArea}</strong>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Trapping Rain Water HUD if active */}
      {activeWaterTrapped && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-card/90 border border-sky-500/40 shadow-xs font-mono text-xs">
          <div className="flex items-center gap-2 text-sky-400 font-bold">
            <Droplets className="w-4 h-4 text-sky-400 animate-pulse" />
            <span>TRAPPED RAIN WATER RESERVOIR:</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {activeWaterTrapped.currentWater > 0 && (
              <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold">
                Trough Water: +{activeWaterTrapped.currentWater} units
              </span>
            )}
            <span className="px-3 py-0.5 rounded bg-sky-600/20 text-sky-200 border border-sky-500/50 font-extrabold text-sm shadow-inner">
              Total Water: <strong>{activeWaterTrapped.totalWater} units</strong>
            </span>
          </div>
        </div>
      )}

      {/* Description Step Banner */}
      {desc && (
        <div className="px-3.5 py-1.5 rounded-lg bg-muted/40 border border-border/50 text-xs font-mono text-muted-foreground flex items-center justify-between">
          <span className="truncate">{desc}</span>
          <span className="text-[10px] text-amber-400/90 shrink-0 ml-2 font-semibold">
            (Tip: Hover any bar to cast dynamic Sightline Radar)
          </span>
        </div>
      )}

      {/* Main Dual View: Array Bars with Sightlines (Left) + Monotonic Stack Cylinder (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 flex-1 min-h-[350px]">
        {/* Left Pane: Array Elements as Vertical Bars with Geometric Sightline Rays */}
        <div className="lg:col-span-8 flex flex-col rounded-xl bg-card/60 border border-border/70 p-3 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold text-muted-foreground flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-primary" />
              VERTICAL ELEVATION BARS & RAYCAST SIGHTLINES
            </span>
            {currentIdx !== null && (
              <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                Observing Bar: idx {currentIdx} (val: {array[currentIdx]})
              </span>
            )}
          </div>

          {/* Bar Chart Container with Geometric Heights and SVG Sightline Rays */}
          <div
            ref={containerRef}
            className="flex-1 flex items-end justify-between gap-2.5 px-4 pt-14 pb-4 overflow-x-auto min-h-[230px] bg-muted/10 rounded-xl border border-border/40 relative"
          >
            {/* SVG Overlay for Dynamic Sightline Rays & Histogram Span Box */}
            {showRays && (
              <div
                className="absolute top-0 left-0 bottom-0 pointer-events-none z-20"
                style={{ width: scrollWidth ? `${scrollWidth}px` : "100%" }}
              >
                <svg className="w-full h-full">
                  <defs>
                    <marker
                      id="ray-head-resolved"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto"
                    >
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" />
                    </marker>
                    <marker
                      id="ray-head-green"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto"
                    >
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
                    </marker>
                    <filter id="ray-glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="2" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Render Histogram Rectangular Span Box if active */}
                  {activeHistogramSpan && activeHistogramSpan.height > 0 && (
                    (() => {
                      const lIdx = Math.max(0, activeHistogramSpan.left + 1);
                      const rIdx = Math.min(array.length - 1, activeHistogramSpan.right - 1);
                      const startX = (barCenters[lIdx] ?? 0) - (barWidths[lIdx] ?? 40) / 2;
                      const endX = (barCenters[rIdx] ?? 0) + (barWidths[rIdx] ?? 40) / 2;
                      const spanWidth = Math.max(20, endX - startX);
                      const hPct = maxVal > 0 ? (activeHistogramSpan.height / maxVal) * 70 : 40;
                      const yPos = `${Math.max(10, 88 - hPct)}%`;

                      return (
                        <g>
                          <rect
                            x={startX}
                            y={yPos}
                            width={spanWidth}
                            height={`${hPct}%`}
                            fill="rgba(245, 158, 11, 0.18)"
                            stroke="#f59e0b"
                            strokeWidth="2"
                            strokeDasharray="4 2"
                            rx="4"
                          />
                        </g>
                      );
                    })()
                  )}

                  {/* Sightline Rays */}
                  {activeSightlines.map((sight, sIdx) => {
                    const fromX = barCenters[sight.fromIdx] ?? 0;
                    const toX = barCenters[sight.toIdx] ?? 0;

                    const fromVal = array[sight.fromIdx] ?? 0;
                    const toVal = array[sight.toIdx] ?? 0;

                    const fromHeightPct = maxVal > 0 ? (fromVal / maxVal) * 65 : 40;
                    const toHeightPct = maxVal > 0 ? (toVal / maxVal) * 65 : 40;

                    const y1 = `${Math.max(15, 88 - fromHeightPct)}%`;
                    const y2 = `${Math.max(15, 88 - toHeightPct)}%`;

                    const isHit = sight.resolved;
                    const strokeColor = isHit ? "#f59e0b" : "#10b981";
                    const dist = sight.distance ?? Math.abs(sight.toIdx - sight.fromIdx);

                    return (
                      <g key={sIdx}>
                        {/* Glow halo */}
                        <line
                          x1={fromX}
                          y1={y1}
                          x2={toX}
                          y2={y2}
                          stroke={strokeColor}
                          strokeWidth={6}
                          strokeOpacity={0.25}
                          strokeLinecap="round"
                        />
                        {/* Laser Ray Line */}
                        <line
                          x1={fromX}
                          y1={y1}
                          x2={toX}
                          y2={y2}
                          stroke={strokeColor}
                          strokeWidth={2.5}
                          strokeDasharray={isHit ? "4 3" : undefined}
                          markerEnd={isHit ? "url(#ray-head-resolved)" : "url(#ray-head-green)"}
                          filter="url(#ray-glow)"
                        />

                        {/* Midpoint Observation Label with Distance */}
                        <g transform={`translate(${(fromX + toX) / 2}, 22)`}>
                          <rect
                            x="-48"
                            y="-9"
                            width="96"
                            height="18"
                            rx="4"
                            className="fill-background/95 stroke-border"
                          />
                          <text
                            textAnchor="middle"
                            dy="0.32em"
                            className={`text-[9px] font-mono font-bold ${
                              isHit ? "fill-amber-400" : "fill-emerald-400"
                            }`}
                          >
                            {isHit ? `RAY HIT (dist: ${dist})` : `BOUNDED ≤ (dist: ${dist})`}
                          </text>
                        </g>
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}

            {/* Render Vertical Bars */}
            {array.map((val, idx) => {
              const numVal = Number(val);
              const heightPct =
                !isNaN(numVal) && maxVal > 0
                  ? Math.max(18, Math.min(100, (numVal / maxVal) * 100))
                  : 40;

              const isCurrent = idx === currentIdx;
              const inStack = stackItems.some((s) => s.isIndex && s.idx === idx);
              const isTop = stackItems.length > 0 && stackItems[stackItems.length - 1]?.idx === idx;
              const isPoppedTarget = activeHistogramSpan?.poppedIndex === idx || activeSightlines.some((s) => s.toIdx === idx && s.resolved);
              const isLeftBoundary = activeHistogramSpan?.left === idx || (activeWaterTrapped && activeSightlines.some((s) => s.toIdx === idx));
              const isRightBoundary = activeHistogramSpan?.right === idx || (activeWaterTrapped && currentIdx === idx);
              const isTroughBottom = activeWaterTrapped && activeHistogramSpan?.poppedIndex === idx;

              const waterLevel = activeWaterTrapped?.waterLevels?.[idx] ?? 0;
              const waterHeight = Math.max(0, waterLevel - numVal);
              const waterHeightPct = maxVal > 0 ? (waterHeight / maxVal) * 100 : 0;

              return (
                <div
                  key={idx}
                  ref={(el) => {
                    barRefs.current[idx] = el;
                  }}
                  onMouseEnter={() => setInteractiveHoverIdx(idx)}
                  onMouseLeave={() => setInteractiveHoverIdx(null)}
                  className="flex-1 flex flex-col items-center h-full justify-end min-w-[42px] max-w-[68px] cursor-pointer group select-none relative"
                >
                  {/* Traversal Pointer Beacon & Badges */}
                  <div className="h-7 flex items-center justify-center mb-1 text-[9px] font-mono font-bold">
                    {isCurrent ? (
                      <span className="text-primary animate-bounce flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary/20 border border-primary/40 shadow-xs">
                        <ArrowUp className="w-3 h-3 text-primary rotate-180 stroke-[2.5]" />
                        <span>i (Scan)</span>
                      </span>
                    ) : isPoppedTarget ? (
                      <span className="text-rose-400 font-extrabold px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 animate-pulse flex items-center gap-0.5">
                        <Zap className="w-2.5 h-2.5 text-rose-400" />
                        <span>POP</span>
                      </span>
                    ) : isTop ? (
                      <span className="text-amber-400 font-extrabold px-1.5 py-0.5 rounded bg-amber-400/20 border border-amber-400/40 shadow-xs flex items-center gap-0.5">
                        <ChevronUp className="w-2.5 h-2.5 text-amber-400" />
                        <span>TOS</span>
                      </span>
                    ) : isLeftBoundary ? (
                      <span className="text-purple-400 font-bold px-1 py-0.2 rounded bg-purple-500/15 border border-purple-500/30">
                        L-BND
                      </span>
                    ) : isRightBoundary ? (
                      <span className="text-amber-400 font-bold px-1 py-0.2 rounded bg-amber-500/15 border border-amber-500/30">
                        R-BND
                      </span>
                    ) : isTroughBottom ? (
                      <span className="text-sky-400 font-bold px-1 py-0.2 rounded bg-sky-500/15 border border-sky-500/30">
                        BOT
                      </span>
                    ) : inStack ? (
                      <span className="text-indigo-400 font-bold px-1 py-0.2 rounded bg-indigo-500/10 border border-indigo-500/20">
                        STACK
                      </span>
                    ) : (
                      <span className="text-transparent">.</span>
                    )}
                  </div>

                  {/* Water Reservoir Layer on Top of Bar */}
                  {waterHeight > 0 && (
                    <div
                      style={{ height: `${waterHeightPct}%` }}
                      className="w-full bg-sky-500/30 border-t-2 border-x border-sky-400/60 rounded-t-sm animate-pulse flex items-center justify-center text-[10px] text-sky-200 font-mono font-bold shadow-inner"
                      title={`Trapped Water: ${waterHeight} units`}
                    >
                      ~
                    </div>
                  )}

                  {/* Vertical Bar with Dynamic Height and Shading */}
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t-xl transition-all duration-300 flex flex-col items-center justify-start pt-2 border-t border-x relative group-hover:scale-102 ${
                      isCurrent
                        ? "bg-primary/25 border-primary ring-2 ring-primary/50 shadow-md"
                        : isPoppedTarget
                          ? "bg-rose-500/25 border-rose-400 ring-2 ring-rose-400/50 shadow-sm"
                          : isTop
                            ? "bg-amber-500/25 border-amber-400 ring-2 ring-amber-400/50 shadow-sm"
                            : isLeftBoundary
                              ? "bg-purple-500/25 border-purple-400 ring-1 ring-purple-400/40"
                              : inStack
                                ? "bg-indigo-500/20 border-indigo-400 ring-1 ring-indigo-400/30"
                                : "bg-muted/40 border-border/60 hover:bg-muted/60"
                    }`}
                  >
                    {/* Value label inside the bar top */}
                    <span
                      className={`text-[12px] font-mono font-bold ${
                        isCurrent
                          ? "text-primary"
                          : isPoppedTarget
                            ? "text-rose-300"
                            : isTop
                              ? "text-amber-300"
                              : isLeftBoundary
                                ? "text-purple-300"
                                : inStack
                                  ? "text-indigo-300"
                                  : "text-foreground"
                      }`}
                    >
                      {val}
                    </span>

                    {/* Laser Emitting Dot on current bar */}
                    {isCurrent && showRays && (
                      <div className="absolute -top-1.5 w-3 h-3 rounded-full bg-primary ring-4 ring-primary/30 animate-pulse shadow-md" />
                    )}
                  </div>

                  {/* Index Readout & Traversal State Marker */}
                  <div className="flex flex-col items-center gap-0.5 mt-1">
                    <span
                      className={`text-[10px] font-mono ${
                        isCurrent ? "text-primary font-bold" : "text-muted-foreground"
                      }`}
                    >
                      [{idx}]
                    </span>
                    <span
                      className={`text-[8px] font-mono uppercase px-1 rounded ${
                        isCurrent
                          ? "bg-primary/20 text-primary font-extrabold"
                          : idx < (currentIdx ?? 0)
                            ? "text-muted-foreground/60"
                            : "text-muted-foreground/40"
                      }`}
                    >
                      {isCurrent ? "ACTIVE" : idx < (currentIdx ?? 0) ? "VISITED" : "WAIT"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Target Tracking Table / Result Grid (Next Greater / Temperatures Table) */}
          {activeResultArray.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-border/60 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono font-bold text-muted-foreground">
                <span className="flex items-center gap-1.5 text-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  RESOLVED TARGET / NEXT GREATER VALUES
                </span>
                <span>
                  Resolved:{" "}
                  <strong className="text-emerald-400">
                    {activeResultArray.filter((x) => x !== null && x !== -1).length}
                  </strong>{" "}
                  / {activeResultArray.length}
                </span>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-thin">
                {activeResultArray.map((resVal, rIdx) => {
                  const isResolved = resVal !== null && resVal !== -1;
                  const isCurrent = rIdx === currentIdx;

                  return (
                    <div
                      key={`res-${rIdx}`}
                      className={`flex flex-col items-center justify-center min-w-[38px] px-1.5 py-1 rounded-md font-mono text-[11px] border transition-all ${
                        isCurrent
                          ? "ring-2 ring-primary border-primary bg-primary/20 text-primary font-bold"
                          : isResolved
                            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300 font-bold"
                            : "bg-muted/40 border-border/50 text-muted-foreground/60"
                      }`}
                    >
                      <span className="text-[8px] text-muted-foreground">[{rIdx}]</span>
                      <span>{isResolved ? String(resVal) : "-"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Pane: Monotonic Stack Container (Stack Cylinder) */}
        <div className="lg:col-span-4 flex flex-col rounded-xl bg-card/60 border border-border/70 overflow-hidden shadow-xs">
          <div className="px-3 py-2 bg-muted/40 border-b border-border/60 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold font-mono">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>STACK CYLINDER (MONOTONIC)</span>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">
              Top of Stack
            </span>
          </div>

          <div className="flex-1 p-3 flex flex-col-reverse justify-start gap-2 overflow-y-auto max-h-[380px] bg-dot-grid">
            {stackItems.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-xs font-mono text-muted-foreground/60 italic py-12">
                (Stack is currently empty)
              </div>
            ) : (
              stackItems.map((item, idx) => {
                const isTop = idx === stackItems.length - 1;

                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-mono transition-all ${
                      isTop
                        ? "bg-amber-500/15 border-amber-400 text-amber-300 ring-1 ring-amber-400/40 shadow-xs"
                        : "bg-background/80 border-border/70 text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground font-bold">
                        {idx}
                      </span>
                      {item.isIndex ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-foreground">
                            val: {item.val}
                          </span>
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            idx: {item.idx}
                          </span>
                        </div>
                      ) : (
                        <span className="font-bold">{item.val}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isTop && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 uppercase tracking-wider">
                          TOP
                        </span>
                      )}
                      <div
                        style={{
                          height: "14px",
                          width: `${Math.max(12, Math.min(48, (Number(item.val) / maxVal) * 48))}px`,
                        }}
                        className="rounded-xs bg-primary/40 border border-primary/50"
                        title={`Height proportion: ${item.val}`}
                      />
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
