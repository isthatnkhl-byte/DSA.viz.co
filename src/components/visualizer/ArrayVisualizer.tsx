import React, { useMemo, useRef, useEffect } from "react";
import type {
  Val,
  DnfPartition,
  BinarySearchPartition,
  SlidingWindowSpan,
  PrefixSumProjection,
  CyclicSortJump,
  ArraySwapFlight,
  KmpAlgorithmState,
  RabinKarpAlgorithmState,
  AhoCorasickState,
  StringPatternState,
} from "./VisualizerTypes";
import { StringPatternVisualizer } from "./StringPatternVisualizer";
import { safeArray } from "./VisualizerTypes";
import {
  Layers,
  ArrowRightLeft,
  Sparkles,
  Split,
  Binary,
  Compass,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Calculator,
  ChevronRight,
} from "lucide-react";

interface ArrayVisualizerProps {
  cells: Val[];
  left?: number | null | undefined;
  right?: number | null | undefined;
  current?: Val | null | undefined;
  visited?: Val[] | null | undefined;
  wSum?: number | null | undefined;
  mSum?: number | null | undefined;
  secondaryArray?: Val[] | null | undefined;
  left2?: number | null | undefined;
  right2?: number | null | undefined;
  label1?: string;
  label2?: string;
  activeDataset?: string | null;
  isMathMode?: boolean;
  hideBars?: boolean;
  pointer_labels?: Record<string, string> | null;
  lps?: number[] | null | undefined;
  patternStr?: string | null | undefined;
  textStr?: string | null | undefined;
  patternIndex?: number | null | undefined;
  textIndex?: number | null | undefined;
  kmpState?: KmpAlgorithmState | null | undefined;
  rabinKarpState?: RabinKarpAlgorithmState | null | undefined;
  ahoCorasickState?: AhoCorasickState | null | undefined;
  stringPatternState?: StringPatternState | null | undefined;
  dnfPartition?: DnfPartition | null | undefined;
  binarySearchPartition?: BinarySearchPartition | null | undefined;
  slidingWindowSpan?: SlidingWindowSpan | null | undefined;
  prefixSumProjection?: PrefixSumProjection | null | undefined;
  cyclicSortJump?: CyclicSortJump | null | undefined;
  swapFlight?: ArraySwapFlight | null | undefined;
  motionBlurEnabled?: boolean;
}

export function ArrayVisualizer({
  cells: rawCells,
  left,
  right,
  current,
  visited: rawVisited,
  wSum,
  mSum,
  secondaryArray: rawSecondary,
  left2,
  right2,
  label1 = "Input Array",
  label2 = "Secondary Array (nums2)",
  activeDataset,
  isMathMode,
  hideBars,
  pointer_labels,
  lps,
  patternStr,
  textStr,
  patternIndex,
  textIndex,
  kmpState,
  rabinKarpState,
  ahoCorasickState,
  stringPatternState,
  dnfPartition,
  binarySearchPartition,
  slidingWindowSpan,
  prefixSumProjection,
  cyclicSortJump,
  swapFlight,
  motionBlurEnabled = false,
}: ArrayVisualizerProps) {
  const cells = useMemo(() => safeArray(rawCells), [rawCells]);
  const secondaryCells = useMemo(
    () => (rawSecondary ? safeArray(rawSecondary) : null),
    [rawSecondary],
  );
  const visited = useMemo(() => safeArray(rawVisited ?? []), [rawVisited]);
  const visitedSet = useMemo(() => new Set(visited.map(String)), [visited]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeElementRef = useRef<HTMLDivElement>(null);

  const isNumericArray = useMemo(() => {
    const all = [...cells, ...(secondaryCells ?? [])];
    return all.some((v) => typeof v === "number" && !isNaN(v) && Math.abs(v) > 0);
  }, [cells, secondaryCells]);

  const maxVal = useMemo(() => {
    const all = [...cells, ...(secondaryCells ?? [])];
    if (all.length === 0) return 1;
    const finiteVals = all
      .map((v) => Math.abs(Number(v) || 0))
      .filter((n) => Number.isFinite(n) && n < 1e8);
    return finiteVals.length > 0 ? Math.max(1, ...finiteVals) : 1;
  }, [cells, secondaryCells]);

  // Dynamic pointer labels
  const labelL = pointer_labels?.left ? pointer_labels.left.slice(0, 10) : "left";
  const labelR = pointer_labels?.right ? pointer_labels.right.slice(0, 10) : "right";
  const labelMid = pointer_labels?.mid ?? pointer_labels?.current ?? "mid";
  const labelCurr = pointer_labels?.current ? pointer_labels.current.slice(0, 10) : "curr";
  const labelL2 = pointer_labels?.left2 ? pointer_labels.left2.slice(0, 10) : "L2";
  const labelR2 = pointer_labels?.right2 ? pointer_labels.right2.slice(0, 10) : "R2";

  const isDualSequence = !!(secondaryCells && secondaryCells.length > 0);

  const numLeftProp =
    typeof left === "number"
      ? left
      : typeof left === "string" && !isNaN(Number(left))
        ? Number(left)
        : null;
  const numRightProp =
    typeof right === "number"
      ? right
      : typeof right === "string" && !isNaN(Number(right))
        ? Number(right)
        : null;
  const numLeft2Prop =
    typeof left2 === "number"
      ? left2
      : typeof left2 === "string" && !isNaN(Number(left2))
        ? Number(left2)
        : null;
  const numRight2Prop =
    typeof right2 === "number"
      ? right2
      : typeof right2 === "string" && !isNaN(Number(right2))
        ? Number(right2)
        : null;

  let parsedPair: [number, number] | null = null;
  if (numLeftProp === null && numRightProp === null && !isDualSequence) {
    if (
      Array.isArray(current) &&
      current.length >= 2 &&
      !isNaN(Number(current[0])) &&
      !isNaN(Number(current[1]))
    ) {
      parsedPair = [Number(current[0]), Number(current[1])];
    } else if (typeof current === "string" && /^\s*\d+\s*,\s*\d+\s*$/.test(current)) {
      const parts = current.split(",").map((s) => Number(s.trim()));
      parsedPair = [parts[0]!, parts[1]!];
    }
  }

  const row1Left = numLeftProp !== null ? numLeftProp : parsedPair ? parsedPair[0] : null;
  const row1Right = isDualSequence
    ? numLeft2Prop !== null
      ? numRightProp !== null
        ? numRightProp
        : null
      : null
    : numRightProp !== null
      ? numRightProp
      : parsedPair
        ? parsedPair[1]
        : null;

  const row2Left =
    typeof left2 === "number"
      ? left2
      : isDualSequence && typeof right === "number" && typeof left === "number"
        ? right
        : null;
  const row2Right = typeof right2 === "number" ? right2 : numRight2Prop;

  const effectiveWindowL = slidingWindowSpan ? slidingWindowSpan.left : row1Left;
  const effectiveWindowR = slidingWindowSpan ? slidingWindowSpan.right : row1Right;

  const isSlidingWindow =
    (slidingWindowSpan !== undefined && slidingWindowSpan !== null) ||
    (typeof effectiveWindowL === "number" &&
      typeof effectiveWindowR === "number" &&
      effectiveWindowL <= effectiveWindowR &&
      effectiveWindowR >= 0 &&
      !isDualSequence);

  // Auto-scroll active element into view
  useEffect(() => {
    if (activeElementRef.current && scrollContainerRef.current) {
      activeElementRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [current, left, right, left2, right2, dnfPartition, cyclicSortJump]);

  const isMatchingPair =
    isDualSequence &&
    row1Left !== null &&
    row2Left !== null &&
    cells[row1Left] !== undefined &&
    secondaryCells?.[row2Left] !== undefined &&
    String(cells[row1Left]) === String(secondaryCells[row2Left]);

  // Derive DNF markers if present
  const isDnf = !!(
    dnfPartition ||
    (pointer_labels?.low !== undefined && pointer_labels?.high !== undefined)
  );
  const dnfLow = dnfPartition?.low ?? (typeof left === "number" ? left : 0);
  const dnfMid = dnfPartition?.mid ?? (typeof current === "number" ? current : 0);
  const dnfHigh = dnfPartition?.high ?? (typeof right === "number" ? right : cells.length - 1);

  // Detect Binary Search mode (low <= mid <= high)
  const isBinarySearchRange =
    (binarySearchPartition !== undefined && binarySearchPartition !== null) ||
    (typeof row1Left === "number" &&
      typeof row1Right === "number" &&
      row1Left <= row1Right &&
      !isSlidingWindow &&
      !isDualSequence &&
      !isDnf);

  const bsLow = binarySearchPartition?.low ?? row1Left;
  const bsHigh = binarySearchPartition?.high ?? row1Right;
  const bsMid =
    binarySearchPartition?.mid ??
    (typeof bsLow === "number" && typeof bsHigh === "number"
      ? Math.floor((bsLow + bsHigh) / 2)
      : null);

  const renderArrayRow = (
    items: Val[],
    pLeft?: number | null,
    pRight?: number | null,
    rowLabel?: string,
    isSecondary = false,
  ) => {
    const isThisActive = isDualSequence
      ? true
      : isSecondary
        ? activeDataset === "secondaryArray" ||
          activeDataset === "nums2" ||
          activeDataset === "array2"
        : activeDataset === "array" ||
          activeDataset === "nums1" ||
          activeDataset === "primary" ||
          !activeDataset;

    // Check for out-of-bounds pointers
    const leftOobLeft = typeof pLeft === "number" && pLeft < 0;
    const leftOobRight = typeof pLeft === "number" && pLeft >= items.length;
    const rightOobLeft = typeof pRight === "number" && pRight < 0;
    const rightOobRight = typeof pRight === "number" && pRight >= items.length;
    const isRowNumeric = items.some((v) => typeof v === "number" && !isNaN(v) && Math.abs(v) > 0);

    return (
      <div
        className={`flex flex-col gap-2.5 rounded-2xl p-4 transition-all duration-300 ${
          isThisActive
            ? "border border-primary/40 bg-card/75 shadow-sm"
            : "border border-border/50 bg-background/40 opacity-85"
        }`}
      >
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 font-mono text-xs font-bold text-muted-foreground">
            <Layers className="size-4 text-primary" />
            <span className="text-foreground tracking-wide font-semibold">{rowLabel}</span>
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground font-medium">
              len={items.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isDnf && !isSecondary && (
              <span className="rounded-md bg-purple-500/15 border border-purple-500/40 px-2 py-0.5 font-mono text-[9px] font-bold text-purple-400">
                DNF 3-WAY PARTITION
              </span>
            )}
            {isBinarySearchRange && !isSecondary && (
              <span className="rounded-md bg-cyan-500/15 border border-cyan-500/40 px-2 py-0.5 font-mono text-[9px] font-bold text-cyan-400">
                BINARY SEARCH RANGE
              </span>
            )}
            {(leftOobLeft || leftOobRight || rightOobLeft || rightOobRight) && (
              <span className="rounded-md bg-amber-500/15 border border-amber-500/40 px-2 py-0.5 font-mono text-[9px] font-bold text-amber-400">
                BOUNDARY: {leftOobLeft ? `${labelL}=${pLeft} (< 0)` : ""}{" "}
                {rightOobRight ? `${labelR}=${pRight} (≥ ${items.length})` : ""}{" "}
                {leftOobRight ? `${labelL}=${pLeft} (≥ ${items.length})` : ""}
              </span>
            )}
            {isThisActive && (
              <span className="rounded-md bg-primary/15 border border-primary/30 px-2 py-0.5 font-mono text-[9px] font-bold text-primary shadow-xs">
                {isDualSequence ? (isSecondary ? "SEQUENCE 2" : "SEQUENCE 1") : "ACTIVE FOCUS"}
              </span>
            )}
          </div>
        </div>

        {/* DNF Region Visual Indicator Banner */}
        {isDnf && !isSecondary && (
          <div className="grid grid-cols-4 gap-1.5 rounded-xl border border-border/60 bg-background/50 p-1.5 text-center font-mono text-[10px]">
            <div className="rounded-lg bg-rose-500/15 border border-rose-500/30 px-1 py-0.5 text-rose-300 font-bold">
              [0 .. low-1] : 0s
            </div>
            <div className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-1 py-0.5 text-emerald-300 font-bold">
              [low .. mid-1] : 1s
            </div>
            <div className="rounded-lg bg-amber-500/15 border border-amber-500/30 px-1 py-0.5 text-amber-300 font-bold">
              [mid .. high] : ?
            </div>
            <div className="rounded-lg bg-indigo-500/15 border border-indigo-500/30 px-1 py-0.5 text-indigo-300 font-bold">
              [high+1 .. n-1] : 2s
            </div>
          </div>
        )}

        {/* Array Elements Canvas */}
        <div className="flex w-max min-w-full items-end justify-start sm:justify-center gap-3 sm:gap-4 pt-11 pb-3 px-3 m-auto">
          {/* Left Out-of-Bounds Indicator */}
          {(leftOobLeft || rightOobLeft) && (
            <div className="relative flex flex-col items-center gap-2 opacity-80">
              <div className="absolute -top-9 flex flex-col items-center z-10 select-none">
                <span className="rounded-lg bg-amber-500/30 border border-amber-500/60 px-2.5 py-0.5 font-mono text-[10px] font-black text-amber-300 shadow-xs">
                  {leftOobLeft ? `${labelL} (${pLeft})` : `${labelR} (${pRight})`}
                </span>
              </div>
              <div className="flex size-12 sm:size-14 items-center justify-center rounded-2xl border border-dashed border-amber-500/50 bg-amber-500/10 font-mono text-xs text-amber-300 font-bold">
                OOB
              </div>
              <span className="font-mono text-[10px] text-amber-400/80 font-semibold">[&lt;0]</span>
            </div>
          )}

          {items.map((val, i) => {
            const isLeftPtr = pLeft === i;
            const isRightPtr = pRight === i;
            const isSingleLeftActive =
              typeof pLeft === "number" &&
              pLeft === i &&
              (pRight === null || pRight === undefined);

            const inWindow =
              typeof effectiveWindowL === "number" &&
              typeof effectiveWindowR === "number" &&
              i >= effectiveWindowL &&
              i <= effectiveWindowR &&
              effectiveWindowL <= effectiveWindowR &&
              isSlidingWindow &&
              !isSecondary;

            const isMidPtr = isBinarySearchRange && bsMid === i && !isSecondary;

            // DNF Pointers
            const isDnfLow = isDnf && !isSecondary && dnfLow === i;
            const isDnfMid = isDnf && !isSecondary && dnfMid === i;
            const isDnfHigh = isDnf && !isSecondary && dnfHigh === i;

            // Cyclic sort pointer & jump target
            const isCyclicFrom =
              cyclicSortJump && !isSecondary && cyclicSortJump.fromIdx === i;
            const isCyclicTarget =
              cyclicSortJump && !isSecondary && cyclicSortJump.targetIdx === i;

            // Swap Flight markers
            const isSwap1 = swapFlight && !isSecondary && swapFlight.idx1 === i;
            const isSwap2 = swapFlight && !isSecondary && swapFlight.idx2 === i;

            // Robust index matching for current pointer
            const numCurrent =
              typeof current === "number" && !isNaN(current)
                ? current
                : typeof current === "string" && /^-?\d+$/.test(current.trim())
                  ? parseInt(current.trim(), 10)
                  : null;

            const isCurrentIndex =
              numCurrent !== null &&
              numCurrent >= 0 &&
              numCurrent < items.length &&
              numCurrent === i;
            const isCurrentValue =
              !isCurrentIndex &&
              current !== null &&
              current !== undefined &&
              String(val) === String(current);
            const isCurrent =
              isThisActive &&
              !parsedPair &&
              current !== null &&
              current !== undefined &&
              (isCurrentIndex || isCurrentValue);

            const isVisited =
              (typeof pLeft === "number" &&
                (pRight === null || pRight === undefined) &&
                i < pLeft) ||
              (visitedSet.has(String(val)) && !isCurrent) ||
              (visitedSet.has(String(i)) && !isCurrent);

            // In Binary search, elements outside [bsLow, bsHigh] are ruled out / discarded
            const isBinarySearchDiscarded =
              isBinarySearchRange &&
              typeof bsLow === "number" &&
              typeof bsHigh === "number" &&
              (i < bsLow || i > bsHigh) &&
              !isSecondary;

            const numericVal = Math.abs(Number(val) || 0);
            const effectiveNum = numericVal >= 1e8 ? maxVal : numericVal;
            const barHeight = Math.max(12, Math.min(68, Math.round((effectiveNum / maxVal) * 68)));
            const strVal = String(val);
            const displayVal =
              strVal === "2147483647" || strVal === "999999999" || strVal === "Infinity"
                ? "∞"
                : strVal.length > 8
                  ? `${strVal.slice(0, 7)}…`
                  : strVal;

            // Compute consolidated pointer tag list with vivid background badges and distinct colors
            const tags: {
              text: string;
              bg: string;
              textCol: string;
              border: string;
              glow?: boolean;
            }[] = [];

            if (isDnf && !isSecondary) {
              if (isDnfLow && isDnfMid && isDnfHigh) {
                tags.push({
                  text: "low, mid, high",
                  bg: "bg-purple-500",
                  textCol: "text-slate-950 font-black",
                  border: "border-purple-300",
                  glow: true,
                });
              } else if (isDnfLow && isDnfMid) {
                tags.push({
                  text: "low, mid",
                  bg: "bg-emerald-500",
                  textCol: "text-slate-950 font-black",
                  border: "border-emerald-300",
                  glow: true,
                });
              } else if (isDnfMid && isDnfHigh) {
                tags.push({
                  text: "mid, high",
                  bg: "bg-amber-500",
                  textCol: "text-slate-950 font-black",
                  border: "border-amber-300",
                  glow: true,
                });
              } else {
                if (isDnfLow)
                  tags.push({
                    text: "low",
                    bg: "bg-emerald-600",
                    textCol: "text-white font-black",
                    border: "border-emerald-400",
                    glow: true,
                  });
                if (isDnfMid)
                  tags.push({
                    text: "mid (i)",
                    bg: "bg-cyan-500",
                    textCol: "text-slate-950 font-black",
                    border: "border-cyan-300",
                    glow: true,
                  });
                if (isDnfHigh)
                  tags.push({
                    text: "high",
                    bg: "bg-amber-600",
                    textCol: "text-white font-black",
                    border: "border-amber-400",
                    glow: true,
                  });
              }
            } else if (isLeftPtr && isMatchingPair) {
              tags.push({
                text: "MATCH",
                bg: "bg-emerald-500",
                textCol: "text-white font-black",
                border: "border-emerald-400",
                glow: true,
              });
            } else {
              if (isLeftPtr && isRightPtr) {
                tags.push({
                  text: `${isSecondary ? labelR2 : labelL}, ${isSecondary ? labelR2 : labelR}`,
                  bg: "bg-cyan-500",
                  textCol: "text-slate-950 font-black",
                  border: "border-cyan-300",
                  glow: true,
                });
              } else {
                if (isLeftPtr) {
                  tags.push({
                    text: isSecondary ? labelL2 : labelL,
                    bg: isSecondary ? "bg-indigo-600" : "bg-emerald-600",
                    textCol: "text-white font-black",
                    border: isSecondary ? "border-indigo-400" : "border-emerald-400",
                    glow: true,
                  });
                }
                if (isRightPtr) {
                  tags.push({
                    text: isSecondary ? labelR2 : labelR,
                    bg: "bg-amber-600",
                    textCol: "text-white font-black",
                    border: "border-amber-400",
                    glow: true,
                  });
                }
              }
              if (isMidPtr && !isLeftPtr && !isRightPtr) {
                tags.push({
                  text: labelMid,
                  bg: "bg-purple-600",
                  textCol: "text-white font-black",
                  border: "border-purple-400",
                  glow: true,
                });
              }
              if (isCurrent && !isLeftPtr && !isRightPtr && !isMidPtr) {
                const currentTagText =
                  pointer_labels?.current || (numCurrent !== null ? `idx=${i}` : labelCurr);
                tags.push({
                  text: currentTagText,
                  bg: "bg-sky-500",
                  textCol: "text-slate-950 font-black",
                  border: "border-sky-300",
                  glow: true,
                });
              }
            }

            if (isCyclicFrom) {
              tags.push({
                text: "SRC [i]",
                bg: "bg-indigo-600",
                textCol: "text-white font-bold",
                border: "border-indigo-400",
              });
            }
            if (isCyclicTarget && !isCyclicFrom) {
              tags.push({
                text: "DEST",
                bg: "bg-rose-600",
                textCol: "text-white font-bold",
                border: "border-rose-400",
              });
            }
            if ((isSwap1 || isSwap2) && !isLeftPtr && !isRightPtr) {
              tags.push({
                text: "SWAP",
                bg: "bg-amber-500",
                textCol: "text-slate-950 font-black",
                border: "border-amber-300",
                glow: true,
              });
            }

            // High-contrast cell background and foreground calculation
            let cellStyle = "border-border/80 bg-card/90 text-foreground";
            if (isDnf && !isSecondary) {
              if (isDnfMid) {
                cellStyle =
                  "scale-105 border-cyan-400 bg-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/50 ring-2 ring-cyan-300";
              } else if (isDnfLow) {
                cellStyle =
                  "scale-105 border-emerald-400 bg-emerald-600 text-white font-black shadow-lg shadow-emerald-500/50 ring-2 ring-emerald-300";
              } else if (isDnfHigh) {
                cellStyle =
                  "scale-105 border-amber-400 bg-amber-600 text-white font-black shadow-lg shadow-amber-500/50 ring-2 ring-amber-300";
              } else if (i < dnfLow) {
                cellStyle =
                  "border-rose-500/60 bg-rose-500/15 text-rose-300 font-bold ring-1 ring-rose-500/30";
              } else if (i > dnfHigh) {
                cellStyle =
                  "border-indigo-500/60 bg-indigo-500/15 text-indigo-300 font-bold ring-1 ring-indigo-500/30";
              }
            } else if (isLeftPtr && isMatchingPair) {
              cellStyle =
                "scale-105 border-emerald-400 bg-emerald-500 text-white font-black shadow-lg shadow-emerald-500/50 ring-2 ring-emerald-400 animate-pulse";
            } else if (isSwap1 || isSwap2) {
              cellStyle =
                "scale-105 border-amber-400 bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/50 ring-2 ring-amber-300 animate-pulse";
            } else if (isLeftPtr && isRightPtr) {
              cellStyle =
                "scale-105 border-cyan-400 bg-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/50 ring-2 ring-cyan-300";
            } else if (isMidPtr) {
              cellStyle =
                "scale-105 border-purple-400 bg-purple-600 text-white font-black shadow-lg shadow-purple-500/50 ring-2 ring-purple-300";
            } else if (isLeftPtr) {
              cellStyle = isSecondary
                ? "scale-105 border-indigo-400 bg-indigo-600 text-white font-black shadow-lg shadow-indigo-500/50 ring-2 ring-indigo-300"
                : "scale-105 border-emerald-400 bg-emerald-600 text-white font-black shadow-lg shadow-emerald-500/50 ring-2 ring-emerald-300";
            } else if (isRightPtr) {
              cellStyle =
                "scale-105 border-amber-400 bg-amber-600 text-white font-black shadow-lg shadow-amber-500/50 ring-2 ring-amber-300";
            } else if (isCurrent || isSingleLeftActive) {
              cellStyle =
                "scale-105 border-sky-400 bg-sky-500 text-slate-950 font-black shadow-lg shadow-sky-500/50 ring-2 ring-sky-300";
            } else if (inWindow) {
              cellStyle =
                "border-primary/90 bg-primary/25 text-primary font-black shadow-sm ring-1 ring-primary/60";
            } else if (isVisited) {
              cellStyle = "border-emerald-500/50 bg-emerald-500/15 text-emerald-300 font-bold";
            } else if (isBinarySearchDiscarded) {
              cellStyle =
                "border-border/40 bg-muted/20 text-muted-foreground/50 opacity-40 line-through";
            }

            const isHasPointers = tags.length > 0;
            const cellSizeClass =
              items.length > 18
                ? "size-10 sm:size-11 text-xs"
                : items.length > 10
                  ? "size-11 sm:size-12 text-sm"
                  : "size-12 sm:size-14 text-base";
            const barWidthClass = items.length > 18 ? "w-8" : items.length > 10 ? "w-9" : "w-10";

            return (
              <div
                key={`row-${rowLabel}-${i}`}
                ref={
                  isCurrent ||
                  isLeftPtr ||
                  isRightPtr ||
                  isSingleLeftActive ||
                  isMidPtr ||
                  isDnfMid ||
                  isCyclicFrom
                    ? activeElementRef
                    : undefined
                }
                className={`relative flex flex-col items-center gap-2 ${
                  motionBlurEnabled ? "viz-cell-glide" : ""
                }`}
              >
                {/* Floating Pointer Badges with Distinct Consolidated Tags */}
                <div className="absolute -top-9 flex items-center justify-center gap-1 z-10 select-none pointer-events-none whitespace-nowrap">
                  {tags.map((t, tagIdx) => (
                    <span
                      key={`tag-${tagIdx}`}
                      className={`rounded-lg px-2.5 py-0.5 font-mono text-[10px] font-black border shadow-xs ${t.bg} ${t.textCol} ${t.border} ${
                        t.glow ? "shadow-md shadow-primary/40" : ""
                      } ${motionBlurEnabled ? "viz-pointer-pill" : ""}`}
                    >
                      {t.text}
                    </span>
                  ))}
                </div>

                {/* Magnitude Bar (only rendered for numeric arrays with magnitude values) */}
                {isRowNumeric && !hideBars && (
                  <div
                    className={`${barWidthClass} rounded-t-lg transition-all duration-300 shadow-sm ${
                      isLeftPtr ||
                      isRightPtr ||
                      isCurrent ||
                      inWindow ||
                      isSingleLeftActive ||
                      isMidPtr ||
                      isDnfMid
                        ? "ring-2 ring-primary/70 shadow-lg shadow-primary/40"
                        : ""
                    } ${motionBlurEnabled ? "viz-glide-target" : ""}`}
                    style={{
                      height: `${barHeight}px`,
                      background:
                        inWindow ||
                        isCurrent ||
                        isSingleLeftActive ||
                        (isLeftPtr && isRightPtr) ||
                        isLeftPtr ||
                        isDnfMid
                          ? "linear-gradient(180deg, oklch(0.85 0.18 195) 0%, oklch(0.68 0.22 220) 100%)"
                          : isMidPtr
                            ? "linear-gradient(180deg, oklch(0.75 0.20 300) 0%, oklch(0.60 0.22 300) 100%)"
                            : isVisited || isRightPtr || isDnfHigh
                              ? "linear-gradient(180deg, oklch(0.70 0.17 275) 0%, oklch(0.56 0.16 275) 100%)"
                              : "linear-gradient(180deg, oklch(0.38 0.02 260) 0%, oklch(0.25 0.015 260) 100%)",
                    }}
                  />
                )}

                {/* Element Value Box */}
                <div
                  title={strVal}
                  className={`flex ${cellSizeClass} items-center justify-center rounded-2xl border font-mono transition-all duration-300 shadow-sm ${cellStyle} ${
                    motionBlurEnabled ? "viz-cell-glide" : ""
                  }`}
                >
                  {displayVal}
                </div>

                {/* Index subscript */}
                <span className="font-mono text-[10px] text-muted-foreground font-semibold">
                  [{i}]
                </span>
              </div>
            );
          })}

          {/* Right Out-of-Bounds Indicator */}
          {(leftOobRight || rightOobRight) && (
            <div className="relative flex flex-col items-center gap-2 opacity-80">
              <div className="absolute -top-9 flex flex-col items-center z-10 select-none">
                <span className="rounded-lg bg-amber-500/30 border border-amber-500/60 px-2.5 py-0.5 font-mono text-[10px] font-black text-amber-300 shadow-xs">
                  {rightOobRight ? `${labelR} (${pRight})` : `${labelL} (${pLeft})`}
                </span>
              </div>
              <div className="flex size-12 sm:size-14 items-center justify-center rounded-2xl border border-dashed border-amber-500/50 bg-amber-500/10 font-mono text-xs text-amber-300 font-bold">
                OOB
              </div>
              <span className="font-mono text-[10px] text-amber-400/80 font-semibold">
                [≥{items.length}]
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const isMathSimulation = isMathMode;

  return (
    <div className="flex flex-col gap-4">
      {/* Visualizer Canvas */}
      <div
        ref={scrollContainerRef}
        className={`flex min-h-[220px] w-full flex-col justify-center gap-4 overflow-x-auto rounded-3xl border border-border/80 bg-gradient-to-b from-card/90 via-card/50 to-background/90 p-5 sm:p-6 shadow-inner transition-all duration-300 ${
          cells.length > 8 ? "mask-edge-fade" : ""
        }`}
      >
        {isMathSimulation ? (
          <div className="flex flex-col items-center justify-center gap-3 opacity-80 animate-fade">
            <Sparkles className="size-8 text-primary/60" />
            <span className="font-mono text-sm font-bold text-muted-foreground uppercase tracking-widest">
              Variables Trace
            </span>
            <span className="text-xs text-muted-foreground max-w-[250px] text-center">
              This simulation operates on local math variables rather than structural arrays. Follow
              the values in the descriptive steps below.
            </span>
          </div>
        ) : cells.length === 0 ? (
          <span className="mx-auto font-mono text-sm text-muted-foreground">Empty array</span>
        ) : (
          <div className="flex flex-col gap-4 w-full">
            {renderArrayRow(cells, row1Left, row1Right, label1, false)}
            {secondaryCells && secondaryCells.length > 0 && (
              <>
                <div className="flex items-center justify-center gap-2 font-mono text-[11px] text-muted-foreground">
                  <ArrowRightLeft className="size-3.5 text-primary" />
                  <span>Cross-Dataset Comparison Stream</span>
                </div>
                {renderArrayRow(secondaryCells, row2Left, row2Right, label2, true)}
              </>
            )}
          </div>
        )}
      </div>

      {/* Cyclic Sort Jump Curved Inspection Card */}
      {cyclicSortJump && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-3 text-xs font-mono backdrop-blur-sm shadow-xs animate-fade">
          <div className="flex items-center gap-2">
            <RefreshCw className="size-4 text-indigo-400 animate-spin" style={{ animationDuration: "6s" }} />
            <span className="text-muted-foreground uppercase text-[11px] font-bold">
              Cyclic Position Check:
            </span>
            <span className="rounded-lg bg-indigo-600/30 border border-indigo-500/50 px-2.5 py-0.5 font-bold text-indigo-200">
              val = <strong>{cyclicSortJump.val}</strong> at index [{cyclicSortJump.fromIdx}] ➔ Target Index [{cyclicSortJump.targetIdx}]
            </span>
          </div>

          <div className="flex items-center gap-2">
            {cyclicSortJump.fromIdx === cyclicSortJump.targetIdx ? (
              <span className="flex items-center gap-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-1 text-emerald-300 font-bold">
                <CheckCircle2 className="size-3.5" />
                CORRECT INDEX
              </span>
            ) : cyclicSortJump.isDuplicate ? (
              <span className="flex items-center gap-1 rounded-lg bg-rose-500/20 border border-rose-500/40 px-2.5 py-1 text-rose-300 font-bold">
                <AlertTriangle className="size-3.5" />
                DUPLICATE FOUND
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-lg bg-amber-500/20 border border-amber-500/40 px-2.5 py-1 text-amber-300 font-bold">
                <ArrowRight className="size-3.5" />
                SWAP A[{cyclicSortJump.fromIdx}] ↔ A[{cyclicSortJump.targetIdx}]
              </span>
            )}
          </div>
        </div>
      )}

      {/* Binary Search Range Formula Card */}
      {isBinarySearchRange && typeof bsLow === "number" && typeof bsHigh === "number" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-3 text-xs font-mono backdrop-blur-sm shadow-xs animate-fade">
          <div className="flex items-center gap-2">
            <Binary className="size-4 text-cyan-400" />
            <span className="text-muted-foreground uppercase text-[11px] font-bold">
              Search Interval:
            </span>
            <span className="rounded-lg bg-cyan-500/20 border border-cyan-400/40 px-2.5 py-0.5 font-bold text-cyan-200">
              [{bsLow} ... {bsHigh}] (Search Space: {Math.max(0, bsHigh - bsLow + 1)})
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-purple-500/20 border border-purple-400/40 px-2.5 py-0.5 font-bold text-purple-200">
              mid = ⌊({bsLow} + {bsHigh}) / 2⌋ = <strong>{bsMid}</strong> (val = {cells[bsMid ?? 0] ?? "-"})
            </span>
            {binarySearchPartition?.target !== undefined && (
              <span className="text-muted-foreground">
                Target: <strong className="text-accent font-bold">{binarySearchPartition.target}</strong>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Sliding Window / Subarray Accumulation Sub-bar */}
      {isSlidingWindow && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3 text-xs font-mono backdrop-blur-sm animate-fade">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground uppercase text-[11px] font-semibold">
              Active Window Span:
            </span>
            <span className="rounded-lg bg-primary/20 px-2.5 py-0.5 font-bold text-primary border border-primary/40 shadow-xs">
              [{effectiveWindowL} ... {effectiveWindowR}] (Length:{" "}
              {(effectiveWindowR ?? 0) - (effectiveWindowL ?? 0) + 1})
            </span>
            {slidingWindowSpan?.status && (
              <span
                className={`rounded-lg px-2 py-0.5 font-bold uppercase text-[10px] ${
                  slidingWindowSpan.status === "valid" || slidingWindowSpan.status === "optimal"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                }`}
              >
                {slidingWindowSpan.status}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            {wSum !== null && wSum !== undefined && (
              <span>
                Window Sum: <strong className="text-primary font-bold text-sm ml-1">{wSum}</strong>
              </span>
            )}
            {mSum !== null && mSum !== undefined && (
              <span>
                Best / Target: <strong className="text-accent font-bold text-sm ml-1">{mSum}</strong>
              </span>
            )}
            {slidingWindowSpan?.conditionLabel && (
              <span className="text-muted-foreground italic">
                {slidingWindowSpan.conditionLabel}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Prefix Sum Projection & Math Formula Banner */}
      {prefixSumProjection && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card/50 p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Calculator className="size-3.5 text-primary" />
              Prefix Sum Accumulation & Range Query Projection
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              Range Query: <strong className="text-primary font-bold">[{prefixSumProjection.queryRange[0]}..{prefixSumProjection.queryRange[1]}]</strong>
            </span>
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-background/50 p-3 overflow-x-auto font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="w-24 text-muted-foreground font-semibold shrink-0">Prefix Array:</span>
              <div className="flex gap-1.5">
                {prefixSumProjection.prefixArray.map((val, idx) => {
                  const isPref1 = prefixSumProjection.prefixIndices[0] === idx;
                  const isPref2 = prefixSumProjection.prefixIndices[1] === idx;
                  return (
                    <div
                      key={`prefix-val-${idx}`}
                      className={`flex flex-col items-center rounded-lg border px-2 py-1 transition-all ${
                        isPref2
                          ? "border-emerald-400 bg-emerald-500 text-white font-black ring-2 ring-emerald-300 scale-105"
                          : isPref1
                            ? "border-amber-400 bg-amber-500 text-slate-950 font-black ring-2 ring-amber-300 scale-105"
                            : "border-border/60 bg-card text-foreground"
                      }`}
                    >
                      <span className="text-[8px] text-muted-foreground font-medium">[{idx}]</span>
                      <span className="text-sm font-bold">{val}</span>
                      {isPref2 && <span className="text-[8px] font-black uppercase text-emerald-100">prefix[R+1]</span>}
                      {isPref1 && <span className="text-[8px] font-black uppercase text-slate-950">prefix[L]</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {prefixSumProjection.formula && (
              <div className="mt-1 rounded-lg bg-card border border-border/70 p-2 text-center text-primary font-bold">
                {prefixSumProjection.formula}
              </div>
            )}
          </div>
        </div>
      )}

      {/* In-Place Swap Flight Banner */}
      {swapFlight && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 font-mono text-xs shadow-xs animate-fade">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="size-4 text-amber-400 animate-pulse" />
            <span className="text-muted-foreground font-bold uppercase text-[11px]">
              In-Place Swap Flight:
            </span>
            <span className="text-foreground font-black">
              A[{swapFlight.idx1}] ({swapFlight.val1}) ↔ A[{swapFlight.idx2}] ({swapFlight.val2})
            </span>
          </div>
          {swapFlight.reason && (
            <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[11px] text-amber-300 font-semibold">
              {swapFlight.reason}
            </span>
          )}
        </div>
      )}

      {/* String Pattern Matching / KMP / Rabin-Karp / Aho-Corasick Suite */}
      {(patternStr || lps || kmpState || rabinKarpState || ahoCorasickState || stringPatternState) && (
        <StringPatternVisualizer
          kmpState={kmpState}
          rabinKarpState={rabinKarpState}
          ahoCorasickState={ahoCorasickState}
          stringPatternState={stringPatternState}
          lps={lps}
          patternStr={patternStr}
          textStr={textStr}
          patternIndex={patternIndex}
          textIndex={textIndex}
        />
      )}
    </div>
  );
}
